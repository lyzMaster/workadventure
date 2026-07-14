import type { AgentCharacterSnapshot, CharacterId } from "@workadventure/game-model";
import type { AgentCharacter } from "./AgentCharacter";

export class AgentCharacterRepository {
    private readonly characters = new Map<CharacterId, AgentCharacter>();

    public add(character: AgentCharacter): void {
        if (this.characters.has(character.id)) {
            throw new Error(`Agent character "${character.id}" already exists`);
        }
        this.characters.set(character.id, character);
    }

    public has(characterId: CharacterId): boolean {
        return this.characters.has(characterId);
    }

    public get(characterId: CharacterId): AgentCharacter | undefined {
        return this.characters.get(characterId);
    }

    public listSnapshots(): AgentCharacterSnapshot[] {
        return [...this.characters.values()].map((character) => character.getAgentSnapshot());
    }

    public update(delta: number): void {
        for (const character of this.characters.values()) {
            character.update(delta);
        }
    }

    public remove(characterId: CharacterId): boolean {
        const character = this.characters.get(characterId);
        if (!character) {
            return false;
        }
        this.characters.delete(characterId);
        character.destroy();
        return true;
    }

    public clear(): void {
        for (const character of this.characters.values()) {
            character.destroy();
        }
        this.characters.clear();
    }
}
