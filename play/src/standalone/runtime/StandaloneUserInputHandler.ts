import * as Phaser from "phaser";
import { get } from "svelte/store";
import type { UserInputHandlerInterface } from "../../front/Interfaces/UserInputHandlerInterface";
import { mapEditorModeStore } from "../../front/Stores/MapEditorCoreStore";
import type { Shortcut } from "../../front/Phaser/UserInput/UserInputManager";
import type { CameraManager } from "../../front/Phaser/Game/CameraManager";
import type { MapEditorRuntimeController } from "../../front/Phaser/Game/MapEditor/MapEditorController";

import Pointer = Phaser.Input.Pointer;
import GameObject = Phaser.GameObjects.GameObject;

export interface StandaloneInputHost {
    readonly CurrentPlayer?: { rotate(): void };
    readonly input: Phaser.Input.InputPlugin;
    readonly userInputManager: {
        isControlsEnabled: boolean;
        isRightClickEnabled: boolean;
    };

    handleMouseWheel(deltaY: number): void;
    moveTo(position: { x: number; y: number }, tryFindingNearestAvailable?: boolean): Promise<unknown>;
    getCameraManager(): CameraManager;
    getMapEditorModeManager(): MapEditorRuntimeController;
}

export class StandaloneUserInputHandler implements UserInputHandlerInterface {
    public shortcuts: Shortcut[] = [
        { key: "E", description: "Toggle map editor" },
        { key: "R", description: "Rotate player" },
    ];

    public constructor(private readonly scene: StandaloneInputHost) {}

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
