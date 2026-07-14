import * as Phaser from "phaser";
import { get } from "svelte/store";
import type { UserInputHandlerInterface } from "../../front/Interfaces/UserInputHandlerInterface";
import { mapEditorModeStore } from "../../front/Stores/MapEditorStore";
import type { Shortcut } from "../../front/Phaser/UserInput/UserInputManager";
import type { StandaloneGameScene } from "./StandaloneGameScene";

import Pointer = Phaser.Input.Pointer;
import GameObject = Phaser.GameObjects.GameObject;

export class StandaloneUserInputHandler implements UserInputHandlerInterface {
    public shortcuts: Shortcut[] = [
        { key: "E", description: "Toggle map editor" },
        { key: "R", description: "Rotate player" },
    ];

    public constructor(private readonly scene: StandaloneGameScene) {}

    public handleMouseWheelEvent(
        pointer: Pointer,
        gameObjects: GameObject[],
        deltaX: number,
        deltaY: number,
        deltaZ: number,
    ): void {
        this.scene.handleMouseWheel(deltaY);
    }

    public handlePointerUpEvent(pointer: Pointer, gameObjects: GameObject[]): void {
        if ((!pointer.wasTouch && pointer.leftButtonReleased()) || pointer.getDuration() > 250) {
            return;
        }
        if (!this.scene.userInputManager.isControlsEnabled || !this.scene.userInputManager.isRightClickEnabled) {
            return;
        }
        const camera = this.scene.getCameraManager().getCamera();
        const worldPoint = camera.getWorldPoint(pointer.x, pointer.y);
        this.scene.moveTo({ x: worldPoint.x, y: worldPoint.y }, true).catch((reason) => console.warn(reason));
    }

    public handlePointerDownEvent(pointer: Pointer, gameObjects: GameObject[]): void {}

    public handlePointerMoveEvent(pointer: Pointer, gameObjects: GameObject[]): void {}

    public handleKeyDownEvent(event: KeyboardEvent): KeyboardEvent {
        if (this.scene.getMapEditorModeManager()?.handleKeyDownEvent(event)) {
            return event;
        }
        switch (event.code) {
            case "KeyE":
                mapEditorModeStore.switchMode(!get(mapEditorModeStore));
                break;
            case "KeyR":
                this.scene.CurrentPlayer?.rotate();
                break;
        }
        return event;
    }

    public handleKeyUpEvent(event: KeyboardEvent): KeyboardEvent {
        return event;
    }

    public handleActivableEntity(): void {}

    public addSpaceEventListener(callback: () => void): void {
        this.scene.input.keyboard?.addListener("keyup-SPACE", callback);
    }

    public removeSpaceEventListener(callback: () => void): void {
        this.scene.input.keyboard?.removeListener("keyup-SPACE", callback);
    }
}
