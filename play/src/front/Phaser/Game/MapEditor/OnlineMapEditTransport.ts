import type { RoomConnection } from "../../../Connection/RoomConnection";
import type { FrontCommand } from "./Commands/FrontCommand";
import type { MapEditResult, MapEditTransport } from "./MapEditTransport";

/** Preserves the existing server submission path without exposing RoomConnection to the manager. */
export class OnlineMapEditTransport implements MapEditTransport {
    public readonly acknowledgement = "remote" as const;

    public constructor(private readonly getConnection: () => RoomConnection | undefined) {}

    public submit(command: FrontCommand): Promise<MapEditResult> {
        const connection = this.getConnection();
        if (!connection) {
            return Promise.resolve({
                ok: false,
                commandId: command.commandId,
                code: "scene_not_loaded",
                message: "No RoomConnection is attached to the current scene",
            });
        }
        command.emitEvent(connection);
        return Promise.resolve({ ok: true, commandId: command.commandId });
    }

    public flush(): Promise<void> {
        return Promise.resolve();
    }
}
