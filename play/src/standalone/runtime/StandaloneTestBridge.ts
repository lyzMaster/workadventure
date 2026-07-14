import * as Phaser from "phaser";
import { v4 as uuidv4 } from "uuid";
import type {
    AgentActionErrorCode,
    AgentActionResult,
    AgentCharacterDefinition,
    AgentCharacterSnapshot,
    CharacterId,
    CharacterSayType,
    Direction,
} from "@workadventure/game-model";
import type { EntityPrefab, WAMEntityData } from "@workadventure/map-editor";
import { CreateEntityFrontCommand } from "../../front/Phaser/Game/MapEditor/Commands/Entity/CreateEntityFrontCommand";
import { DeleteEntityFrontCommand } from "../../front/Phaser/Game/MapEditor/Commands/Entity/DeleteEntityFrontCommand";
import { UpdateEntityFrontCommand } from "../../front/Phaser/Game/MapEditor/Commands/Entity/UpdateEntityFrontCommand";
import { mapEditorEntityModeStore, mapEditorSelectedEntityIdStore } from "../../front/Stores/MapEditorEntityEditorStore";
import type { Game } from "../../front/Phaser/Game/Game";
import type { DefaultStandaloneSceneController } from "../StandaloneSceneController";
import type { StandaloneSceneId } from "../StandaloneSceneDefinition";
import type { StandaloneGameScene } from "./StandaloneGameScene";

type NetworkAuditEntry = {
    transport: "fetch" | "xhr" | "websocket";
    url: string;
};

type TestEntitySnapshot = {
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
};

type TestPrefabSnapshot = {
    prefabId: string;
    collectionName: string;
    name: string;
    hasCollisionGrid: boolean;
};

type TestBridgeApi = {
    getSceneState(): {
        sceneId: StandaloneSceneId;
        activeSceneId: string | null;
        editor: ReturnType<StandaloneGameScene["getStandaloneEntityEditorSnapshot"]>;
        network: NetworkAuditEntry[];
    };
    getPlayerState(): {
        x: number;
        y: number;
        direction: string;
        moving: boolean;
    };
    getEntities(): TestEntitySnapshot[];
    listFurniturePrefabs(): TestPrefabSnapshot[];
    movePlayer(target: { x: number; y: number }): Promise<{ x: number; y: number; cancelled: boolean }>;
    spawnAgent(definition: AgentCharacterDefinition): Promise<AgentActionResult<AgentCharacterSnapshot>>;
    listAgents(): AgentActionResult<AgentCharacterSnapshot[]>;
    getAgentState(input: { characterId: CharacterId }): AgentActionResult<AgentCharacterSnapshot>;
    moveAgent(input: {
        characterId: CharacterId;
        target: { x: number; y: number };
        options?: { tryFindingNearestAvailable?: boolean; timeoutMs?: number; maxCalculations?: number; speed?: number };
    }): Promise<AgentActionResult<AgentCharacterSnapshot>>;
    stopAgent(input: { characterId: CharacterId }): AgentActionResult<AgentCharacterSnapshot>;
    faceAgent(input: { characterId: CharacterId; direction: Direction }): AgentActionResult<AgentCharacterSnapshot>;
    speakAgent(input: {
        characterId: CharacterId;
        text: string;
        type?: CharacterSayType;
    }): AgentActionResult<AgentCharacterSnapshot>;
    clearAgentSpeech(input: { characterId: CharacterId }): AgentActionResult<AgentCharacterSnapshot>;
    removeAgent(input: { characterId: CharacterId }): AgentActionResult<AgentCharacterSnapshot>;
    openFurnitureEditor(): Promise<void>;
    closeFurnitureEditor(): Promise<void>;
    selectFurniture(input: { collectionName: string; prefabId: string }): Promise<{ prefabId: string }>;
    placeFurniture(input: { x: number; y: number }): Promise<{ entityId: string }>;
    selectEntity(input: { entityId: string }): Promise<{ entityId: string }>;
    moveEntity(input: { entityId: string; x: number; y: number }): Promise<{ entityId: string; x: number; y: number }>;
    changeEntityVariant(input: { entityId: string; collectionName: string; prefabId: string }): Promise<{
        entityId: string;
        prefabId: string;
    }>;
    deleteEntity(input: { entityId: string }): Promise<void>;
    undo(): Promise<void>;
    redo(): Promise<void>;
    flushPersistence(): Promise<void>;
    clearOverlay(): Promise<void>;
};

declare global {
    interface Window {
        __standaloneTest?: TestBridgeApi;
    }
}

let networkBridgeInstalled = false;

export function installStandaloneTestBridge(
    game: Game,
    scene: StandaloneGameScene,
    sceneId: StandaloneSceneId,
    controller: DefaultStandaloneSceneController,
): { destroy(): void } {
    installNetworkAuditBridge();

    const bridge: TestBridgeApi = {
        getSceneState: () => ({
            sceneId,
            activeSceneId: controller.getActiveSceneId(),
            editor: scene.getStandaloneEntityEditorSnapshot(),
            network: readNetworkAudit(),
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
        getEntities: () => listEntities(scene),
        listFurniturePrefabs: () => listFurniturePrefabs(scene),
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
        spawnAgent: async (definition) => {
            const agentController = safeGetAgentController(scene);
            return toJson(agentController ? await agentController.spawn(definition) : agentBridgeFailure("scene_not_loaded"));
        },
        listAgents: () => {
            const agentController = safeGetAgentController(scene);
            return toJson(agentController ? agentController.list() : agentBridgeFailure("scene_not_loaded"));
        },
        getAgentState: ({ characterId }) => {
            const agentController = safeGetAgentController(scene);
            return toJson(agentController ? agentController.getState(characterId) : agentBridgeFailure("scene_not_loaded"));
        },
        moveAgent: async ({ characterId, target, options }) => {
            const agentController = safeGetAgentController(scene);
            return toJson(agentController ? await agentController.moveTo(characterId, target, options) : agentBridgeFailure("scene_not_loaded"));
        },
        stopAgent: ({ characterId }) => {
            const agentController = safeGetAgentController(scene);
            return toJson(agentController ? agentController.stop(characterId) : agentBridgeFailure("scene_not_loaded"));
        },
        faceAgent: ({ characterId, direction }) => {
            const agentController = safeGetAgentController(scene);
            return toJson(agentController ? agentController.face(characterId, direction) : agentBridgeFailure("scene_not_loaded"));
        },
        speakAgent: ({ characterId, text, type }) => {
            const agentController = safeGetAgentController(scene);
            return toJson(agentController ? agentController.speak(characterId, text, type) : agentBridgeFailure("scene_not_loaded"));
        },
        clearAgentSpeech: ({ characterId }) => {
            const agentController = safeGetAgentController(scene);
            return toJson(agentController ? agentController.clearSpeech(characterId) : agentBridgeFailure("scene_not_loaded"));
        },
        removeAgent: ({ characterId }) => {
            const agentController = safeGetAgentController(scene);
            return toJson(agentController ? agentController.remove(characterId) : agentBridgeFailure("scene_not_loaded"));
        },
        openFurnitureEditor: async () => {
            scene.openFurnitureEditor();
        },
        closeFurnitureEditor: async () => {
            scene.closeFurnitureEditor();
        },
        selectFurniture: async ({ collectionName, prefabId }) => {
            const prefab = await getPrefab(scene, collectionName, prefabId);
            scene.beginFurniturePlacement(prefab);
            return { prefabId: prefab.id };
        },
        placeFurniture: async ({ x, y }) => {
            const prefab = scene.getPendingFurniturePrefab();
            if (!prefab) {
                throw new Error("No furniture prefab selected");
            }
            const { width, height } = await ensurePrefabDimensions(scene, prefab);
            const entityId = uuidv4();
            const entityData: WAMEntityData = {
                x: Math.floor(x - width * 0.5),
                y: Math.floor(y - height * 0.5),
                prefabRef: { collectionName: prefab.collectionName, id: prefab.id },
                properties: [],
            };
            await scene.getMapEditorModeManager().executeCommand(
                new CreateEntityFrontCommand(
                    scene.getGameMap().getWamFile()!,
                    entityId,
                    entityData,
                    undefined,
                    scene.getGameMapFrontWrapper().getEntitiesManager(),
                    { width, height },
                ),
            );
            return { entityId };
        },
        selectEntity: async ({ entityId }) => {
            const entity = scene.getEntityById(entityId);
            if (!entity) {
                throw new Error(`Entity ${entityId} not found`);
            }
            scene.openFurnitureEditor();
            mapEditorEntityModeStore.set("EDIT");
            mapEditorSelectedEntityIdStore.set(entityId);
            return { entityId };
        },
        moveEntity: async ({ entityId, x, y }) => {
            await scene.getMapEditorModeManager().executeCommand(
                new UpdateEntityFrontCommand(
                    scene.getGameMap().getWamFile()!,
                    entityId,
                    { x, y },
                    undefined,
                    undefined,
                    scene.getGameMapFrontWrapper().getEntitiesManager(),
                    scene,
                ),
            );
            return { entityId, x, y };
        },
        changeEntityVariant: async ({ entityId, collectionName, prefabId }) => {
            const prefab = await getPrefab(scene, collectionName, prefabId);
            await scene.getMapEditorModeManager().executeCommand(
                new UpdateEntityFrontCommand(
                    scene.getGameMap().getWamFile()!,
                    entityId,
                    { prefabRef: { collectionName: prefab.collectionName, id: prefab.id } },
                    undefined,
                    undefined,
                    scene.getGameMapFrontWrapper().getEntitiesManager(),
                    scene,
                ),
            );
            return { entityId, prefabId };
        },
        deleteEntity: async ({ entityId }) => {
            const entity = scene.getEntityById(entityId);
            if (!entity) {
                throw new Error(`Entity ${entityId} not found`);
            }
            await scene.getMapEditorModeManager().executeCommand(
                new DeleteEntityFrontCommand(
                    scene.getGameMap().getWamFile()!,
                    entityId,
                    undefined,
                    scene.getGameMapFrontWrapper().getEntitiesManager(),
                ),
            );
        },
        undo: async () => {
            await scene.getMapEditorModeManager().undoCommand();
        },
        redo: async () => {
            await scene.getMapEditorModeManager().redoCommand();
        },
        flushPersistence: async () => {
            await scene.flushPersistence();
        },
        clearOverlay: async () => {
            void controller.clearActiveOverlayAndReload();
        },
    };

    window.__standaloneTest = bridge;

    const postStep = () => {
        document.documentElement.dataset.standaloneActiveScene = sceneId;
        if (scene.CurrentPlayer) {
            document.documentElement.dataset.standalonePlayerPosition = JSON.stringify(bridge.getPlayerState());
        }
        document.documentElement.dataset.standaloneEntities = JSON.stringify(bridge.getEntities());
        document.documentElement.dataset.standaloneAgents = JSON.stringify(bridge.listAgents());
        document.documentElement.dataset.standaloneNetworkAudit = JSON.stringify(readNetworkAudit());
    };

    game.events.on(Phaser.Core.Events.POST_STEP, postStep);

    return {
        destroy() {
            game.events.off(Phaser.Core.Events.POST_STEP, postStep);
            delete window.__standaloneTest;
            delete document.documentElement.dataset.standaloneActiveScene;
            delete document.documentElement.dataset.standalonePlayerPosition;
            delete document.documentElement.dataset.standaloneEntities;
            delete document.documentElement.dataset.standaloneAgents;
            delete document.documentElement.dataset.standaloneNetworkAudit;
        },
    };
}

async function getPrefab(scene: StandaloneGameScene, collectionName: string, prefabId: string): Promise<EntityPrefab> {
    const prefab = await scene.getEntitiesCollectionsManager().getEntityPrefab(collectionName, prefabId);
    if (!prefab) {
        throw new Error(`Unknown prefab ${collectionName}/${prefabId}`);
    }
    return prefab;
}

async function ensurePrefabDimensions(
    scene: StandaloneGameScene,
    prefab: EntityPrefab,
): Promise<{ width: number; height: number }> {
    if (!scene.textures.exists(prefab.imagePath)) {
        await new Promise<void>((resolve) => {
            scene.load.image(prefab.imagePath, prefab.imagePath);
            scene.load.once(`filecomplete-image-${prefab.imagePath}`, () => resolve());
            scene.load.start();
        }).catch(() => undefined);
    }

    const texture = scene.textures.get(prefab.imagePath);
    const frame = texture.getSourceImage() as { width?: number; height?: number } | undefined;
    return {
        width: frame?.width ?? 32,
        height: frame?.height ?? 32,
    };
}

function listEntities(scene: StandaloneGameScene): TestEntitySnapshot[] {
    const wrapper = safeGetGameMapFrontWrapper(scene);
    if (!wrapper) {
        return [];
    }
    return [...wrapper.getEntitiesManager().getEntities().values()].map((entity) => ({
        id: entity.entityId,
        x: entity.x,
        y: entity.y,
        width: entity.displayWidth,
        height: entity.displayHeight,
        prefabId: entity.getPrefab().id,
        collectionName: entity.getPrefab().collectionName,
        name: entity.getPrefab().name,
        color: entity.getPrefab().color,
        direction: entity.getPrefab().direction,
    }));
}

function listFurniturePrefabs(scene: StandaloneGameScene): TestPrefabSnapshot[] {
    let snapshots: TestPrefabSnapshot[] = [];
    const unsubscribe = scene
        .getEntitiesCollectionsManager()
        .getEntitiesPrefabsVariantStore()
        .subscribe((variants) => {
            snapshots = variants.map((variant) => ({
                prefabId: variant.defaultPrefab.id,
                collectionName: variant.defaultPrefab.collectionName,
                name: variant.defaultPrefab.name,
                hasCollisionGrid: (variant.defaultPrefab.collisionGrid?.length ?? 0) > 0,
            }));
        });
    unsubscribe();
    return snapshots;
}

function safeGetGameMapFrontWrapper(scene: StandaloneGameScene) {
    try {
        return scene.getGameMapFrontWrapper();
    } catch {
        return undefined;
    }
}

function safeGetAgentController(scene: StandaloneGameScene) {
    try {
        return scene.getAgentController();
    } catch {
        return undefined;
    }
}

function agentBridgeFailure<T>(code: AgentActionErrorCode, message = "Standalone scene is not loaded yet"): AgentActionResult<T> {
    return {
        ok: false,
        actionId: "standalone-test-bridge",
        code,
        message,
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
