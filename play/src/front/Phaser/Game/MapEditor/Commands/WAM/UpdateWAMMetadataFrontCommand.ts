import type { UpdateWamMetadataCommandDto, WAMFileFormat } from "@workadventure/map-editor";
import { UpdateWAMMetadataCommand } from "@workadventure/map-editor";
import type { FrontCommandInterface } from "../FrontCommandInterface";

/**
 * Represents a front command for updating WAM metadata.
 */
export class UpdateWAMMetadataFrontCommand extends UpdateWAMMetadataCommand implements FrontCommandInterface {
    constructor(
        wam: WAMFileFormat,
        private readonly modifiyWAMMetadataMessage: Omit<UpdateWamMetadataCommandDto, "type" | "commandId" | "sceneId">,
        commandId?: string,
    ) {
        super(wam, modifiyWAMMetadataMessage, commandId);
    }

    /**
     * Gets the undo command for updating WAM metadata.
     * @returns The undo command.
     */
    public getUndoCommand(): UpdateWAMMetadataFrontCommand {
        return new UpdateWAMMetadataFrontCommand(this.wam, this.modifiyWAMMetadataMessage, this.commandId);
    }

    public toDto(sceneId: string): UpdateWamMetadataCommandDto {
        return {
            ...this.modifiyWAMMetadataMessage,
            type: "wam.metadata.update",
            commandId: this.commandId,
            sceneId,
        };
    }

    /**
     * Executes the command to update WAM metadata.
     * @returns A promise that resolves when the command is executed.
     */
    public execute(): Promise<void | undefined | WAMFileFormat> {
        return super.execute();
    }
}
