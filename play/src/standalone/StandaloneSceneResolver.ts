import { MapDetail, Room } from "../front/Connection/Room";
import { resolveStandaloneSceneDefinition } from "./StandaloneSceneRegistry";
import type { StandaloneSceneDefinition, StandaloneSceneId } from "./StandaloneSceneDefinition";

export interface ResolvedStandaloneScene {
    room: Room;
    definition: StandaloneSceneDefinition;
}

export class StandaloneSceneResolver {
    public resolve(sceneId: StandaloneSceneId | string): ResolvedStandaloneScene {
        const definition = resolveStandaloneSceneDefinition(sceneId);
        const roomUrl = new URL(`/standalone/${definition.sceneId}?alone=true`, window.location.origin);

        return {
            definition,
            room: Room.createResolvedRoom(
                roomUrl,
                new MapDetail(undefined, new URL(definition.wamUrl, window.location.href).toString()),
                {
                    skipCameraPage: true,
                    enableChat: false,
                },
            ),
        };
    }
}
