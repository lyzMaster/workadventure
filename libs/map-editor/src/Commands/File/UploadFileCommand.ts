import type { UploadFileCommandDto } from "../Dto/FileCommandDto";
import { Command } from "../Command";

export class UploadFileCommand extends Command {
    protected uploadFileMessage: Omit<UploadFileCommandDto, "type" | "commandId" | "sceneId">;
    protected hostname: string | undefined;

    constructor(uploadFileMessage: Omit<UploadFileCommandDto, "type" | "commandId" | "sceneId">, hostname?: string) {
        super();
        this.uploadFileMessage = uploadFileMessage;
        this.hostname = hostname;
    }

    execute(): Promise<void> {
        return Promise.resolve();
    }
}
