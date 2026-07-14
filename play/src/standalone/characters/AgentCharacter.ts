import {
    CharacterSayType,
    type AgentCharacterSnapshot,
    type Direction,
} from "@workadventure/game-model";
import { characterMovedEventName } from "./CharacterEvents";
import type { CharacterRuntimeHost } from "./CharacterRuntimeHost";
import { StandaloneCharacter, type StandaloneCharacterOptions } from "./StandaloneCharacter";

export type AgentCharacterOptions = StandaloneCharacterOptions;

export class AgentCharacter extends StandaloneCharacter {
    public constructor(host: CharacterRuntimeHost, options: AgentCharacterOptions) {
        super(host, options);
    }

    public update(delta: number): void {
        this.updatePath(delta);
    }

    public face(direction: Direction): AgentCharacterSnapshot {
        this.cancelMove();
        this.lastDirectionValue = direction;
        this.stop();
        this.emit(characterMovedEventName, {
            moving: false,
            direction,
            x: this.x,
            y: this.y,
        });
        this.host.markDirty();
        return this.getAgentSnapshot();
    }

    public stopAction(): AgentCharacterSnapshot {
        this.cancelMove();
        this.stop();
        this.host.markDirty();
        return this.getAgentSnapshot();
    }

    public speak(text: string, type: CharacterSayType = CharacterSayType.SpeechBubble): AgentCharacterSnapshot {
        this.say(text, type);
        return this.getAgentSnapshot();
    }

    public clearSpeech(): AgentCharacterSnapshot {
        this.clearBubble();
        return this.getAgentSnapshot();
    }

    public getAgentSnapshot(): AgentCharacterSnapshot {
        return {
            ...this.getSnapshot(),
            kind: "agent",
        };
    }
}
