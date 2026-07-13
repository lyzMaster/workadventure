import type { Command, DeleteCustomEntityCommandDto, WamFile } from "@workadventure/map-editor";
import { DeleteCustomEntityCommand } from "@workadventure/map-editor";
import type { FrontCommand } from "../FrontCommand";
import type { EntitiesManager } from "../../../GameMap/EntitiesManager";
import type { EntitiesCollectionsManager } from "../../EntitiesCollectionsManager";

export class DeleteCustomEntityFrontCommand extends DeleteCustomEntityCommand implements FrontCommand {
    constructor(
        deleteCustomEntityMessage: Omit<DeleteCustomEntityCommandDto, "type" | "commandId" | "sceneId">,
        wamFile: WamFile | undefined,
        private entitiesManager: EntitiesManager,
        private entitiesCollectionManager: EntitiesCollectionsManager,
    ) {
        super(deleteCustomEntityMessage, wamFile);
    }

    toDto(sceneId: string): DeleteCustomEntityCommandDto {
        return {
            ...this.deleteCustomEntityMessage,
            type: "entity.custom.delete",
            commandId: this.commandId,
            sceneId,
        };
    }

    execute(): Promise<void> {
        const { id } = this.deleteCustomEntityMessage;
        this.entitiesCollectionManager.deleteCustomEntity(id);
        const gameMapEntitiesIdToRemove = this.wamFile?.getGameMapEntities().findEntitiesByPrefabId(id) ?? [];
        this.entitiesManager.deleteEntities(gameMapEntitiesIdToRemove);
        return super.execute();
    }

    getUndoCommand(): Command & FrontCommand {
        throw new Error("Not supported.");
    }
}
