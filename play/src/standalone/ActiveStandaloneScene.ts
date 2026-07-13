import {
    DEFAULT_STANDALONE_SCENE_ID,
    isStandaloneSceneId,
    resolveStandaloneSceneDefinition,
} from "./StandaloneSceneRegistry";
import type { StandaloneSceneId } from "./StandaloneSceneDefinition";

export const ACTIVE_STANDALONE_SCENE_STORAGE_KEY = "workadventure-standalone.active-scene";

export function resolveInitialStandaloneSceneId(
    location: Location,
    storage: Pick<Storage, "getItem">,
): StandaloneSceneId {
    const querySceneId = new URL(location.href).searchParams.get("scene");
    if (querySceneId !== null) {
        return resolveStandaloneSceneDefinition(querySceneId).sceneId;
    }

    const storedSceneId = storage.getItem(ACTIVE_STANDALONE_SCENE_STORAGE_KEY);
    if (isStandaloneSceneId(storedSceneId)) {
        return storedSceneId;
    }
    if (storedSceneId) {
        console.warn(
            `[Standalone] scene_not_found: stored sceneId "${storedSceneId}" is invalid, falling back to ${DEFAULT_STANDALONE_SCENE_ID}`,
        );
    }
    return DEFAULT_STANDALONE_SCENE_ID;
}

export function saveActiveStandaloneSceneId(sceneId: StandaloneSceneId, storage: Pick<Storage, "setItem">): void {
    storage.setItem(ACTIVE_STANDALONE_SCENE_STORAGE_KEY, sceneId);
}
