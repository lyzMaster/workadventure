import { resolveStandaloneSceneDefinition } from "./StandaloneSceneRegistry";
import type { StandaloneSceneDefinition, StandaloneSceneId } from "./StandaloneSceneDefinition";

export interface StandaloneSceneContext {
    sceneId: StandaloneSceneId;
    sceneKey: string;
    wamUrl: string;
    baseMapId: string;
    baseMapRevision: number;
    defaultSpawn?: { x: number; y: number; direction?: "up" | "right" | "down" | "left" };
}

export interface ResolvedStandaloneScene {
    context: StandaloneSceneContext;
    definition: StandaloneSceneDefinition;
}

export class StandaloneSceneResolver {
    public resolve(sceneId: StandaloneSceneId | string): ResolvedStandaloneScene {
        const definition = resolveStandaloneSceneDefinition(sceneId);
        return {
            definition,
            context: {
                sceneId: definition.sceneId,
                sceneKey: `standalone-${definition.sceneId}`,
                wamUrl: new URL(definition.wamUrl, window.location.href).toString(),
                baseMapId: definition.baseMapId,
                baseMapRevision: definition.baseMapRevision,
                defaultSpawn: definition.defaultSpawn,
            },
        };
    }
}
