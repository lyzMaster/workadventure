import type { Direction } from "@workadventure/game-model";

export interface MucRoomDefinition {
    name: string;
    url: string;
    type: string;
}

export class ProtobufClientUtils {
    public static toDirectionString(direction: Direction): "up" | "down" | "left" | "right" {
        return direction;
    }
}
