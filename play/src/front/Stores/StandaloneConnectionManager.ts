import type { ErrorApiErrorData, ErrorApiRetryData, ErrorApiUnauthorizedData } from "@workadventure/messages";
import type { Room } from "../Connection/Room";

type GameConnectionResult =
    | URL
    | { room: Room; nextScene: "selectCharacterScene" | "selectCompanionScene" | "gameScene" }
    | { nextScene: "errorScene"; error: ErrorApiErrorData | ErrorApiRetryData | ErrorApiUnauthorizedData | Error };

export const connectionManager = {
    currentRoom: undefined,
    initGameConnexion(): Promise<GameConnectionResult> {
        return Promise.reject(new Error("Online connection manager is not available in standalone mode"));
    },
    connectToRoomSocket(..._unused: unknown[]): Promise<never> {
        return Promise.reject(new Error("Room WebSocket is not available in standalone mode"));
    },
    waitForPusherToBeReachable(): Promise<void> {
        return Promise.resolve();
    },
    waitForPusherPing(): Promise<void> {
        return Promise.resolve();
    },
    logout(): void {},
};
