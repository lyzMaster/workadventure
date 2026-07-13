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

export interface CharacterTexture {
    id: string;
    url: string;
    layer?: number;
}

export interface CharacterAppearance {
    textures: CharacterTexture[];
    companionTextureId?: string | null;
}

export interface CharacterIdentity {
    id: string;
    name: string;
}

export type CharacterSayType = "speech" | "thinking";

export const CharacterSayType = {
    SpeechBubble: "speech",
    ThinkingCloud: "thinking",
} as const;

export type SayMessageType = CharacterSayType;
export const SayMessageType = CharacterSayType;

export interface CharacterRuntimeState {
    identity: CharacterIdentity;
    appearance: CharacterAppearance;
    position: CharacterPosition;
    availabilityStatus: CharacterAvailabilityStatus;
}

export type CharacterAvailabilityStatus =
    | "unchanged"
    | "online"
    | "silent"
    | "away"
    | "jitsi"
    | "bbb"
    | "denyProximityMeeting"
    | "speaker"
    | "busy"
    | "doNotDisturb"
    | "backInAMoment"
    | "livekit"
    | "listener"
    | "unknown";

export const CharacterAvailabilityStatus = {
    UNCHANGED: "unchanged",
    ONLINE: "online",
    SILENT: "silent",
    AWAY: "away",
    JITSI: "jitsi",
    BBB: "bbb",
    DENY_PROXIMITY_MEETING: "denyProximityMeeting",
    SPEAKER: "speaker",
    BUSY: "busy",
    DO_NOT_DISTURB: "doNotDisturb",
    BACK_IN_A_MOMENT: "backInAMoment",
    LIVEKIT: "livekit",
    LISTENER: "listener",
    UNRECOGNIZED: "unknown",
    Unchanged: "unchanged",
    Online: "online",
    Silent: "silent",
    Away: "away",
    Jitsi: "jitsi",
    Bbb: "bbb",
    DenyProximityMeeting: "denyProximityMeeting",
    Speaker: "speaker",
    Busy: "busy",
    DoNotDisturb: "doNotDisturb",
    BackInAMoment: "backInAMoment",
    Livekit: "livekit",
    Listener: "listener",
    Unknown: "unknown",
} as const;

export type AvailabilityStatus = CharacterAvailabilityStatus;
export const AvailabilityStatus = CharacterAvailabilityStatus;

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
