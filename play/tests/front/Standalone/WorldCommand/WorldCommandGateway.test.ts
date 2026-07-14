import { describe, expect, it, vi } from "vitest";
import type {
    AgentActionResult,
    AgentCharacterDefinition,
    AgentCharacterSnapshot,
    CharacterSayType,
    Direction,
} from "@workadventure/game-model";
import { DefaultWorldCommandGateway } from "../../../../src/standalone/commands/WorldCommandGateway";
import type {
    ActiveSceneRuntimeProvider,
    FurnitureEntitySnapshot,
    FurniturePrefabSnapshot,
    HistoryStateSnapshot,
    SceneRuntimeSnapshot,
    WorldSceneRuntime,
    WorldSceneStateSnapshot,
} from "../../../../src/standalone/commands/types";

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((innerResolve, innerReject) => {
        resolve = innerResolve;
        reject = innerReject;
    });
    return { promise, resolve, reject };
}

type MovePending = {
    resolve: (value: AgentActionResult<AgentCharacterSnapshot>) => void;
};

function snapshot(id: string, sceneId = "home"): AgentCharacterSnapshot {
    return {
        kind: "agent",
        id,
        name: id,
        sceneId,
        position: { x: 32, y: 32, direction: "down", moving: false },
        motionState: "idle",
    };
}

function agentDefinition(id = "agent-a", sceneId: "home" | "office" = "home"): AgentCharacterDefinition {
    return {
        characterId: id,
        name: id,
        sceneId,
        appearance: {
            textures: [{ id: `${id}-tex`, url: "/resources/characters/test.png", layer: 0 }],
        },
        spawnPosition: { x: 32, y: 32, direction: "down", moving: false },
    };
}

function furnitureSnapshot(id: string, prefabId = "chair"): FurnitureEntitySnapshot {
    return {
        id,
        x: 96,
        y: 128,
        width: 32,
        height: 32,
        prefab: {
            collectionName: "basic furniture",
            prefabId,
            name: prefabId,
            color: "#fff",
            direction: "Down",
            hasCollisionGrid: false,
        },
        propertiesCount: 0,
    };
}

function createFakeRuntime(sceneId: "home" | "office") {
    const agents = new Map<string, AgentCharacterSnapshot>();
    const furniture = new Map<string, FurnitureEntitySnapshot>();
    const catalog: FurniturePrefabSnapshot[] = [
        {
            collectionName: "basic furniture",
            prefabId: "chair",
            name: "Chair",
            color: "#fff",
            direction: "Down",
            hasCollisionGrid: false,
        },
        {
            collectionName: "basic furniture",
            prefabId: "desk",
            name: "Desk",
            color: "#ccc",
            direction: "Down",
            hasCollisionGrid: true,
        },
    ];
    const history: HistoryStateSnapshot = { canUndo: false, canRedo: false };
    const pendingMoves = new Map<string, MovePending>();
    let moveConcurrency = 0;
    let maxMoveConcurrency = 0;
    let furnitureConcurrency = 0;
    let maxFurnitureConcurrency = 0;
    const callCounts = {
        spawn: 0,
        moveTo: 0,
        place: 0,
        switchFlush: 0,
    };

    const runtime: WorldSceneRuntime = {
        sceneId,
        agentCommands: {
            spawn: async (definition, options) => {
                callCounts.spawn += 1;
                if (options?.signal?.aborted) {
                    return { ok: false, actionId: "spawn", code: "cancelled", message: "cancelled" };
                }
                const value = snapshot(definition.characterId, definition.sceneId);
                agents.set(definition.characterId, value);
                return { ok: true, actionId: "spawn", value };
            },
            list: () => ({ ok: true, actionId: "list", value: [...agents.values()] }),
            getState: (characterId) => {
                const value = agents.get(characterId);
                return value
                    ? { ok: true, actionId: "get", value }
                    : { ok: false, actionId: "get", code: "character_not_found", message: "not found" };
            },
            moveTo: async (characterId, target) => {
                callCounts.moveTo += 1;
                const current = agents.get(characterId) ?? snapshot(characterId, sceneId);
                agents.set(characterId, current);
                pendingMoves.get(characterId)?.resolve({
                    ok: false,
                    actionId: "move",
                    code: "cancelled",
                    message: "superseded",
                });
                moveConcurrency += 1;
                maxMoveConcurrency = Math.max(maxMoveConcurrency, moveConcurrency);
                return await new Promise<AgentActionResult<AgentCharacterSnapshot>>((resolve) => {
                    pendingMoves.set(characterId, {
                        resolve: (value) => {
                            moveConcurrency -= 1;
                            pendingMoves.delete(characterId);
                            resolve(value);
                        },
                    });
                    setTimeout(() => {
                        const next = {
                            ...current,
                            position: { ...current.position, x: target.x, y: target.y },
                        };
                        agents.set(characterId, next);
                        pendingMoves.get(characterId)?.resolve({ ok: true, actionId: "move", value: next });
                    }, 10);
                });
            },
            stop: (characterId) => {
                pendingMoves.get(characterId)?.resolve({
                    ok: false,
                    actionId: "stop",
                    code: "cancelled",
                    message: "stopped",
                });
                const value = agents.get(characterId) ?? snapshot(characterId, sceneId);
                return { ok: true, actionId: "stop", value };
            },
            face: (characterId, direction) => {
                const value = agents.get(characterId) ?? snapshot(characterId, sceneId);
                const next = { ...value, position: { ...value.position, direction } };
                agents.set(characterId, next);
                return { ok: true, actionId: "face", value: next };
            },
            speak: (characterId, _text, type) => {
                const value = agents.get(characterId) ?? snapshot(characterId, sceneId);
                const next = {
                    ...value,
                    motionState: type === "thinking" ? "thinking" : "speaking",
                };
                agents.set(characterId, next);
                return { ok: true, actionId: "speak", value: next };
            },
            clearSpeech: (characterId) => {
                const value = agents.get(characterId) ?? snapshot(characterId, sceneId);
                const next = { ...value, motionState: "idle" as const };
                agents.set(characterId, next);
                return { ok: true, actionId: "clear", value: next };
            },
            remove: (characterId) => {
                const value = agents.get(characterId) ?? snapshot(characterId, sceneId);
                agents.delete(characterId);
                return { ok: true, actionId: "remove", value };
            },
            cancelMove: (characterId) => {
                pendingMoves.get(characterId)?.resolve({
                    ok: false,
                    actionId: "cancel",
                    code: "cancelled",
                    message: "cancelled",
                });
            },
        },
        furnitureCommands: {
            listCatalog: async () => catalog,
            list: () => [...furniture.values()],
            getState: (entityId) => furniture.get(entityId),
            place: async (input) => {
                callCounts.place += 1;
                furnitureConcurrency += 1;
                maxFurnitureConcurrency = Math.max(maxFurnitureConcurrency, furnitureConcurrency);
                await Promise.resolve();
                const value = furnitureSnapshot(input.entityId, input.prefab.prefabId);
                furniture.set(input.entityId, value);
                furnitureConcurrency -= 1;
                history.canUndo = true;
                return { ok: true, value };
            },
            move: async (entityId, position) => {
                const current = furniture.get(entityId);
                if (!current) {
                    return { ok: false, code: "entity_not_found", message: "not found" };
                }
                const value = { ...current, x: position.x, y: position.y };
                furniture.set(entityId, value);
                history.canUndo = true;
                return { ok: true, value };
            },
            setVariant: async (entityId, prefab) => {
                const current = furniture.get(entityId);
                if (!current) {
                    return { ok: false, code: "entity_not_found", message: "not found" };
                }
                const value = { ...current, prefab: { ...current.prefab, ...prefab } };
                furniture.set(entityId, value);
                history.canUndo = true;
                return { ok: true, value };
            },
            remove: async (entityId) => {
                const current = furniture.get(entityId);
                if (!current) {
                    return { ok: false, code: "entity_not_found", message: "not found" };
                }
                furniture.delete(entityId);
                history.canUndo = true;
                return { ok: true, value: current };
            },
            undo: async () => ({ ok: true, value: { canUndo: false, canRedo: true } }),
            redo: async () => ({ ok: true, value: { canUndo: true, canRedo: false } }),
            getHistoryState: () => ({ ...history }),
            flush: async () => undefined,
        },
        historyCommands: {
            undo: async () => ({ ok: true, value: { canUndo: false, canRedo: true } }),
            redo: async () => ({ ok: true, value: { canUndo: true, canRedo: false } }),
            getHistoryState: () => ({ ...history }),
        },
        flush: async () => {
            callCounts.switchFlush += 1;
        },
    };

    return {
        runtime,
        agents,
        furniture,
        metrics: {
            get maxMoveConcurrency() {
                return maxMoveConcurrency;
            },
            get maxFurnitureConcurrency() {
                return maxFurnitureConcurrency;
            },
            callCounts,
        },
    };
}

class FakeRuntimeProvider implements ActiveSceneRuntimeProvider {
    private readonly listeners = new Set<(snapshot: SceneRuntimeSnapshot) => void>();
    private loading = false;

    public constructor(
        private activeSceneId: "home" | "office",
        private readonly runtimes: Record<"home" | "office", WorldSceneRuntime>,
    ) {}

    public getActiveSceneId(): string | null {
        return this.activeSceneId;
    }

    public getActiveRuntime(): WorldSceneRuntime | null {
        return this.runtimes[this.activeSceneId];
    }

    public async switchScene(sceneId: "home" | "office"): Promise<void> {
        this.loading = true;
        this.emit();
        await Promise.resolve();
        this.activeSceneId = sceneId;
        this.loading = false;
        this.emit();
    }

    public subscribe(listener: (snapshot: SceneRuntimeSnapshot) => void): () => void {
        this.listeners.add(listener);
        listener({ activeSceneId: this.activeSceneId, hasRuntime: true, loading: this.loading });
        return () => this.listeners.delete(listener);
    }

    public getSceneStateSnapshot(): WorldSceneStateSnapshot {
        const runtime = this.getActiveRuntime();
        const agents = runtime?.agentCommands.list();
        const furniture = runtime?.furnitureCommands.list() ?? [];
        const history = runtime?.historyCommands.getHistoryState() ?? { canUndo: false, canRedo: false };
        return {
            activeSceneId: this.activeSceneId,
            loading: this.loading,
            availableScenes: [
                { sceneId: "home", displayName: "Home" },
                { sceneId: "office", displayName: "Office" },
            ],
            player: null,
            agents: agents?.ok ? agents.value : [],
            furniture: {
                count: furniture.length,
                entities: furniture,
                canUndo: history.canUndo,
                canRedo: history.canRedo,
            },
            persistence: {
                loaded: true,
                restoring: false,
                dirty: false,
                revision: 0,
                restoreDiagnosticCount: 0,
            },
        };
    }

    public isTransitionInProgress(): boolean {
        return this.loading;
    }

    private emit(): void {
        const snapshot = { activeSceneId: this.activeSceneId, hasRuntime: true, loading: this.loading };
        for (const listener of this.listeners) {
            listener(snapshot);
        }
    }
}

function command(type: string, payload: unknown = {}, commandId?: string, sceneId?: "home" | "office") {
    return {
        schemaVersion: 1 as const,
        commandId: commandId ?? `${type}-${Math.random().toString(16).slice(2)}`,
        type,
        sceneId,
        payload,
    };
}

describe("WorldCommandGateway", () => {
    it("executes scene, agent, furniture, history and flush commands", async () => {
        const home = createFakeRuntime("home");
        const office = createFakeRuntime("office");
        const provider = new FakeRuntimeProvider("home", { home: home.runtime, office: office.runtime });
        const gateway = new DefaultWorldCommandGateway(provider);

        expect((await gateway.execute(command("scene.getState"))).status).toBe("succeeded");
        expect(
            await gateway.execute(command("agent.spawn", agentDefinition("agent-a", "home"), "spawn-1", "home")),
        ).toMatchObject({ status: "succeeded" });
        expect(
            await gateway.execute(command("agent.moveTo", { characterId: "agent-a", target: { x: 128, y: 64 } })),
        ).toMatchObject({ status: "succeeded" });
        expect(
            await gateway.execute(command("agent.face", { characterId: "agent-a", direction: "left" })),
        ).toMatchObject({ status: "succeeded" });
        expect(
            await gateway.execute(command("agent.speak", { characterId: "agent-a", text: "hello", type: "speech" })),
        ).toMatchObject({ status: "succeeded" });
        expect(
            await gateway.execute(command("agent.clearSpeech", { characterId: "agent-a" })),
        ).toMatchObject({ status: "succeeded" });
        expect(await gateway.execute(command("furniture.listCatalog"))).toMatchObject({ status: "succeeded" });
        expect(
            await gateway.execute(
                command("furniture.place", {
                    entityId: "entity-1",
                    prefab: { collectionName: "basic furniture", prefabId: "chair" },
                    position: { x: 96, y: 96 },
                }),
            ),
        ).toMatchObject({ status: "succeeded" });
        expect(
            await gateway.execute(
                command("furniture.move", {
                    entityId: "entity-1",
                    position: { x: 128, y: 128 },
                }),
            ),
        ).toMatchObject({ status: "succeeded" });
        expect(
            await gateway.execute(
                command("furniture.setVariant", {
                    entityId: "entity-1",
                    prefab: { collectionName: "basic furniture", prefabId: "desk" },
                }),
            ),
        ).toMatchObject({ status: "succeeded" });
        expect(await gateway.execute(command("history.undo"))).toMatchObject({ status: "succeeded" });
        expect(await gateway.execute(command("history.redo"))).toMatchObject({ status: "succeeded" });
        expect(await gateway.execute(command("world.flush"))).toMatchObject({ status: "succeeded" });
        expect(await gateway.execute(command("agent.remove", { characterId: "agent-a" }))).toMatchObject({
            status: "succeeded",
        });
    });

    it("deduplicates identical commandIds and rejects conflicting payloads", async () => {
        const home = createFakeRuntime("home");
        const provider = new FakeRuntimeProvider("home", { home: home.runtime, office: createFakeRuntime("office").runtime });
        const gateway = new DefaultWorldCommandGateway(provider);
        const first = gateway.execute(command("agent.spawn", agentDefinition("agent-a", "home"), "same-id", "home"));
        const second = gateway.execute(command("agent.spawn", agentDefinition("agent-a", "home"), "same-id", "home"));

        expect(first).toBe(second);
        await expect(first).resolves.toMatchObject({ status: "succeeded" });
        expect(home.metrics.callCounts.spawn).toBe(1);

        const conflict = await gateway.execute(
            command("agent.spawn", agentDefinition("agent-b", "home"), "same-id", "home"),
        );
        expect(conflict).toMatchObject({
            status: "failed",
            error: { code: "duplicate_command_conflict" },
        });
    });

    it("reuses terminal cache and evicts old results when cache is full", async () => {
        const home = createFakeRuntime("home");
        const provider = new FakeRuntimeProvider("home", { home: home.runtime, office: createFakeRuntime("office").runtime });
        const gateway = new DefaultWorldCommandGateway(provider, { resultCacheLimit: 2 });

        await gateway.execute(command("agent.spawn", agentDefinition("a", "home"), "id-1", "home"));
        await gateway.execute(command("agent.spawn", agentDefinition("b", "home"), "id-2", "home"));
        await gateway.execute(command("agent.spawn", agentDefinition("c", "home"), "id-3", "home"));
        expect(home.metrics.callCounts.spawn).toBe(3);

        await gateway.execute(command("agent.spawn", agentDefinition("a", "home"), "id-1", "home"));
        expect(home.metrics.callCounts.spawn).toBe(4);
    });

    it("supports cancel, timeout, scene switch cancellation and gateway destroy", async () => {
        const home = createFakeRuntime("home");
        const office = createFakeRuntime("office");
        const provider = new FakeRuntimeProvider("home", { home: home.runtime, office: office.runtime });
        const gateway = new DefaultWorldCommandGateway(provider);

        await gateway.execute(command("agent.spawn", agentDefinition("agent-a", "home"), "spawn-home", "home"));

        const cancellable = gateway.execute(
            command("agent.moveTo", { characterId: "agent-a", target: { x: 256, y: 256 } }, "move-cancel", "home"),
        );
        expect(gateway.cancel("move-cancel")).toBe(true);
        await expect(cancellable).resolves.toMatchObject({
            status: "cancelled",
            error: { code: "cancelled" },
        });

        const timedOut = gateway.execute(
            command("agent.moveTo", { characterId: "agent-a", target: { x: 320, y: 320 } }, "move-timeout", "home"),
            { timeoutMs: 1 },
        );
        await expect(timedOut).resolves.toMatchObject({
            status: "timed_out",
            error: { code: "timeout" },
        });

        const oldSceneMove = gateway.execute(
            command("agent.moveTo", { characterId: "agent-a", target: { x: 512, y: 320 } }, "move-before-switch", "home"),
        );
        const switchResult = await gateway.execute(
            command("scene.switch", { sceneId: "office" }, "switch-office"),
        );
        await expect(oldSceneMove).resolves.toMatchObject({
            status: "cancelled",
        });
        expect(switchResult).toMatchObject({ status: "succeeded", sceneId: "office" });

        const destroyMove = gateway.execute(
            command("agent.moveTo", { characterId: "agent-a", target: { x: 640, y: 320 } }, "move-destroy", "office"),
        );
        gateway.destroy();
        await expect(destroyMove).resolves.toMatchObject({
            status: "cancelled",
            error: { code: "gateway_destroyed" },
        });
    });

    it("allows different agents to move concurrently, supersedes same-agent moves and serializes furniture writes", async () => {
        const home = createFakeRuntime("home");
        const provider = new FakeRuntimeProvider("home", { home: home.runtime, office: createFakeRuntime("office").runtime });
        const gateway = new DefaultWorldCommandGateway(provider);

        await gateway.execute(command("agent.spawn", agentDefinition("agent-a", "home"), "spawn-a", "home"));
        await gateway.execute(command("agent.spawn", agentDefinition("agent-b", "home"), "spawn-b", "home"));

        const firstSameAgent = gateway.execute(
            command("agent.moveTo", { characterId: "agent-a", target: { x: 160, y: 160 } }, "move-a-1", "home"),
        );
        const secondSameAgent = gateway.execute(
            command("agent.moveTo", { characterId: "agent-a", target: { x: 192, y: 192 } }, "move-a-2", "home"),
        );
        await expect(firstSameAgent).resolves.toMatchObject({ status: "cancelled" });
        await expect(secondSameAgent).resolves.toMatchObject({ status: "succeeded" });

        const concurrentA = gateway.execute(
            command("agent.moveTo", { characterId: "agent-a", target: { x: 224, y: 224 } }, "move-a-3", "home"),
        );
        const concurrentB = gateway.execute(
            command("agent.moveTo", { characterId: "agent-b", target: { x: 256, y: 256 } }, "move-b-1", "home"),
        );
        await Promise.all([concurrentA, concurrentB]);
        expect(home.metrics.maxMoveConcurrency).toBeGreaterThanOrEqual(2);

        const place1 = gateway.execute(
            command("furniture.place", {
                entityId: "entity-1",
                prefab: { collectionName: "basic furniture", prefabId: "chair" },
                position: { x: 96, y: 96 },
            }),
        );
        const place2 = gateway.execute(
            command("furniture.place", {
                entityId: "entity-2",
                prefab: { collectionName: "basic furniture", prefabId: "desk" },
                position: { x: 128, y: 128 },
            }),
        );
        await Promise.all([place1, place2]);
        expect(home.metrics.maxFurnitureConcurrency).toBe(1);
    });

    it("returns JSON-safe results and emits lifecycle and domain events", async () => {
        const home = createFakeRuntime("home");
        const provider = new FakeRuntimeProvider("home", { home: home.runtime, office: createFakeRuntime("office").runtime });
        const gateway = new DefaultWorldCommandGateway(provider);
        const listener = vi.fn();
        gateway.subscribe(listener);

        const result = await gateway.execute(command("agent.spawn", agentDefinition("agent-a", "home"), "spawn-json", "home"));
        expect(JSON.parse(JSON.stringify(result))).toEqual(result);
        expect(listener.mock.calls.map(([event]) => event.type)).toEqual([
            "command.accepted",
            "command.started",
            "agent.spawned",
            "command.succeeded",
        ]);
    });
});
