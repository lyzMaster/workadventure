import type { Command, UploadFileCommandDto } from "@workadventure/map-editor";
import { UploadFileCommand } from "@workadventure/map-editor";
import type { FrontCommand } from "../FrontCommand";
import type { FrontCommandInterface } from "../FrontCommandInterface";
import { VoidFrontCommand } from "../VoidFrontCommand";

export class UploadFileFrontCommand extends UploadFileCommand implements FrontCommand {
    constructor(uploadFileMessage: Omit<UploadFileCommandDto, "type" | "commandId" | "sceneId">) {
        super(uploadFileMessage);
    }

    toDto(sceneId: string): UploadFileCommandDto {
        return {
            ...this.uploadFileMessage,
            type: "file.upload",
            commandId: this.commandId,
            sceneId,
        };
    }

    execute(): Promise<void> {
        return super.execute();
    }

    getUndoCommand(): Command & FrontCommandInterface {
        return new VoidFrontCommand();
    }
}
