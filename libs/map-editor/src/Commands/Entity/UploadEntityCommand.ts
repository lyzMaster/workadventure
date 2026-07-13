import type { UploadEntityCommandDto } from "../Dto/EntityCommandDto";
import { Command } from "../Command";

export class UploadEntityCommand extends Command {
    protected uploadEntityMessage: Omit<UploadEntityCommandDto, "type" | "commandId" | "sceneId">;
    protected hostname: string | undefined;

    constructor(uploadEntityMessage: Omit<UploadEntityCommandDto, "type" | "commandId" | "sceneId">, hostname?: string) {
        super();
        this.uploadEntityMessage = uploadEntityMessage;
        this.hostname = hostname;
    }

    execute(): Promise<void> {
        return Promise.resolve();
    }
}
