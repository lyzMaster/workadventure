import {
    Direction,
    directionFromVector,
    type CharacterMovementConfig,
    type Direction as DirectionType,
} from "@workadventure/game-model";
import type { ActiveEventList } from "../../front/Phaser/UserInput/UserInputManager";
import { UserInputEvent } from "../../front/Phaser/UserInput/UserInputManager";

export interface ManualMovementInput {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    speedUp: boolean;
    joystickMove: boolean;
}

export interface ManualMovementStep {
    velocityX: number;
    velocityY: number;
    direction: DirectionType;
    moving: boolean;
}

export function activeEventsToManualMovementInput(activeEvents: ActiveEventList): ManualMovementInput {
    return {
        up: activeEvents.get(UserInputEvent.MoveUp),
        down: activeEvents.get(UserInputEvent.MoveDown),
        left: activeEvents.get(UserInputEvent.MoveLeft),
        right: activeEvents.get(UserInputEvent.MoveRight),
        speedUp: activeEvents.get(UserInputEvent.SpeedUp),
        joystickMove: activeEvents.get(UserInputEvent.JoystickMove),
    };
}

export function hasManualMovementInput(input: ManualMovementInput): boolean {
    return input.up || input.down || input.left || input.right || input.joystickMove;
}

export function getManualMovementSpeed(config: CharacterMovementConfig, speedUp: boolean): number {
    return config.walkingSpeed * (speedUp ? config.runningMultiplier : 1);
}

export function computeManualMovementStep(
    input: ManualMovementInput,
    lastDirection: DirectionType,
    config: CharacterMovementConfig,
): ManualMovementStep {
    let x = 0;
    let y = 0;
    if (input.up) {
        y -= 1;
    } else if (input.down) {
        y += 1;
    }
    if (input.left) {
        x -= 1;
    } else if (input.right) {
        x += 1;
    }

    const moving = x !== 0 || y !== 0 || input.joystickMove;
    const speed = getManualMovementSpeed(config, input.speedUp) * 20;
    const velocityX = x * speed;
    const velocityY = y * speed;
    const direction = moving && !input.joystickMove ? directionFromVector(velocityX, velocityY, lastDirection) : lastDirection;

    return {
        velocityX,
        velocityY,
        direction: direction ?? Direction.DOWN,
        moving,
    };
}
