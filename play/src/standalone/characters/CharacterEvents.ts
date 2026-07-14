import type { Direction } from "@workadventure/game-model";

export const characterMovedEventName = "standalone-character-moved";
export const characterStartMovingEventName = "standalone-character-start-moving";

export interface CharacterMovedEvent {
    moving: boolean;
    direction: Direction;
    x: number;
    y: number;
}

export interface CharacterStartMovingEvent {
    direction: Direction;
    x: number;
    y: number;
}
