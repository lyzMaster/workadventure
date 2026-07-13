import type { DeleteEntityCommandDto, EntityDimensions, WamFile, WAMEntityData } from "@workadventure/map-editor";
import { DeleteEntityCommand } from "@workadventure/map-editor";
import type { EntitiesManager } from "../../../GameMap/EntitiesManager";
import type { FrontCommandInterface } from "../FrontCommandInterface";
import { VoidFrontCommand } from "../VoidFrontCommand";
import { CreateEntityFrontCommand } from "./CreateEntityFrontCommand";

export class DeleteEntityFrontCommand extends DeleteEntityCommand implements FrontCommandInterface {
    private entityData: WAMEntityData | undefined;
    private entityDimensions: EntityDimensions | undefined;

    constructor(
        wamFile: WamFile,
        entityId: string,
        commandId: string | undefined,
        private entitiesManager: EntitiesManager,
    ) {
        super(wamFile, entityId, commandId);
    }

    public execute(): Promise<void> {
        const entityData = this.wamFile.getGameMapEntities().getEntity(this.entityId);
        if (!entityData) {
            throw new Error("Trying to delete a non existing Entity!");
        }
        this.entityData = structuredClone(entityData);
        const entity = this.entitiesManager.getEntities().get(this.entityId);
        if (entity) {
            this.entityDimensions = { width: entity.width, height: entity.height };
        }
        this.entitiesManager.deleteEntity(this.entityId);
        return super.execute();
    }

    public getUndoCommand(): CreateEntityFrontCommand | VoidFrontCommand {
        if (!this.entityData) {
            return new VoidFrontCommand();
        }
        if (!this.entityDimensions) {
            return new VoidFrontCommand();
        }
        return new CreateEntityFrontCommand(
            this.wamFile,
            this.entityId,
            this.entityData,
            undefined,
            this.entitiesManager,
            this.entityDimensions,
        );
    }

    public toDto(sceneId: string): DeleteEntityCommandDto {
        return {
            type: "entity.delete",
            commandId: this.commandId,
            sceneId,
            entityId: this.entityId,
            entity: this.entityData,
            dimensions: this.entityDimensions,
        };
    }
}
