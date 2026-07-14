import type {
    AgentActionResult,
    AgentCharacterDefinition,
    AgentCharacterSnapshot,
    CharacterSayType,
    Direction,
} from "@workadventure/game-model";
import type { AgentCharacterController, AgentMoveToOptions } from "../characters/AgentCharacterController";
import type { AgentCommandAdapter } from "./types";

export class StandaloneAgentCommandAdapter implements AgentCommandAdapter {
    public constructor(private readonly controller: AgentCharacterController) {}

    public spawn(
        definition: AgentCharacterDefinition,
        options?: { signal?: AbortSignal },
    ): Promise<AgentActionResult<AgentCharacterSnapshot>> {
        return this.controller.spawn(definition, options);
    }

    public list(): AgentActionResult<AgentCharacterSnapshot[]> {
        return this.controller.list();
    }

    public getState(characterId: string): AgentActionResult<AgentCharacterSnapshot> {
        return this.controller.getState(characterId);
    }

    public moveTo(
        characterId: string,
        target: { x: number; y: number },
        options?: AgentMoveToOptions,
    ): Promise<AgentActionResult<AgentCharacterSnapshot>> {
        return this.controller.moveTo(characterId, target, options);
    }

    public stop(characterId: string): AgentActionResult<AgentCharacterSnapshot> {
        return this.controller.stop(characterId);
    }

    public face(characterId: string, direction: Direction): AgentActionResult<AgentCharacterSnapshot> {
        return this.controller.face(characterId, direction);
    }

    public speak(
        characterId: string,
        text: string,
        type?: CharacterSayType,
    ): AgentActionResult<AgentCharacterSnapshot> {
        return this.controller.speak(characterId, text, type);
    }

    public clearSpeech(characterId: string): AgentActionResult<AgentCharacterSnapshot> {
        return this.controller.clearSpeech(characterId);
    }

    public remove(characterId: string): AgentActionResult<AgentCharacterSnapshot> {
        return this.controller.remove(characterId);
    }

    public cancelMove(characterId: string): void {
        this.controller.stop(characterId);
    }
}
