import * as Phaser from "phaser";
import { CharacterSayType, type CharacterSayType as CharacterSayTypeValue } from "@workadventure/game-model";
import { CHARACTER_BODY_HEIGHT } from "./CharacterBodyMetrics";

export class CharacterBubblePresentation {
    private bubble: Phaser.GameObjects.DOMElement | undefined;

    public constructor(private readonly scene: Phaser.Scene, private readonly parent: Phaser.GameObjects.Container) {}

    public say(text: string, type: CharacterSayTypeValue): void {
        this.clear();
        if (!text) {
            return;
        }
        const element = type === CharacterSayType.ThinkingCloud ? this.createThinkingElement(text) : this.createSpeechElement(text);
        this.bubble = new Phaser.GameObjects.DOMElement(
            this.scene,
            0,
            type === CharacterSayType.ThinkingCloud ? 0 - CHARACTER_BODY_HEIGHT / 2 - 70 : 0 - CHARACTER_BODY_HEIGHT / 2 - 50,
            element,
        );
        this.parent.add(this.bubble);
    }

    public clear(): void {
        this.bubble?.destroy();
        this.bubble = undefined;
    }

    public destroy(): void {
        this.clear();
    }

    private createSpeechElement(text: string): HTMLDivElement {
        const element = document.createElement("div");
        element.textContent = text;
        element.className = "standalone-character-speech-bubble";
        element.style.padding = "4px 12px";
        element.style.borderRadius = "999px";
        element.style.background = "rgba(255, 255, 255, 0.85)";
        element.style.color = "#111";
        element.style.fontSize = "11px";
        element.style.maxWidth = "180px";
        element.style.wordBreak = "break-word";
        return element;
    }

    private createThinkingElement(text: string): HTMLDivElement {
        const element = document.createElement("div");
        element.textContent = text;
        element.className = "standalone-character-thinking-bubble";
        element.style.padding = "10px 14px";
        element.style.borderRadius = "14px";
        element.style.background = "rgba(255, 255, 255, 0.85)";
        element.style.color = "#111";
        element.style.fontSize = "11px";
        element.style.maxWidth = "200px";
        element.style.wordBreak = "break-word";
        return element;
    }
}
