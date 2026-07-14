import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppWorldRepository } from "../../../src/standalone/world/AppWorldRepository";
import type { AppWorldStorage } from "../../../src/standalone/world/AppWorldStorage";

class MemoryAppWorldStorage implements AppWorldStorage {
    public snapshots = new Map<string, unknown>();
    public failSaves = false;

    public async load(worldId: string) {
        return (this.snapshots.get(worldId) as never) ?? null;
    }

    public async save(worldId: string, snapshot: unknown): Promise<void> {
        if (this.failSaves) {
            throw new Error("save failed");
        }
        this.snapshots.set(worldId, structuredClone(snapshot));
    }

    public async clear(worldId: string): Promise<void> {
        this.snapshots.delete(worldId);
    }
}

function createSnapshot() {
    return {
        schemaVersion: 1 as const,
        worldId: "standalone-default-world",
        revision: 0,
        activeSceneId: "home",
        scenes: {
            home: {
                sceneId: "home",
                baseMapId: "standalone-home",
                baseMapRevision: 1,
                agents: {},
            },
        },
        updatedAt: "2026-07-14T00:00:00.000Z",
    };
}

describe("AppWorldRepository", () => {
    let storage: MemoryAppWorldStorage;
    let repository: AppWorldRepository;

    beforeEach(() => {
        vi.useFakeTimers();
        storage = new MemoryAppWorldStorage();
        repository = new AppWorldRepository(storage, "standalone-default-world", {
            debounceMs: 100,
            now: () => new Date("2026-07-14T00:00:00.000Z"),
        });
        repository.initialize(createSnapshot());
    });

    it("tracks dirty state, revision and active scene updates", async () => {
        repository.setActiveScene("office");
        expect(repository.getPersistenceState()).toMatchObject({ dirty: true, revision: 0 });

        await repository.flush();
        expect(repository.getPersistenceState()).toMatchObject({
            dirty: false,
            revision: 1,
            lastSavedAt: "2026-07-14T00:00:00.000Z",
        });
        expect((await storage.load("standalone-default-world"))?.activeSceneId).toBe("office");
    });

    it("updates player and agents under the target scene", async () => {
        repository.updatePlayer(
            { sceneId: "home", baseMapId: "standalone-home", baseMapRevision: 1 },
            {
                position: { x: 64, y: 96, direction: "left" },
                updatedAt: "2026-07-14T00:00:00.000Z",
            },
        );
        repository.upsertAgent(
            { sceneId: "home", baseMapId: "standalone-home", baseMapRevision: 1 },
            {
                characterId: "agent-a",
                name: "Agent A",
                sceneId: "home",
                appearance: { textures: [{ id: "body-01", assetPath: "/resources/characters/body-01.png", layer: 0 }] },
                movementConfig: { walkingSpeed: 9, runningMultiplier: 2.5 },
                position: { x: 128, y: 160, direction: "down" },
                updatedAt: "2026-07-14T00:00:00.000Z",
            },
        );
        repository.removeAgent(
            { sceneId: "home", baseMapId: "standalone-home", baseMapRevision: 1 },
            "missing-agent",
        );

        const snapshot = repository.getSnapshot();
        expect(snapshot?.scenes.home.player?.position).toEqual({ x: 64, y: 96, direction: "left" });
        expect(snapshot?.scenes.home.agents["agent-a"]?.position).toEqual({ x: 128, y: 160, direction: "down" });
    });

    it("debounces saves and serializes concurrent writes", async () => {
        repository.setActiveScene("office");
        repository.updatePlayer(
            { sceneId: "home", baseMapId: "standalone-home", baseMapRevision: 1 },
            {
                position: { x: 96, y: 96, direction: "down" },
                updatedAt: "2026-07-14T00:00:00.000Z",
            },
        );

        expect(storage.snapshots.size).toBe(0);
        await vi.advanceTimersByTimeAsync(100);
        await repository.flush();

        expect(storage.snapshots.size).toBe(1);
        expect((await storage.load("standalone-default-world"))).toMatchObject({
            activeSceneId: "office",
            revision: 1,
        });
    });

    it("stays dirty when save fails and can retry successfully", async () => {
        repository.setActiveScene("office");
        storage.failSaves = true;

        await repository.flush();
        expect(repository.getPersistenceState()).toMatchObject({
            dirty: true,
            revision: 0,
            lastError: { code: "persistence_failed", message: "save failed" },
        });

        storage.failSaves = false;
        await repository.retry();
        expect(repository.getPersistenceState()).toMatchObject({
            dirty: false,
            revision: 1,
            lastError: undefined,
        });
    });
});
