import { Command, type LocalMapEditorCommand } from "@workadventure/map-editor";
import type { FrontCommandInterface } from "./FrontCommandInterface";

export class VoidFrontCommand extends Command implements FrontCommandInterface {
    public execute(): Promise<void> {
        return Promise.resolve();
    }

    public getUndoCommand(): Command & FrontCommandInterface {
        return this;
    }

    public toDto(sceneId: string): LocalMapEditorCommand {
        return {
            type: "wam.metadata.update",
            commandId: this.commandId,
            sceneId,
        };
    }
}
