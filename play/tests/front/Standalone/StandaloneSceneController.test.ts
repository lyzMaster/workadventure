import type { WAMFileFormat } from "@workadventure/map-editor";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GameScene } from "../../../src/front/Phaser/Game/GameScene";
import type { StandaloneApp } from "../../../src/standalone/StandaloneApp";
import { DefaultStandaloneSceneController } from "../../../src/standalone/StandaloneSceneController";
import type { SceneOverlay } from "../../../src/standalone/SceneOverlay";
import type { SceneStorage } from "../../../src/standalone/SceneStorage";

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

function createDeferred(): { promise: Promise<void>; resolve: () => void } {
    let resolve!: () => void;
    const promise = new Promise<void>((innerResolve) => {
        resolve = innerResolve;
    });
    return { promise, resolve };
}

function createScene(flush: () => Promise<void>): GameScene {
    return {
        getMapEditorModeManager: () => ({ flush }),
        flushPersistence: flush,
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
        const scenes = [createScene(() => flush.promise), createScene(() => Promise.resolve())];
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
        const startScene = vi.fn(() => createScene(() => Promise.resolve()));
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
        );

        await controller.start();
        await Promise.all([controller.switchTo("office"), controller.switchTo("home")]);

        expect(controller.getActiveSceneId()).toBe("home");
        expect(startScene).toHaveBeenCalledTimes(3);
    });
});
