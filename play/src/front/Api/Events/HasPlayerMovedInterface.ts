import type { CharacterPosition } from "@workadventure/game-model";

export interface HasPlayerMovedInterface extends CharacterPosition {
    oldX?: number;
    oldY?: number;
}
