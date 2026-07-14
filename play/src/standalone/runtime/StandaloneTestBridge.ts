import * as Phaser from "phaser";
import type { CharacterSayType, Direction } from "@workadventure/game-model";
import type { WorldCommand, WorldCommandResult, WorldEvent } from "@workadventure/world-command";
import type { Game } from "../../front/Phaser/Game/Game";
import type { DefaultStandaloneSceneController } from "../StandaloneSceneController";
import type { FurnitureEntitySnapshot, FurniturePrefabSnapshot } from "../commands/types";
import type { StandaloneSceneId } from "../StandaloneSceneDefinition";
import type { StandaloneGameScene } from "./StandaloneGameScene";

type NetworkAuditEntry = {
    transport: "fetch" | "xhr" | "websocket";
    url: string;
};

type TestBridgeApi = {
    getSceneState(): Promise<{
        sceneId: StandaloneSceneId;
        activeSceneId: string | null;
        editor: ReturnType<StandaloneGameScene["getStandaloneEntityEditorSnapshot"]>;
        network: NetworkAuditEntry[];
        world: unknown;
    }>;
    getPlayerState(): {
        x: number;
        y: number;
        direction: string;
        moving: boolean;
    };
    getEntities(): Promise<
        Array<{
            id: string;
            x: number;
            y: number;
            width: number;
            height: number;
            prefabId: string;
            collectionName: string;
            name: string;
            color: string;
            direction: string;
        }>
    >;
    listFurniturePrefabs(): Promise<FurniturePrefabSnapshot[]>;
    movePlayer(target: { x: number; y: number }): Promise<{ x: number; y: number; cancelled: boolean }>;
    executeWorldCommand(command: unknown, options?: { timeoutMs?: number }): Promise<WorldCommandResult>;
    cancelWorldCommand(commandId: string): boolean;
    getWorldEvents(): WorldEvent[];
    listActiveCommands(): unknown[];
    spawnAgent(input: {
        characterId: string;
        name: string;
        sceneId: StandaloneSceneId;
        appearance: unknown;
        spawnPosition: { x: number; y: number; direction: Direction; moving: boolean };
    }): Promise<WorldCommandResult>;
    listAgents(): Promise<WorldCommandResult>;
    getAgentState(input: { characterId: string }): Promise<WorldCommandResult>;
    moveAgent(input: {
        characterId: string;
        target: { x: number; y: number };
        options?: { tryFindingNearestAvailable?: boolean; timeoutMs?: number; maxCalculations?: number; speed?: number };
    }): Promise<WorldCommandResult>;
    stopAgent(input: { characterId: string }): Promise<WorldCommandResult>;
    faceAgent(input: { characterId: string; direction: Direction }): Promise<WorldCommandResult>;
    speakAgent(input: { characterId: string; text: string; type?: CharacterSayType }): Promise<WorldCommandResult>;
    clearAgentSpeech(input: { characterId: string }): Promise<WorldCommandResult>;
    removeAgent(input: { characterId: string }): Promise<WorldCommandResult>;
    openFurnitureEditor(): Promise<void>;
    closeFurnitureEditor(): Promise<void>;
    selectFurniture(input: { collectionName: string; prefabId: string }): Promise<{ prefabId: string }>;
    placeFurniture(input: { x: number; y: number; entityId?: string }): Promise<WorldCommandResult>;
    selectEntity(input: { entityId: string }): Promise<{ entityId: string }>;
    moveEntity(input: { entityId: string; x: number; y: number }): Promise<WorldCommandResult>;
    changeEntityVariant(input: { entityId: string; collectionName: string; prefabId: string }): Promise<WorldCommandResult>;
    deleteEntity(input: { entityId: string }): Promise<WorldCommandResult>;
    undo(): Promise<WorldCommandResult>;
    redo(): Promise<WorldCommandResult>;
    flushPersistence(): Promise<WorldCommandResult>;
    clearOverlay(): Promise<void>;
};

declare global {
    interface Window {
        __standaloneTest?: TestBridgeApi;
    }
}

let networkBridgeInstalled = false;
const worldEventsBuffer: WorldEvent[] = [];
const MAX_WORLD_EVENT_BUFFER = 500;
let subscribedWorldEventGateway: unknown;
let unsubscribeWorldEventGateway: (() => void) | undefined;

export function installStandaloneTestBridge(
    game: Game,
    scene: StandaloneGameScene,
    sceneId: StandaloneSceneId,
    controller: DefaultStandaloneSceneController,
): { destroy(): void } {
    installNetworkAuditBridge();
    const gateway = controller.getWorldCommandGateway();
    ensureWorldEventSubscription(gateway);

    const executeWorldCommand = (command: WorldCommand | unknown, options?: { timeoutMs?: number }) =>
        gateway.execute(command, options);

    const bridge: TestBridgeApi = {
        getSceneState: async () => ({
            sceneId,
            activeSceneId: controller.getActiveSceneId(),
            editor: scene.getStandaloneEntityEditorSnapshot(),
            network: readNetworkAudit(),
            world: await executeWorldCommand({
                schemaVersion: 1,
                commandId: `test-scene-state-${Date.now()}`,
                type: "scene.getState",
                payload: {},
            }),
        }),
        getPlayerState: () => ({
            x: scene.CurrentPlayer?.x ?? 0,
            y: scene.CurrentPlayer?.y ?? 0,
            direction: String(scene.CurrentPlayer?.lastDirection ?? "down"),
            moving:
                scene.CurrentPlayer?.body instanceof Phaser.Physics.Arcade.Body
                    ? scene.CurrentPlayer.body.speed > 0
                    : false,
        }),
        getEntities: async () => {
            const result = await executeWorldCommand(command("furniture.list", {}));
            return ((result.data ?? []) as FurnitureEntitySnapshot[]).map((entity) => ({
                id: entity.id,
                x: entity.x,
                y: entity.y,
                width: entity.width,
                height: entity.height,
                prefabId: entity.prefab.prefabId,
                collectionName: entity.prefab.collectionName,
                name: entity.prefab.name,
                color: entity.prefab.color,
                direction: entity.prefab.direction,
            }));
        },
        listFurniturePrefabs: async () => {
            const result = await executeWorldCommand(command("furniture.listCatalog", {}));
            return (result.data ?? []) as FurniturePrefabSnapshot[];
        },
        movePlayer: async ({ x, y }) => {
            const result = await scene.moveTo({ x, y }, false);
            if (!result.ok) {
                throw new Error(result.message);
            }
            return {
                x: result.character.position.x,
                y: result.character.position.y,
                cancelled: false,
            };
        },
        executeWorldCommand,
        cancelWorldCommand: (commandId) => gateway.cancel(commandId),
        getWorldEvents: () => toJson(worldEventsBuffer),
        listActiveCommands: () => toJson(gateway.listActiveCommands()),
        spawnAgent: (input) =>
            executeWorldCommand(
                command("agent.spawn", input, {
                    sceneId: input.sceneId,
                }),
            ),
        listAgents: () => executeWorldCommand(command("agent.list", {})),
        getAgentState: (input) => executeWorldCommand(command("agent.getState", input)),
        moveAgent: (input) => executeWorldCommand(command("agent.moveTo", input)),
        stopAgent: (input) => executeWorldCommand(command("agent.stop", input)),
        faceAgent: (input) => executeWorldCommand(command("agent.face", input)),
        speakAgent: (input) => executeWorldCommand(command("agent.speak", input)),
        clearAgentSpeech: (input) => executeWorldCommand(command("agent.clearSpeech", input)),
        removeAgent: (input) => executeWorldCommand(command("agent.remove", input)),
        openFurnitureEditor: async () => {
            scene.openFurnitureEditor();
        },
        closeFurnitureEditor: async () => {
            scene.closeFurnitureEditor();
        },
        selectFurniture: async ({ collectionName, prefabId }) => {
            scene.beginFurniturePlacement(
                (await scene.getEntitiesCollectionsManager().getEntityPrefab(collectionName, prefabId)) ??
                    (() => {
                        throw new Error(`Unknown prefab ${collectionName}/${prefabId}`);
                    })(),
            );
            return { prefabId };
        },
        placeFurniture: ({ x, y, entityId }) =>
            executeWorldCommand(
                command("furniture.place", {
                    entityId,
                    prefab: requiredPendingPrefab(scene),
                    position: { x, y },
                }),
            ),
        selectEntity: async ({ entityId }) => {
            const entity = scene.getEntityById(entityId);
            if (!entity) {
                throw new Error(`Entity ${entityId} not found`);
            }
            scene.openFurnitureEditor();
            scene.getMapEditorModeManager().setSelectedEntityId?.(entityId);
            return { entityId };
        },
        moveEntity: ({ entityId, x, y }) =>
            executeWorldCommand(command("furniture.move", { entityId, position: { x, y } })),
        changeEntityVariant: ({ entityId, collectionName, prefabId }) =>
            executeWorldCommand(
                command("furniture.setVariant", {
                    entityId,
                    prefab: { collectionName, prefabId },
                }),
            ),
        deleteEntity: ({ entityId }) => executeWorldCommand(command("furniture.remove", { entityId })),
        undo: () => executeWorldCommand(command("history.undo", {})),
        redo: () => executeWorldCommand(command("history.redo", {})),
        flushPersistence: () => executeWorldCommand(command("world.flush", {})),
        clearOverlay: async () => {
            await controller.clearActiveOverlayAndReload();
        },
    };

    window.__standaloneTest = bridge;

    const postStep = () => {
        document.documentElement.dataset.standaloneActiveScene = sceneId;
        document.documentElement.dataset.standaloneControllerActiveScene = controller.getActiveSceneId() ?? "";
        if (scene.CurrentPlayer) {
            document.documentElement.dataset.standalonePlayerPosition = JSON.stringify(bridge.getPlayerState());
        }
        try {
            const runtime = scene.getWorldSceneRuntime();
            const entities = runtime.furnitureCommands.list().map((entity) => ({
                id: entity.id,
                x: entity.x,
                y: entity.y,
                width: entity.width,
                height: entity.height,
                prefabId: entity.prefab.prefabId,
                collectionName: entity.prefab.collectionName,
                name: entity.prefab.name,
                color: entity.prefab.color,
                direction: entity.prefab.direction,
            }));
            const agents = runtime.agentCommands.list();
            document.documentElement.dataset.standaloneEntities = JSON.stringify(entities);
            document.documentElement.dataset.standaloneAgents = JSON.stringify(agents);
        } catch (error) {
            console.warn("[StandaloneTestBridge] snapshot_failed", error);
        }
        document.documentElement.dataset.standaloneNetworkAudit = JSON.stringify(readNetworkAudit());
    };

    game.events.on(Phaser.Core.Events.POST_STEP, postStep);

    return {
        destroy() {
            game.events.off(Phaser.Core.Events.POST_STEP, postStep);
            delete window.__standaloneTest;
            delete document.documentElement.dataset.standaloneActiveScene;
            delete document.documentElement.dataset.standaloneControllerActiveScene;
            delete document.documentElement.dataset.standalonePlayerPosition;
            delete document.documentElement.dataset.standaloneEntities;
            delete document.documentElement.dataset.standaloneAgents;
            delete document.documentElement.dataset.standaloneNetworkAudit;
        },
    };
}

function ensureWorldEventSubscription(gateway: unknown & { subscribe(listener: (event: WorldEvent) => void): () => void }): void {
    if (subscribedWorldEventGateway === gateway) {
        return;
    }
    unsubscribeWorldEventGateway?.();
    subscribedWorldEventGateway = gateway;
    unsubscribeWorldEventGateway = gateway.subscribe((event) => {
        worldEventsBuffer.push(toJson(event));
        if (worldEventsBuffer.length > MAX_WORLD_EVENT_BUFFER) {
            worldEventsBuffer.shift();
        }
    });
}

function command(
    type: WorldCommand["type"],
    payload: unknown,
    options?: { sceneId?: string },
): WorldCommand {
    return {
        schemaVersion: 1,
        commandId: `test-${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        type,
        sceneId: options?.sceneId as WorldCommand["sceneId"],
        payload,
    } as WorldCommand;
}

function requiredPendingPrefab(scene: StandaloneGameScene): { collectionName: string; prefabId: string } {
    const prefab = scene.getPendingFurniturePrefab();
    if (!prefab) {
        throw new Error("No furniture prefab selected");
    }
    return {
        collectionName: prefab.collectionName,
        prefabId: prefab.id,
    };
}

function readNetworkAudit(): NetworkAuditEntry[] {
    const raw = document.documentElement.dataset.standaloneNetworkAudit;
    return raw ? (JSON.parse(raw) as NetworkAuditEntry[]) : [];
}

function toJson<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

function installNetworkAuditBridge(): void {
    if (networkBridgeInstalled) {
        return;
    }
    networkBridgeInstalled = true;
    const requests: NetworkAuditEntry[] = [];
    const record = (transport: NetworkAuditEntry["transport"], url: string | URL) => {
        requests.push({ transport, url: String(url) });
        document.documentElement.dataset.standaloneNetworkAudit = JSON.stringify(requests);
    };

    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
        record("fetch", input instanceof Request ? input.url : input);
        return nativeFetch(input, init);
    };

    const nativeOpen: (
        this: XMLHttpRequest,
        method: string,
        url: string | URL,
        async: boolean,
        user?: string | null,
        password?: string | null,
    ) => void = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (
        method: string,
        url: string | URL,
        async: boolean = true,
        user?: string | null,
        password?: string | null,
    ) {
        record("xhr", url);
        return nativeOpen.call(this, method, url, async, user, password);
    };

    const NativeWebSocket = window.WebSocket;
    window.WebSocket = class AuditedWebSocket extends NativeWebSocket {
        public constructor(url: string | URL, protocols?: string | string[]) {
            record("websocket", url);
            super(url, protocols);
        }
    };
}
