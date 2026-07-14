import { Direction, type Direction as DirectionType } from "@workadventure/game-model";

export type CharacterAnimationDirectionKey = "up" | "down" | "left" | "right";

export enum CharacterAnimationType {
    Walk = "walk",
    Idle = "idle",
}

export interface CharacterAnimationData {
    key: string;
    frameRate: number;
    repeat: number;
    frameModel: string;
    frames: number[];
}

export function directionToAnimationKey(direction: DirectionType): CharacterAnimationDirectionKey {
    switch (direction) {
        case Direction.UP:
            return "up";
        case Direction.DOWN:
            return "down";
        case Direction.LEFT:
            return "left";
        case Direction.RIGHT:
            return "right";
    }
}

export function getStandaloneCharacterAnimations(textureKey: string): CharacterAnimationData[] {
    return [
        {
            key: `${textureKey}-down-${CharacterAnimationType.Walk}`,
            frameModel: textureKey,
            frames: [0, 1, 2, 1],
            frameRate: 10,
            repeat: -1,
        },
        {
            key: `${textureKey}-left-${CharacterAnimationType.Walk}`,
            frameModel: textureKey,
            frames: [3, 4, 5, 4],
            frameRate: 10,
            repeat: -1,
        },
        {
            key: `${textureKey}-right-${CharacterAnimationType.Walk}`,
            frameModel: textureKey,
            frames: [6, 7, 8, 7],
            frameRate: 10,
            repeat: -1,
        },
        {
            key: `${textureKey}-up-${CharacterAnimationType.Walk}`,
            frameModel: textureKey,
            frames: [9, 10, 11, 10],
            frameRate: 10,
            repeat: -1,
        },
        {
            key: `${textureKey}-down-${CharacterAnimationType.Idle}`,
            frameModel: textureKey,
            frames: [1],
            frameRate: 10,
            repeat: 1,
        },
        {
            key: `${textureKey}-left-${CharacterAnimationType.Idle}`,
            frameModel: textureKey,
            frames: [4],
            frameRate: 10,
            repeat: 1,
        },
        {
            key: `${textureKey}-right-${CharacterAnimationType.Idle}`,
            frameModel: textureKey,
            frames: [7],
            frameRate: 10,
            repeat: 1,
        },
        {
            key: `${textureKey}-up-${CharacterAnimationType.Idle}`,
            frameModel: textureKey,
            frames: [10],
            frameRate: 10,
            repeat: 1,
        },
    ];
}
