import type { StandaloneSceneDefinition, StandaloneSceneId } from "./StandaloneSceneDefinition";

export const DEFAULT_STANDALONE_SCENE_ID: StandaloneSceneId = "home";

export const standaloneSceneRegistry: Record<StandaloneSceneId, StandaloneSceneDefinition> = {
    home: {
        sceneId: "home",
        displayName: "Home",
        baseMapId: "standalone-home",
        baseMapRevision: 1,
        wamUrl: "/maps/home/home.wam",
        defaultSpawn: { x: 256, y: 192, direction: "down" },
    },
    office: {
        sceneId: "office",
        displayName: "Office",
        baseMapId: "standalone-office",
        baseMapRevision: 1,
        wamUrl: "/maps/office/office.wam",
        defaultSpawn: { x: 256, y: 192, direction: "down" },
    },
};

export function isStandaloneSceneId(value: string | null | undefined): value is StandaloneSceneId {
    return value === "home" || value === "office";
}

export function resolveStandaloneSceneDefinition(sceneId: string | null | undefined): StandaloneSceneDefinition {
    if (isStandaloneSceneId(sceneId)) {
        return standaloneSceneRegistry[sceneId];
    }
    if (sceneId) {
        console.warn(`[Standalone] scene_not_found: unknown sceneId "${sceneId}", falling back to home`);
    }
    return standaloneSceneRegistry[DEFAULT_STANDALONE_SCENE_ID];
}

export function getStandaloneSceneDefinitions(): StandaloneSceneDefinition[] {
    return Object.values(standaloneSceneRegistry);
}
