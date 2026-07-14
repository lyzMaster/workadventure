import type { UpdateEntityCommandDto, WamFile, WAMEntityData, WAMFileFormat } from "@workadventure/map-editor";
import { UpdateEntityCommand } from "@workadventure/map-editor";
import type { EntitiesManager } from "../../../GameMap/EntitiesManager";
import type { Entity } from "../../../../ECS/Entity";
import type { MapEditorSceneContext } from "../../../SceneContext";
import type { FrontCommandInterface } from "../FrontCommandInterface";
import { TexturesHelper } from "../../../../Helpers/TexturesHelper";

export class UpdateEntityFrontCommand extends UpdateEntityCommand implements FrontCommandInterface {
    constructor(
        wamFile: WamFile,
        entityId: string,
        dataToModify: Partial<WAMEntityData>,
        commandId: string | undefined,
        oldConfig: Partial<WAMEntityData> | undefined,
        private entitiesManager: EntitiesManager,
        private scene: MapEditorSceneContext,
    ) {
        super(wamFile, entityId, dataToModify, commandId, oldConfig);
    }

    public async execute(): Promise<WAMFileFormat | undefined> {
        const returnVal = await super.execute();
        await this.handleEntityUpdate(this.newConfig);

        return returnVal;
    }

    public getUndoCommand(): UpdateEntityFrontCommand {
        return new UpdateEntityFrontCommand(
            this.wamFile,
            this.entityId,
            this.oldConfig,
            undefined,
            this.newConfig,
            this.entitiesManager,
            this.scene,
        );
    }

    public toDto(sceneId: string): UpdateEntityCommandDto {
        const entity = this.entitiesManager.getEntities().get(this.entityId);
        if (!entity) {
            return {
                type: "entity.update",
                commandId: this.commandId,
                sceneId,
                entityId: this.entityId,
                patch: this.newConfig,
            };
        }
        return {
            type: "entity.update",
            commandId: this.commandId,
            sceneId,
            entityId: this.entityId,
            patch: {
                x: entity.x,
                y: entity.y,
                ...this.newConfig,
            },
            dimensions: {
                width: entity.width,
                height: entity.height,
            },
        };
    }

    private async handleEntityUpdate(config: Partial<WAMEntityData>): Promise<void> {
        const entity = this.entitiesManager.getEntities().get(this.entityId);
        if (!entity) {
            return;
        }
        const { x: oldX, y: oldY } = entity.getOldPosition();
        const oldCollisionGrid = entity.getCollisionGrid();
        if (config.prefabRef) {
            const prefab = await this.scene
                .getEntitiesCollectionsManager()
                .getEntityPrefab(config.prefabRef.collectionName, config.prefabRef.id);
            if (!prefab) {
                throw new Error(`Unknown entity prefab ${config.prefabRef.collectionName}/${config.prefabRef.id}`);
            }
            await TexturesHelper.loadEntityImage(this.scene, prefab.imagePath, prefab.imagePath);
            entity.setPrefab(prefab);
        }
        entity?.updateEntity(config);
        // If the entity is activable, and not in the activatable entities array of the entity manager,
        // we add it to the array
        if (entity.isActivatable() && !this.entitiesManager.getActivatableEntities().includes(entity)) {
            this.entitiesManager.getActivatableEntities().push(entity);
        }
        this.updateCollisionGrid(entity, oldX, oldY, oldCollisionGrid);
        this.scene.markDirty();
    }

    private updateCollisionGrid(entity: Entity, oldX: number, oldY: number, oldCollisionGrid?: number[][]): void {
        const reversedGrid = oldCollisionGrid?.map((row) => row.map((value) => (value === 1 ? -1 : value)));
        const grid = entity.getCollisionGrid();
        if (reversedGrid && grid) {
            this.scene.getGameMapFrontWrapper().modifyToCollisionsLayer(oldX, oldY, "0", reversedGrid);
            this.scene.getGameMapFrontWrapper().modifyToCollisionsLayer(entity.x, entity.y, "0", grid);
        }
    }
}
