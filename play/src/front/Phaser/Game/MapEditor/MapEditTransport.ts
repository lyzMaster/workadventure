import type { FrontCommand } from "./Commands/FrontCommand";

export type MapEditResult =
    | { ok: true; commandId: string }
    | {
          ok: false;
          commandId: string;
          code: "validation_failed" | "persistence_failed" | "scene_not_loaded" | "unsupported_command";
          message: string;
      };

/** Submission boundary used after a FrontCommand has changed the local WAM and Phaser scene. */
export interface MapEditTransport {
    readonly acknowledgement: "local" | "remote";
    submit(command: FrontCommand): Promise<MapEditResult>;
    flush?(): Promise<void>;
}
