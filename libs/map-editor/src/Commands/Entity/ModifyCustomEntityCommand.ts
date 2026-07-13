import type { ModifyCustomEntityCommandDto } from "../Dto/EntityCommandDto";
import { Command } from "../Command";

export class ModifyCustomEntityCommand extends Command {
    protected modifyCustomEntityMessage: Omit<ModifyCustomEntityCommandDto, "type" | "commandId" | "sceneId">;
    protected hostname: string | undefined;
    constructor(
        modifyCustomEntityMessage: Omit<ModifyCustomEntityCommandDto, "type" | "commandId" | "sceneId">,
        hostname?: string,
    ) {
        super();
        this.modifyCustomEntityMessage = modifyCustomEntityMessage;
        this.hostname = hostname;
    }

    execute(): Promise<void> {
        return Promise.resolve();
    }
}
