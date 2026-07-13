import { describe, expect, it } from "vitest";
import {
    ACTIVE_STANDALONE_SCENE_STORAGE_KEY,
    resolveInitialStandaloneSceneId,
    saveActiveStandaloneSceneId,
} from "../../../src/standalone/ActiveStandaloneScene";

class MemoryStorage implements Pick<Storage, "getItem" | "setItem"> {
    public values = new Map<string, string>();

    public getItem(key: string): string | null {
        return this.values.get(key) ?? null;
    }

    public setItem(key: string, value: string): void {
        this.values.set(key, value);
    }
}

function locationFor(url: string): Location {
    return new URL(url) as unknown as Location;
}

describe("ActiveStandaloneScene", () => {
    it("saves and restores the active sceneId", () => {
        const storage = new MemoryStorage();

        saveActiveStandaloneSceneId("office", storage);

        expect(storage.getItem(ACTIVE_STANDALONE_SCENE_STORAGE_KEY)).toBe("office");
        expect(resolveInitialStandaloneSceneId(locationFor("https://example.test/standalone.html"), storage)).toBe(
            "office",
        );
    });

    it("prefers the URL query scene over localStorage", () => {
        const storage = new MemoryStorage();
        storage.setItem(ACTIVE_STANDALONE_SCENE_STORAGE_KEY, "home");

        expect(
            resolveInitialStandaloneSceneId(locationFor("https://example.test/standalone.html?scene=office"), storage),
        ).toBe("office");
    });

    it("falls back to home for invalid values", () => {
        const storage = new MemoryStorage();
        storage.setItem(ACTIVE_STANDALONE_SCENE_STORAGE_KEY, "missing");

        expect(resolveInitialStandaloneSceneId(locationFor("https://example.test/standalone.html"), storage)).toBe(
            "home",
        );
        expect(
            resolveInitialStandaloneSceneId(locationFor("https://example.test/standalone.html?scene=bad"), storage),
        ).toBe("home");
    });
});
