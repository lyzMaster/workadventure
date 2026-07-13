import { describe, expect, it, vi } from "vitest";
import {
    resolveStandaloneSceneDefinition,
    standaloneSceneRegistry,
} from "../../../src/standalone/StandaloneSceneRegistry";

describe("StandaloneSceneRegistry", () => {
    it("resolves home", () => {
        expect(resolveStandaloneSceneDefinition("home")).toEqual(standaloneSceneRegistry.home);
    });

    it("resolves office", () => {
        expect(resolveStandaloneSceneDefinition("office")).toEqual(standaloneSceneRegistry.office);
    });

    it("falls back to home for an invalid sceneId", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

        expect(resolveStandaloneSceneDefinition("missing")).toEqual(standaloneSceneRegistry.home);
        expect(warn).toHaveBeenCalledWith(expect.stringContaining("scene_not_found"));

        warn.mockRestore();
    });
});
