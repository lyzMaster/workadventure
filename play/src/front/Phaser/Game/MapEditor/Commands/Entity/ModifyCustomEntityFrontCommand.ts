import { ModifyCustomEntityCommand, type ModifyCustomEntityCommandDto } from "@workadventure/map-editor";
import type { FrontCommand } from "../FrontCommand";
import type { EntitiesCollectionsManager } from "../../EntitiesCollectionsManager";
import type { GameMapFrontWrapper } from "../../../GameMap/GameMapFrontWrapper";
import type { EntitiesManager } from "../../../GameMap/EntitiesManager";

export class ModifyCustomEntityFrontCommand extends ModifyCustomEntityCommand implements FrontCommand {
    constructor(
        modifyCustomEntityMessage: Omit<ModifyCustomEntityCommandDto, "type" | "commandId" | "sceneId">,
        private entitiesCollectionManager: EntitiesCollectionsManager,
        private gameFrontWrapper: GameMapFrontWrapper,
        private entitiesManager: EntitiesManager,
    ) {
        super(modifyCustomEntityMessage);
    }

    toDto(sceneId: string): ModifyCustomEntityCommandDto {
        return {
            ...this.modifyCustomEntityMessage,
            type: "entity.custom.modify",
            commandId: this.commandId,
            sceneId,
        };
    }

    execute(): Promise<void> {
        const { id, name, tags, depthOffset, collisionGrid } = this.modifyCustomEntityMessage;
        this.entitiesCollectionManager.modifyCustomEntity(id, name, tags, depthOffset, collisionGrid);
        if (depthOffset !== undefined) {
            this.entitiesManager.updateEntitiesDepth(id, depthOffset);
        }
        this.gameFrontWrapper.recomputeEntitiesCollisionGrid();
        return super.execute();
    }

    getUndoCommand(): ModifyCustomEntityFrontCommand {
        throw new Error("Not supported.");
    }
}
