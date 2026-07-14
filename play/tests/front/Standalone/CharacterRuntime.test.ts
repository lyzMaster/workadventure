import { describe, expect, it, vi } from "vitest";
import {
    CharacterSayType,
    Direction,
    type AgentCharacterDefinition,
    type AgentCharacterSnapshot,
    type CharacterMoveResult,
    type CharacterSnapshot,
    type Direction as DirectionType,
} from "@workadventure/game-model";
import { PathTileType } from "../../../src/front/Utils/PathTileType";
import { AgentCharacter } from "../../../src/standalone/characters/AgentCharacter";
import { AgentCharacterController } from "../../../src/standalone/characters/AgentCharacterController";
import { AgentCharacterRepository } from "../../../src/standalone/characters/AgentCharacterRepository";
import type { AgentCharacterTextureLoader } from "../../../src/standalone/characters/AgentCharacterTextureLoader";
import { directionToAnimationKey } from "../../../src/standalone/characters/CharacterAnimation";
import type { CharacterRuntimeHost } from "../../../src/standalone/characters/CharacterRuntimeHost";
import {
    computeManualMovementStep,
    getManualMovementSpeed,
    hasManualMovementInput,
} from "../../../src/standalone/characters/CharacterMotionController";
import { StandaloneCharacterReadyError } from "../../../src/standalone/characters/StandaloneCharacter";
import { CharacterPathfinder } from "../../../src/standalone/pathfinding/CharacterPathfinder";
import type { PathfindingResult } from "../../../src/standalone/pathfinding/PathfindingResult";

const movementConfig = {
    walkingSpeed: 9,
    runningMultiplier: 2.5,
};

function openGrid(width = 6, height = 6): number[][] {
    return Array.from({ length: height }, () => Array.from({ length: width }, () => PathTileType.Walkable));
}

function pathfinder(grid: number[][]): CharacterPathfinder {
    return new CharacterPathfinder({
        getCollisionGrid: () => grid,
        getTileDimensions: () => ({ width: 32, height: 32 }),
    });
}

function agentDefinition(overrides: Partial<AgentCharacterDefinition> = {}): AgentCharacterDefinition {
    return {
        characterId: "agent-a",
        name: "Agent A",
        sceneId: "home",
        appearance: {
            textures: [{ id: "standalone-player", url: "/resources/characters/pipoya/Male%2001-1.png", layer: 0 }],
        },
        spawnPosition: { x: 32, y: 32, direction: Direction.DOWN, moving: false },
        ...overrides,
    };
}

function agentSnapshot(id = "agent-a", sceneId = "home"): AgentCharacterSnapshot {
    return {
        kind: "agent",
        id,
        name: id,
        sceneId,
        position: { x: 32, y: 32, direction: Direction.DOWN, moving: false },
        motionState: "idle",
    };
}

function fakeAgent(snapshot = agentSnapshot()): AgentCharacter {
    const state = structuredClone(snapshot);
    const destroy = vi.fn();
    const update = vi.fn();
    const stopAction = vi.fn(() => structuredClone(state));
    const face = vi.fn((direction: DirectionType) => {
        state.position.direction = direction;
        return structuredClone(state);
    });
    const speak = vi.fn((_text: string, type = CharacterSayType.SpeechBubble) => {
        state.motionState = type === CharacterSayType.ThinkingCloud ? "thinking" : "speaking";
        return structuredClone(state);
    });
    const clearSpeech = vi.fn(() => {
        state.motionState = "idle";
        return structuredClone(state);
    });
    const setPathToFollow = vi.fn(async () => {
        state.position.x += 32;
        state.position.moving = false;
        return { ok: true, character: structuredClone(state) } satisfies CharacterMoveResult;
    });

    return {
        id: state.id,
        x: state.position.x,
        y: state.position.y,
        getPosition: () => ({ x: state.position.x, y: state.position.y }),
        getBody: () => ({ setDirectControl: vi.fn() }),
        ready: () => Promise.resolve(),
        getAgentSnapshot: () => structuredClone(state),
        update,
        destroy,
        stopAction,
        face,
        speak,
        clearSpeech,
        setPathToFollow,
    } as unknown as AgentCharacter;
}

function host(sceneId = "home"): CharacterRuntimeHost {
    return {
        sceneId,
        markDirty: vi.fn(),
    } as unknown as CharacterRuntimeHost;
}

function textureLoader(result: "ok" | "fail" = "ok"): AgentCharacterTextureLoader {
    return {
        load: async () => {
            if (result === "fail") {
                throw new Error("texture failed");
            }
            return ["standalone-player"];
        },
    };
}

function controllerContext(options: {
    grid?: number[][];
    pathfinder?: CharacterPathfinder;
    repository?: AgentCharacterRepository;
    host?: CharacterRuntimeHost;
    textureLoader?: AgentCharacterTextureLoader;
    createAgentCharacter?: () => AgentCharacter;
} = {}): {
    controller: AgentCharacterController;
    repository: AgentCharacterRepository;
    createdColliders: AgentCharacter[];
} {
    const grid = options.grid ?? openGrid();
    const repository = options.repository ?? new AgentCharacterRepository();
    const createdColliders: AgentCharacter[] = [];
    const controller = new AgentCharacterController({
        host: options.host ?? host(),
        repository,
        pathfinder: options.pathfinder ?? pathfinder(grid),
        collisionGridProvider: {
            getCollisionGrid: () => grid,
            getTileDimensions: () => ({ width: 32, height: 32 }),
        },
        textureLoader: options.textureLoader ?? textureLoader(),
        createMapCollisionForCharacter: (character) => {
            createdColliders.push(character);
        },
        createAgentCharacter: options.createAgentCharacter
            ? () => options.createAgentCharacter?.() ?? fakeAgent()
            : undefined,
    });
    return { controller, repository, createdColliders };
}

function controllablePathfinder(): {
    pathfinder: CharacterPathfinder;
    resolve(characterId: string, result: PathfindingResult): void;
    cancelCharacter: ReturnType<typeof vi.fn>;
    cancelAll: ReturnType<typeof vi.fn>;
} {
    const pending = new Map<string, (result: PathfindingResult) => void>();
    const cancelCharacter = vi.fn((characterId: string) => {
        pending.get(characterId)?.({ ok: false, code: "cancelled", message: "cancelled" });
        pending.delete(characterId);
    });
    const cancelAll = vi.fn(() => {
        for (const [characterId, resolve] of pending.entries()) {
            resolve({ ok: false, code: "cancelled", message: "cancelled" });
            pending.delete(characterId);
        }
    });
    const service = {
        findPathForCharacter: (characterId: string) =>
            new Promise<PathfindingResult>((resolve) => {
                pending.set(characterId, resolve);
            }),
        cancelCharacter,
        cancelAll,
        destroy: cancelAll,
    } as unknown as CharacterPathfinder;

    return {
        pathfinder: service,
        cancelCharacter,
        cancelAll,
        resolve: (characterId, result) => {
            pending.get(characterId)?.(result);
            pending.delete(characterId);
        },
    };
}

describe("Standalone character runtime", () => {
    it("maps directions to animation keys", () => {
        expect(directionToAnimationKey(Direction.UP)).toBe("up");
        expect(directionToAnimationKey(Direction.DOWN)).toBe("down");
        expect(directionToAnimationKey(Direction.LEFT)).toBe("left");
        expect(directionToAnimationKey(Direction.RIGHT)).toBe("right");
    });

    it("computes local player direction from manual input", () => {
        expect(
            computeManualMovementStep(
                { up: false, down: false, left: true, right: false, speedUp: false, joystickMove: false },
                Direction.DOWN,
                movementConfig,
            ).direction,
        ).toBe(Direction.LEFT);
        expect(
            computeManualMovementStep(
                { up: true, down: false, left: false, right: false, speedUp: false, joystickMove: false },
                Direction.DOWN,
                movementConfig,
            ).direction,
        ).toBe(Direction.UP);
    });

    it("computes walking and running speed explicitly from config", () => {
        expect(getManualMovementSpeed(movementConfig, false)).toBe(9);
        expect(getManualMovementSpeed(movementConfig, true)).toBe(22.5);
    });

    it("detects manual input that cancels automatic path following", () => {
        expect(
            hasManualMovementInput({
                up: false,
                down: false,
                left: false,
                right: false,
                speedUp: true,
                joystickMove: false,
            }),
        ).toBe(false);
        expect(
            hasManualMovementInput({
                up: false,
                down: true,
                left: false,
                right: false,
                speedUp: false,
                joystickMove: false,
            }),
        ).toBe(true);
    });

    it("cancels the previous path for the same character", async () => {
        const service = pathfinder(openGrid());
        const first = service.findPathForCharacter("local", { x: 32, y: 32 }, { x: 160, y: 160 });
        const second = service.findPathForCharacter("local", { x: 32, y: 32 }, { x: 64, y: 64 });

        await expect(first).resolves.toMatchObject({ ok: false, code: "cancelled" });
        await expect(second).resolves.toMatchObject({ ok: true });
    });

    it("does not cancel sessions for different characters", async () => {
        const service = pathfinder(openGrid());
        const first = service.findPathForCharacter("local-a", { x: 32, y: 32 }, { x: 160, y: 160 });
        const second = service.findPathForCharacter("local-b", { x: 32, y: 32 }, { x: 64, y: 64 });

        await expect(first).resolves.toMatchObject({ ok: true });
        await expect(second).resolves.toMatchObject({ ok: true });
    });

    it("returns path_not_found for blocked targets", async () => {
        const grid = openGrid();
        grid[2][2] = PathTileType.Collider;
        await expect(pathfinder(grid).findPathForCharacter("local", { x: 32, y: 32 }, { x: 80, y: 80 })).resolves.toMatchObject({
            ok: false,
            code: "path_not_found",
        });
    });

    it("returns timeout when a session exceeds its calculation budget", async () => {
        await expect(
            pathfinder(openGrid()).findPathForCharacter("local", { x: 32, y: 32 }, { x: 160, y: 160 }, {
                maxCalculations: -1,
            }),
        ).resolves.toMatchObject({ ok: false, code: "timeout" });
    });

    it("returns invalid_target when the target is outside the map", async () => {
        await expect(
            pathfinder(openGrid()).findPathForCharacter("local", { x: 32, y: 32 }, { x: -1, y: -1 }),
        ).resolves.toMatchObject({ ok: false, code: "invalid_target" });
    });

    it("cancels one character without cancelling another", async () => {
        const service = pathfinder(openGrid());
        const first = service.findPathForCharacter("local-a", { x: 32, y: 32 }, { x: 160, y: 160 });
        const second = service.findPathForCharacter("local-b", { x: 32, y: 32 }, { x: 64, y: 64 });

        service.cancelCharacter("local-a");

        await expect(first).resolves.toMatchObject({ ok: false, code: "cancelled" });
        await expect(second).resolves.toMatchObject({ ok: true });
    });

    it("cancels all sessions on scene destroy", async () => {
        const service = pathfinder(openGrid());
        const first = service.findPathForCharacter("local-a", { x: 32, y: 32 }, { x: 160, y: 160 });
        const second = service.findPathForCharacter("local-b", { x: 32, y: 32 }, { x: 64, y: 64 });

        service.destroy();

        await expect(first).resolves.toMatchObject({ ok: false, code: "cancelled" });
        await expect(second).resolves.toMatchObject({ ok: false, code: "cancelled" });
    });

    it("keeps character snapshots JSON-serializable and free of runtime objects", () => {
        const snapshot: CharacterSnapshot = {
            id: "local",
            name: "Player",
            sceneId: "home",
            position: { x: 1, y: 2, direction: Direction.DOWN, moving: false },
            motionState: "idle",
        };

        expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
        expect(snapshot).not.toBeInstanceOf(Map);
        expect(snapshot).not.toBeInstanceOf(Set);
        expect(Object.values(snapshot).some((value) => value instanceof Element)).toBe(false);
    });

    it("stores, retrieves, lists and removes agent characters", () => {
        const repository = new AgentCharacterRepository();
        const character = fakeAgent(agentSnapshot("agent-a"));

        repository.add(character);

        expect(repository.has("agent-a")).toBe(true);
        expect(repository.get("agent-a")).toBe(character);
        expect(repository.listSnapshots()).toEqual([agentSnapshot("agent-a")]);
        expect(repository.remove("agent-a")).toBe(true);
        expect(repository.has("agent-a")).toBe(false);
    });

    it("rejects duplicate agent character ids", () => {
        const repository = new AgentCharacterRepository();
        repository.add(fakeAgent(agentSnapshot("agent-a")));

        expect(() => repository.add(fakeAgent(agentSnapshot("agent-a")))).toThrow(/already exists/);
    });

    it("returns pure agent snapshots from the repository", () => {
        const repository = new AgentCharacterRepository();
        repository.add(fakeAgent(agentSnapshot("agent-a")));

        const snapshots = repository.listSnapshots();

        expect(JSON.parse(JSON.stringify(snapshots))).toEqual(snapshots);
        expect(snapshots[0]).not.toBeInstanceOf(AgentCharacter);
        expect(Object.values(snapshots[0]).some((value) => value instanceof Map || value instanceof Set)).toBe(false);
    });

    it("faces an agent by cancelling movement and returning an idle snapshot", () => {
        const markDirty = vi.fn();
        const fake = {
            x: 32,
            y: 32,
            lastDirectionValue: Direction.DOWN,
            host: { markDirty },
            cancelMove: vi.fn(),
            stop: vi.fn(),
            emit: vi.fn(),
            getAgentSnapshot: vi.fn(() => agentSnapshot("agent-a")),
        } as unknown as AgentCharacter;

        const snapshot = AgentCharacter.prototype.face.call(fake, Direction.LEFT);

        expect(snapshot.kind).toBe("agent");
        expect(Reflect.get(fake, "lastDirectionValue")).toBe(Direction.LEFT);
        expect(Reflect.get(fake, "cancelMove")).toHaveBeenCalled();
        expect(Reflect.get(fake, "stop")).toHaveBeenCalled();
        expect(markDirty).toHaveBeenCalled();
    });

    it("stops an agent action and clears path execution", () => {
        const markDirty = vi.fn();
        const fake = {
            host: { markDirty },
            cancelMove: vi.fn(),
            stop: vi.fn(),
            getAgentSnapshot: vi.fn(() => agentSnapshot("agent-a")),
        } as unknown as AgentCharacter;

        const snapshot = AgentCharacter.prototype.stopAction.call(fake);

        expect(snapshot.kind).toBe("agent");
        expect(Reflect.get(fake, "cancelMove")).toHaveBeenCalled();
        expect(Reflect.get(fake, "stop")).toHaveBeenCalled();
        expect(markDirty).toHaveBeenCalled();
    });

    it("updates agent speech and clears it", () => {
        const speakFake = {
            say: vi.fn(),
            getAgentSnapshot: vi.fn(() => ({ ...agentSnapshot("agent-a"), motionState: "speaking" })),
        } as unknown as AgentCharacter;
        const clearFake = {
            clearBubble: vi.fn(),
            getAgentSnapshot: vi.fn(() => agentSnapshot("agent-a")),
        } as unknown as AgentCharacter;

        expect(AgentCharacter.prototype.speak.call(speakFake, "hello").motionState).toBe("speaking");
        expect(Reflect.get(speakFake, "say")).toHaveBeenCalledWith("hello", CharacterSayType.SpeechBubble);
        expect(AgentCharacter.prototype.clearSpeech.call(clearFake).motionState).toBe("idle");
        expect(Reflect.get(clearFake, "clearBubble")).toHaveBeenCalled();
    });

    it("returns scene_mismatch for spawning in another scene", async () => {
        const { controller, repository } = controllerContext();

        await expect(controller.spawn(agentDefinition({ sceneId: "office" }))).resolves.toMatchObject({
            ok: false,
            code: "scene_mismatch",
        });
        expect(repository.listSnapshots()).toEqual([]);
    });

    it("returns spawn_blocked for blocked spawn tiles", async () => {
        const grid = openGrid();
        grid[1][1] = PathTileType.Collider;
        const { controller, repository } = controllerContext({ grid });

        await expect(controller.spawn(agentDefinition({ spawnPosition: { x: 32, y: 32, direction: Direction.DOWN, moving: false } }))).resolves.toMatchObject({
            ok: false,
            code: "spawn_blocked",
        });
        expect(repository.listSnapshots()).toEqual([]);
    });

    it("destroys a half-created agent when texture loading fails", async () => {
        const character = fakeAgent(agentSnapshot("agent-a"));
        const destroy = vi.spyOn(character, "destroy");
        const failingCharacter = {
            ...character,
            ready: () =>
                Promise.reject(
                    new StandaloneCharacterReadyError("texture_load_failed", "Failed loading agent texture"),
                ),
        } as unknown as AgentCharacter;
        const { controller, repository, createdColliders } = controllerContext({
            createAgentCharacter: () => failingCharacter,
        });

        await expect(controller.spawn(agentDefinition())).resolves.toMatchObject({
            ok: false,
            code: "texture_load_failed",
        });
        expect(destroy).toHaveBeenCalled();
        expect(repository.listSnapshots()).toEqual([]);
        expect(createdColliders).toEqual([failingCharacter]);
    });

    it("returns character_not_found for missing agents", () => {
        const { controller } = controllerContext();

        expect(controller.stop("missing")).toMatchObject({ ok: false, code: "character_not_found" });
    });

    it("immediately cancels the previous moveTo for the same agent", async () => {
        const path = controllablePathfinder();
        const repository = new AgentCharacterRepository();
        const character = fakeAgent(agentSnapshot("agent-a"));
        repository.add(character);
        const { controller } = controllerContext({ repository, pathfinder: path.pathfinder });

        const first = controller.moveTo("agent-a", { x: 96, y: 96 });
        const second = controller.moveTo("agent-a", { x: 128, y: 128 });

        path.resolve("agent-a", { ok: true, path: [{ x: 32, y: 32 }, { x: 128, y: 128 }] });

        await expect(first).resolves.toMatchObject({ ok: false, code: "cancelled" });
        await expect(second).resolves.toMatchObject({ ok: true });
        expect(path.cancelCharacter).toHaveBeenCalledWith("agent-a");
        expect(vi.mocked(character.stopAction)).toHaveBeenCalledTimes(2);
    });

    it("allows two agents to move concurrently without cancelling each other", async () => {
        const path = controllablePathfinder();
        const repository = new AgentCharacterRepository();
        repository.add(fakeAgent(agentSnapshot("agent-a")));
        repository.add(fakeAgent(agentSnapshot("agent-b")));
        const { controller } = controllerContext({ repository, pathfinder: path.pathfinder });

        const first = controller.moveTo("agent-a", { x: 96, y: 96 });
        const second = controller.moveTo("agent-b", { x: 128, y: 128 });
        path.resolve("agent-a", { ok: true, path: [{ x: 32, y: 32 }, { x: 96, y: 96 }] });
        path.resolve("agent-b", { ok: true, path: [{ x: 32, y: 32 }, { x: 128, y: 128 }] });

        await expect(first).resolves.toMatchObject({ ok: true });
        await expect(second).resolves.toMatchObject({ ok: true });
        expect(path.cancelCharacter).toHaveBeenCalledWith("agent-a");
        expect(path.cancelCharacter).toHaveBeenCalledWith("agent-b");
    });

    it("stop cancels pathfinding and current path execution", () => {
        const path = controllablePathfinder();
        const repository = new AgentCharacterRepository();
        const character = fakeAgent(agentSnapshot("agent-a"));
        repository.add(character);
        const { controller } = controllerContext({ repository, pathfinder: path.pathfinder });

        expect(controller.stop("agent-a")).toMatchObject({ ok: true });
        expect(path.cancelCharacter).toHaveBeenCalledWith("agent-a");
        expect(vi.mocked(character.stopAction)).toHaveBeenCalled();
    });

    it("remove cancels pending actions and destroys the agent", () => {
        const path = controllablePathfinder();
        const repository = new AgentCharacterRepository();
        const character = fakeAgent(agentSnapshot("agent-a"));
        repository.add(character);
        const { controller } = controllerContext({ repository, pathfinder: path.pathfinder });

        expect(controller.remove("agent-a")).toMatchObject({ ok: true });
        expect(path.cancelCharacter).toHaveBeenCalledWith("agent-a");
        expect(vi.mocked(character.stopAction)).toHaveBeenCalled();
        expect(vi.mocked(character.destroy)).toHaveBeenCalled();
        expect(controller.stop("agent-a")).toMatchObject({ ok: false, code: "character_not_found" });
    });

    it("scene destroy clears every agent", () => {
        const path = controllablePathfinder();
        const repository = new AgentCharacterRepository();
        const first = fakeAgent(agentSnapshot("agent-a"));
        const second = fakeAgent(agentSnapshot("agent-b"));
        repository.add(first);
        repository.add(second);
        const { controller } = controllerContext({ repository, pathfinder: path.pathfinder });

        controller.destroy();

        expect(path.cancelAll).toHaveBeenCalled();
        expect(repository.listSnapshots()).toEqual([]);
        expect(vi.mocked(first.destroy)).toHaveBeenCalled();
        expect(vi.mocked(second.destroy)).toHaveBeenCalled();
    });

    it("agent snapshots are JSON-serializable", () => {
        const snapshot = agentSnapshot("agent-a");

        expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
    });

    it("controller results do not expose Phaser objects", async () => {
        const { controller } = controllerContext({ createAgentCharacter: () => fakeAgent(agentSnapshot("agent-a")) });
        const result = await controller.spawn(agentDefinition());

        expect(result.ok).toBe(true);
        expect(JSON.parse(JSON.stringify(result))).toEqual(result);
        expect(result).not.toHaveProperty("value.body");
        expect(result).not.toBeInstanceOf(AgentCharacter);
    });
});
