import type {
    AgentActionResult,
    AgentCharacterDefinition,
    AgentCharacterSnapshot,
    CharacterId,
    CharacterSayType,
    Direction,
} from "@workadventure/game-model";
import type { AgentMoveToOptions } from "../characters/AgentCharacterController";
import type { StandaloneGameScene } from "./StandaloneGameScene";

type AgentDebugApi = {
    spawn(definition: AgentCharacterDefinition): Promise<AgentActionResult<AgentCharacterSnapshot>>;
    list(): AgentActionResult<AgentCharacterSnapshot[]>;
    getState(characterId: CharacterId): AgentActionResult<AgentCharacterSnapshot>;
    moveTo(
        characterId: CharacterId,
        target: { x: number; y: number },
        options?: AgentMoveToOptions,
    ): Promise<AgentActionResult<AgentCharacterSnapshot>>;
    stop(characterId: CharacterId): AgentActionResult<AgentCharacterSnapshot>;
    face(characterId: CharacterId, direction: Direction): AgentActionResult<AgentCharacterSnapshot>;
    speak(
        characterId: CharacterId,
        text: string,
        type?: CharacterSayType,
    ): AgentActionResult<AgentCharacterSnapshot>;
    clearSpeech(characterId: CharacterId): AgentActionResult<AgentCharacterSnapshot>;
    remove(characterId: CharacterId): AgentActionResult<AgentCharacterSnapshot>;
};

declare global {
    interface Window {
        agentDebug?: AgentDebugApi;
    }
}

export function installAgentDebugBridge(scene: StandaloneGameScene): { destroy(): void } {
    const controller = scene.getAgentController();
    window.agentDebug = {
        spawn: async (definition) => toJson(await controller.spawn(definition)),
        list: () => toJson(controller.list()),
        getState: (characterId) => toJson(controller.getState(characterId)),
        moveTo: async (characterId, target, options) => toJson(await controller.moveTo(characterId, target, options)),
        stop: (characterId) => toJson(controller.stop(characterId)),
        face: (characterId, direction) => toJson(controller.face(characterId, direction)),
        speak: (characterId, text, type) => toJson(controller.speak(characterId, text, type)),
        clearSpeech: (characterId) => toJson(controller.clearSpeech(characterId)),
        remove: (characterId) => toJson(controller.remove(characterId)),
    };

    return {
        destroy() {
            delete window.agentDebug;
        },
    };
}

function toJson<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}
