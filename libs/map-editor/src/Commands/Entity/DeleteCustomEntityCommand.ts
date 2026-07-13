import type { DeleteCustomEntityCommandDto } from "../Dto/EntityCommandDto";
import { Command } from "../Command";
import type { WamFile } from "../../GameMap/WamFile";

export class DeleteCustomEntityCommand extends Command {
    protected deleteCustomEntityMessage: Omit<DeleteCustomEntityCommandDto, "type" | "commandId" | "sceneId">;
    protected hostname: string | undefined;
    protected wamFile: WamFile | undefined;

    constructor(
        deleteCustomEntityMessage: Omit<DeleteCustomEntityCommandDto, "type" | "commandId" | "sceneId">,
        wamFile?: WamFile,
        hostname?: string,
    ) {
        super();
        this.deleteCustomEntityMessage = deleteCustomEntityMessage;
        this.hostname = hostname;
        this.wamFile = wamFile;
    }

    execute(): Promise<void> {
        this.wamFile?.getGameMapEntities().deleteCustomEntities(this.deleteCustomEntityMessage.id);
        return Promise.resolve();
    }
}
