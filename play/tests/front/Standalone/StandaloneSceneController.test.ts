import type { WAMFileFormat } from "@workadventure/map-editor";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GameScene } from "../../../src/front/Phaser/Game/GameScene";
import type { StandaloneApp } from "../../../src/standalone/StandaloneApp";
import { DefaultStandaloneSceneController } from "../../../src/standalone/StandaloneSceneController";
import type { SceneOverlay } from "../../../src/standalone/SceneOverlay";
import type { SceneStorage } from "../../../src/standalone/SceneStorage";
import type { AppWorldStorage } from "../../../src/standalone/world/AppWorldStorage";

class MemoryStorage implements SceneStorage {
    public overlays = new Map<string, SceneOverlay>();

    public loadOverlay(sceneId: string): Promise<SceneOverlay | null> {
        return Promise.resolve(this.overlays.get(sceneId) ?? null);
    }

    public saveOverlay(sceneId: string, overlay: SceneOverlay): Promise<void> {
        this.overlays.set(sceneId, overlay);
        return Promise.resolve();
    }

    public clearOverlay(sceneId: string): Promise<void> {
        this.overlays.delete(sceneId);
        return Promise.resolve();
    }
}

class MemoryLocalStorage implements Storage {
    public values = new Map<string, string>();

    public get length(): number {
        return this.values.size;
    }

    public clear(): void {
        this.values.clear();
    }

    public getItem(key: string): string | null {
        return this.values.get(key) ?? null;
    }

    public key(index: number): string | null {
        return Array.from(this.values.keys())[index] ?? null;
    }

    public removeItem(key: string): void {
        this.values.delete(key);
    }

    public setItem(key: string, value: string): void {
        this.values.set(key, value);
    }
}

class MemoryAppWorldStorage implements AppWorldStorage {
    public snapshots = new Map<string, unknown>();

    public load(worldId: string): Promise<any> {
        return Promise.resolve(this.snapshots.get(worldId) ?? null);
    }

    public save(worldId: string, snapshot: unknown): Promise<void> {
        this.snapshots.set(worldId, structuredClone(snapshot));
        return Promise.resolve();
    }

    public clear(worldId: string): Promise<void> {
        this.snapshots.delete(worldId);
        return Promise.resolve();
    }
}

function createDeferred(): { promise: Promise<void>; resolve: () => void } {
    let resolve!: () => void;
    const promise = new Promise<void>((innerResolve) => {
        resolve = innerResolve;
    });
    return { promise, resolve };
}

function createScene(sceneId: "home" | "office", flush: () => Promise<void>): GameScene {
    return {
        sceneId,
        sceneReadyToStartPromise: Promise.resolve(),
        getMapEditorModeManager: () => ({ flush }),
        flushPersistence: flush,
        getPlayerSnapshot: () => null,
        listAgentSnapshots: () => [],
        restorePlayer: () =>
            Promise.resolve({
                applied: false,
                code: "missing_player_state",
                message: "No persisted player state",
            }),
        restoreAgents: () => Promise.resolve([]),
        flushSceneOverlay: flush,
    } as unknown as GameScene;
}

function locationFor(url: string): Location {
    return new URL(url) as unknown as Location;
}

function createWam(mapUrl: string): WAMFileFormat {
    return {
        version: "2.1.0",
        mapUrl,
        entities: {},
        areas: [],
        entityCollections: [],
    };
}

describe("StandaloneSceneController", () => {
    beforeEach(() => {
        vi.stubGlobal(
            "fetch",
            vi.fn((input: URL | RequestInfo) => {
                const url = input instanceof URL ? input.toString() : typeof input === "string" ? input : input.url;
                if (url.endsWith(".wam")) {
                    return Promise.resolve({
                        ok: true,
                        url,
                        json: () => Promise.resolve(createWam(url.replace(/\.wam$/, ".tmj"))),
                    });
                }
                return Promise.resolve({ ok: true, url, json: () => Promise.resolve({}) });
            }),
        );
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("waits for persistence flush before switching scenes", async () => {
        const flush = createDeferred();
        const scenes = [createScene("home", () => flush.promise), createScene("office", () => Promise.resolve())];
        const mountEditor = vi.fn();
        const destroyGame = vi.fn(() => Promise.resolve());
        const startScene = vi.fn(() => scenes.shift());
        const app = {
            mountEditor,
            destroyGame,
            startScene,
        } as unknown as StandaloneApp;
        const controller = new DefaultStandaloneSceneController(
            undefined,
            undefined,
            undefined,
            app,
            new MemoryStorage(),
            locationFor("https://example.test/standalone.html"),
            new MemoryLocalStorage(),
            new MemoryAppWorldStorage(),
        );

        await controller.start();
        const switchPromise = controller.switchTo("office");
        await Promise.resolve();

        expect(controller.getActiveSceneId()).toBe("home");
        expect(startScene).toHaveBeenCalledTimes(1);

        flush.resolve();
        await switchPromise;

        expect(controller.getActiveSceneId()).toBe("office");
        expect(destroyGame).toHaveBeenCalledTimes(2);
        expect(startScene).toHaveBeenCalledTimes(2);
    });

    it("serializes rapid scene switches", async () => {
        const mountEditor = vi.fn();
        const destroyGame = vi.fn(() => Promise.resolve());
        const startScene = vi.fn((context: { sceneId: "home" | "office" }) =>
            createScene(context.sceneId, () => Promise.resolve()),
        );
        const app = {
            mountEditor,
            destroyGame,
            startScene,
        } as unknown as StandaloneApp;
        const controller = new DefaultStandaloneSceneController(
            undefined,
            undefined,
            undefined,
            app,
            new MemoryStorage(),
            locationFor("https://example.test/standalone.html"),
            new MemoryLocalStorage(),
            new MemoryAppWorldStorage(),
        );

        await controller.start();
        await Promise.all([controller.switchTo("office"), controller.switchTo("home")]);

        expect(controller.getActiveSceneId()).toBe("home");
        expect(startScene).toHaveBeenCalledTimes(3);
    });

    it("prefers URL scene over AppWorld and legacy localStorage", async () => {
        const startScene = vi.fn((context: { sceneId: "home" | "office" }) =>
            createScene(context.sceneId, () => Promise.resolve()),
        );
        const app = {
            mountEditor: vi.fn(),
            destroyGame: vi.fn(() => Promise.resolve()),
            startScene,
        } as unknown as StandaloneApp;
        const localStorage = new MemoryLocalStorage();
        localStorage.setItem("workadventure-standalone.active-scene", "office");
        const appWorldStorage = new MemoryAppWorldStorage();
        appWorldStorage.snapshots.set("standalone-default-world", {
            schemaVersion: 1,
            worldId: "standalone-default-world",
            revision: 3,
            activeSceneId: "office",
            scenes: {},
            updatedAt: "2026-07-14T00:00:00.000Z",
        });
        const controller = new DefaultStandaloneSceneController(
            undefined,
            undefined,
            undefined,
            app,
            new MemoryStorage(),
            locationFor("https://example.test/standalone.html?scene=home"),
            localStorage,
            appWorldStorage,
        );

        await controller.start();

        expect(controller.getActiveSceneId()).toBe("home");
        expect(startScene).toHaveBeenCalledTimes(1);
    });

    it("migrates legacy localStorage active scene into a new AppWorld snapshot", async () => {
        const startScene = vi.fn((context: { sceneId: "home" | "office" }) =>
            createScene(context.sceneId, () => Promise.resolve()),
        );
        const app = {
            mountEditor: vi.fn(),
            destroyGame: vi.fn(() => Promise.resolve()),
            startScene,
        } as unknown as StandaloneApp;
        const localStorage = new MemoryLocalStorage();
        localStorage.setItem("workadventure-standalone.active-scene", "office");
        const appWorldStorage = new MemoryAppWorldStorage();
        const controller = new DefaultStandaloneSceneController(
            undefined,
            undefined,
            undefined,
            app,
            new MemoryStorage(),
            locationFor("https://example.test/standalone.html"),
            localStorage,
            appWorldStorage,
        );

        await controller.start();

        expect(appWorldStorage.snapshots.get("standalone-default-world")).toMatchObject({
            activeSceneId: "office",
        });
        expect(controller.getActiveSceneId()).toBe("office");
    });
});
