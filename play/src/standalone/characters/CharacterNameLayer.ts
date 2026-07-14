import * as Phaser from "phaser";
import { DEPTH_INGAME_TEXT_INDEX } from "../../front/Phaser/Game/DepthIndexes";

const NAME_Y_OFFSET = -18;

export class CharacterNameLayer {
    private readonly container: HTMLDivElement;
    private readonly domElement: Phaser.GameObjects.DOMElement;

    public constructor(scene: Phaser.Scene) {
        this.container = document.createElement("div");
        this.container.style.position = "relative";
        this.container.style.pointerEvents = "none";
        this.container.style.overflow = "visible";

        this.domElement = scene.add.dom(0, 0, this.container).setOrigin(0, 0).setDepth(DEPTH_INGAME_TEXT_INDEX);
        this.domElement.pointerEvents = "none";
    }

    public createName(name: string, x: number, y: number): CharacterNameDisplay {
        const element = document.createElement("div");
        element.ariaHidden = "true";
        element.className = "standalone-character-name";
        element.textContent = name;
        element.style.position = "absolute";
        element.style.padding = "2px 6px";
        element.style.borderRadius = "8px";
        element.style.background = "rgba(27, 42, 65, 0.5)";
        element.style.color = "#fff";
        element.style.fontFamily = "Roboto, system-ui, sans-serif";
        element.style.fontSize = "10px";
        element.style.fontWeight = "500";
        element.style.whiteSpace = "nowrap";
        element.style.pointerEvents = "none";
        this.container.appendChild(element);
        return new CharacterNameDisplay(element).setPosition(x, y);
    }

    public destroy(): void {
        this.domElement.destroy();
        this.container.replaceChildren();
    }
}

export class CharacterNameDisplay {
    public constructor(private readonly element: HTMLDivElement) {}

    public setPosition(x: number, y: number): this {
        this.element.style.transform = `translate3d(${x}px, ${y + NAME_Y_OFFSET}px, 0) translate(-50%, -50%)`;
        return this;
    }

    public setDepth(depth: number): void {
        this.element.style.zIndex = `${Math.round(depth)}`;
    }

    public destroy(): void {
        this.element.remove();
    }
}
