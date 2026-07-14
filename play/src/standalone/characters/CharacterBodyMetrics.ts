export const CHARACTER_BODY_WIDTH = 16;
export const CHARACTER_BODY_HEIGHT = 16;
export const CHARACTER_BODY_OFFSET_X = 0;
export const CHARACTER_BODY_OFFSET_Y = 8;

export interface CharacterBodyMetrics {
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
}

export const DEFAULT_CHARACTER_BODY_METRICS: CharacterBodyMetrics = {
    width: CHARACTER_BODY_WIDTH,
    height: CHARACTER_BODY_HEIGHT,
    offsetX: CHARACTER_BODY_OFFSET_X,
    offsetY: CHARACTER_BODY_OFFSET_Y,
};
