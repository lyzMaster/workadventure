export type Direction = "up" | "right" | "down" | "left";

export const Direction = {
    UP: "up",
    RIGHT: "right",
    DOWN: "down",
    LEFT: "left",
    Up: "up",
    Right: "right",
    Down: "down",
    Left: "left",
} as const;

export interface CharacterPosition {
    x: number;
    y: number;
    direction: Direction;
    moving: boolean;
}

export type CharacterId = string;

export type CharacterMotionState = "idle" | "walking" | "speaking" | "thinking";

export interface CharacterMovementConfig {
    walkingSpeed: number;
    runningMultiplier: number;
}

export interface CharacterSnapshot {
    id: CharacterId;
    name: string;
    sceneId: string;
    position: CharacterPosition;
    motionState: CharacterMotionState;
}

export interface AgentCharacterDefinition {
    characterId: CharacterId;
    name: string;
    sceneId: string;
    appearance: CharacterAppearance;
    spawnPosition: CharacterPosition;
    movementConfig?: CharacterMovementConfig;
}

export interface AgentCharacterSnapshot extends CharacterSnapshot {
    kind: "agent";
}

export type AgentActionErrorCode =
    | "character_not_found"
    | "character_already_exists"
    | "scene_not_loaded"
    | "scene_mismatch"
    | "invalid_target"
    | "spawn_blocked"
    | "path_not_found"
    | "cancelled"
    | "timeout"
    | "destroyed"
    | "texture_load_failed";

export type AgentActionResult<T> =
    | {
          ok: true;
          actionId: string;
          value: T;
      }
    | {
          ok: false;
          actionId: string;
          code: AgentActionErrorCode;
          message: string;
      };

export type CharacterMoveResult =
    | {
          ok: true;
          character: CharacterSnapshot;
      }
    | {
          ok: false;
          code: "path_not_found" | "cancelled" | "timeout" | "destroyed" | "invalid_target";
          message: string;
      };

export interface CharacterTexture {
    id: string;
    url: string;
    layer?: number;
}

export interface CharacterAppearance {
    textures: CharacterTexture[];
}

export type CharacterSayType = "speech" | "thinking";

export const CharacterSayType = {
    SpeechBubble: "speech",
    ThinkingCloud: "thinking",
} as const;

export function rotateDirectionClockwise(direction: Direction): Direction {
    switch (direction) {
        case "up":
            return "right";
        case "right":
            return "down";
        case "down":
            return "left";
        case "left":
            return "up";
    }
}

export function directionFromVector(x: number, y: number, fallback: Direction): Direction {
    if (x === 0 && y === 0) {
        return fallback;
    }
    if (Math.abs(x) > Math.abs(y)) {
        return x < 0 ? "left" : "right";
    }
    return y < 0 ? "up" : "down";
}
