import {
    EntityRawPrefab,
    mapCustomEntityDirectionToDirection,
    UploadEntityCommand,
    type UploadEntityCommandDto,
} from "@workadventure/map-editor";
import { gameManager } from "../../../GameManager";
import type { EntitiesManager } from "../../../GameMap/EntitiesManager";
import type { EntitiesCollectionsManager } from "../../EntitiesCollectionsManager";
import type { FrontCommand } from "../FrontCommand";
import { DeleteCustomEntityFrontCommand } from "./DeleteCustomEntityFrontCommand";

export class UploadEntityFrontCommand extends UploadEntityCommand implements FrontCommand {
    constructor(
        uploadEntityMessage: Omit<UploadEntityCommandDto, "type" | "commandId" | "sceneId">,
        private entitiesManager: EntitiesManager,
        private entitiesCollectionManager: EntitiesCollectionsManager,
    ) {
        super(uploadEntityMessage);
    }

    toDto(sceneId: string): UploadEntityCommandDto {
        return {
            ...this.uploadEntityMessage,
            type: "entity.upload",
            commandId: this.commandId,
            sceneId,
        };
    }

    execute(): Promise<void> {
        const customEntityCollectionUrl = gameManager.getCurrentGameScene().getCustomEntityCollectionUrl();
        try {
            const uploadedEntity = EntityRawPrefab.parse({
                ...this.uploadEntityMessage,
                direction: mapCustomEntityDirectionToDirection(this.uploadEntityMessage.direction),
            });
            gameManager
                .getCurrentGameScene()
                .getEntitiesCollectionsManager()
                .addUploadedEntity(uploadedEntity, customEntityCollectionUrl);
        } catch (e) {
            console.error(e);
        }

        return super.execute();
    }

    getUndoCommand(): DeleteCustomEntityFrontCommand {
        return new DeleteCustomEntityFrontCommand(
            { id: this.uploadEntityMessage.id },
            gameManager.getCurrentGameScene().getGameMap().getWamFile(),
            this.entitiesManager,
            this.entitiesCollectionManager,
        );
    }
}
