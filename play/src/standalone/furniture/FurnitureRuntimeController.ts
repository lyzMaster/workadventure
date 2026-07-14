import type { EntityPrefab, WAMEntityData } from "@workadventure/map-editor";
import { CreateEntityFrontCommand } from "../../front/Phaser/Game/MapEditor/Commands/Entity/CreateEntityFrontCommand";
import { DeleteEntityFrontCommand } from "../../front/Phaser/Game/MapEditor/Commands/Entity/DeleteEntityFrontCommand";
import { UpdateEntityFrontCommand } from "../../front/Phaser/Game/MapEditor/Commands/Entity/UpdateEntityFrontCommand";
import type { Entity } from "../../front/Phaser/ECS/Entity";
import type { StandaloneGameScene } from "../runtime/StandaloneGameScene";
import type {
    FurnitureActionErrorCode,
    FurnitureActionResult,
    FurnitureCommandController,
    FurnitureEntitySnapshot,
    FurniturePrefabSnapshot,
    HistoryActionResult,
    HistoryStateSnapshot,
} from "../commands/types";

export class FurnitureRuntimeController implements FurnitureCommandController {
    public constructor(private readonly scene: StandaloneGameScene) {}

    public async listCatalog(): Promise<FurniturePrefabSnapshot[]> {
        let prefabs: FurniturePrefabSnapshot[] = [];
        const unsubscribe = this.scene
            .getEntitiesCollectionsManager()
            .getEntitiesPrefabsVariantStore()
            .subscribe((variants) => {
                prefabs = variants.map((variant) => this.toPrefabSnapshot(variant.defaultPrefab));
            });
        unsubscribe();
        return prefabs;
    }

    public list(): FurnitureEntitySnapshot[] {
        return [...this.scene.getGameMapFrontWrapper().getEntitiesManager().getEntities().values()].map((entity) =>
            this.toEntitySnapshot(entity),
        );
    }

    public getState(entityId: string): FurnitureEntitySnapshot | undefined {
        const entity = this.scene.getEntityById(entityId);
        return entity ? this.toEntitySnapshot(entity) : undefined;
    }

    public async place(input: {
        entityId: string;
        prefab: { collectionName: string; prefabId: string };
        position: { x: number; y: number };
    }): Promise<FurnitureActionResult<FurnitureEntitySnapshot>> {
        if (this.scene.getEntityById(input.entityId)) {
            return this.fail("command_failed", `Entity "${input.entityId}" already exists`);
        }

        const prefab = await this.getPrefab(input.prefab.collectionName, input.prefab.prefabId);
        if (!prefab.ok) {
            return prefab;
        }

        const dimensions = await this.ensurePrefabDimensions(prefab.value);
        const topLeft = this.toTopLeftPosition(input.position, dimensions);
        const placement = this.validatePlacement(topLeft, dimensions, prefab.value.collisionGrid);
        if (!placement.ok) {
            return placement;
        }

        const entityData: WAMEntityData = {
            x: topLeft.x,
            y: topLeft.y,
            prefabRef: { collectionName: prefab.value.collectionName, id: prefab.value.id },
            properties: [],
        };

        try {
            await this.scene.getMapEditorModeManager().executeCommand(
                new CreateEntityFrontCommand(
                    this.scene.getGameMap().getWamFile()!,
                    input.entityId,
                    entityData,
                    undefined,
                    this.scene.getGameMapFrontWrapper().getEntitiesManager(),
                    dimensions,
                ),
            );
            const entity = this.scene.getEntityById(input.entityId);
            if (!entity) {
                return this.fail("entity_not_found", `Entity "${input.entityId}" was not created`);
            }
            return { ok: true, value: this.toEntitySnapshot(entity) };
        } catch (error) {
            return this.mapCommandError(error);
        }
    }

    public async move(
        entityId: string,
        position: { x: number; y: number },
    ): Promise<FurnitureActionResult<FurnitureEntitySnapshot>> {
        const entity = this.scene.getEntityById(entityId);
        if (!entity) {
            return this.fail("entity_not_found", `Entity "${entityId}" was not found`);
        }

        const topLeft = this.toTopLeftPosition(position, { width: entity.displayWidth, height: entity.displayHeight });
        const placement = this.validatePlacement(
            topLeft,
            { width: entity.displayWidth, height: entity.displayHeight },
            entity.getCollisionGrid(),
            entity.getOldPosition(),
        );
        if (!placement.ok) {
            return placement;
        }

        try {
            await this.scene.getMapEditorModeManager().executeCommand(
                new UpdateEntityFrontCommand(
                    this.scene.getGameMap().getWamFile()!,
                    entityId,
                    { x: topLeft.x, y: topLeft.y },
                    undefined,
                    undefined,
                    this.scene.getGameMapFrontWrapper().getEntitiesManager(),
                    this.scene,
                ),
            );
            return { ok: true, value: this.toEntitySnapshot(entity) };
        } catch (error) {
            return this.mapCommandError(error);
        }
    }

    public async setVariant(
        entityId: string,
        prefab: { collectionName: string; prefabId: string },
    ): Promise<FurnitureActionResult<FurnitureEntitySnapshot>> {
        const entity = this.scene.getEntityById(entityId);
        if (!entity) {
            return this.fail("entity_not_found", `Entity "${entityId}" was not found`);
        }

        const nextPrefab = await this.getPrefab(prefab.collectionName, prefab.prefabId);
        if (!nextPrefab.ok) {
            return nextPrefab;
        }

        const placement = this.validatePlacement(
            entity.getPosition(),
            { width: entity.displayWidth, height: entity.displayHeight },
            nextPrefab.value.collisionGrid,
            entity.getOldPosition(),
        );
        if (!placement.ok) {
            return placement;
        }

        try {
            await this.scene.getMapEditorModeManager().executeCommand(
                new UpdateEntityFrontCommand(
                    this.scene.getGameMap().getWamFile()!,
                    entityId,
                    { prefabRef: { collectionName: nextPrefab.value.collectionName, id: nextPrefab.value.id } },
                    undefined,
                    undefined,
                    this.scene.getGameMapFrontWrapper().getEntitiesManager(),
                    this.scene,
                ),
            );
            return { ok: true, value: this.toEntitySnapshot(entity) };
        } catch (error) {
            return this.mapCommandError(error);
        }
    }

    public async remove(entityId: string): Promise<FurnitureActionResult<FurnitureEntitySnapshot>> {
        const entity = this.scene.getEntityById(entityId);
        if (!entity) {
            return this.fail("entity_not_found", `Entity "${entityId}" was not found`);
        }
        const snapshot = this.toEntitySnapshot(entity);

        try {
            await this.scene.getMapEditorModeManager().executeCommand(
                new DeleteEntityFrontCommand(
                    this.scene.getGameMap().getWamFile()!,
                    entityId,
                    undefined,
                    this.scene.getGameMapFrontWrapper().getEntitiesManager(),
                ),
            );
            return { ok: true, value: snapshot };
        } catch (error) {
            return this.mapCommandError(error);
        }
    }

    public async undo(): Promise<HistoryActionResult> {
        try {
            await this.scene.getMapEditorModeManager().undoCommand();
            return { ok: true, value: this.getHistoryState() };
        } catch (error) {
            return this.mapHistoryError(error);
        }
    }

    public async redo(): Promise<HistoryActionResult> {
        try {
            await this.scene.getMapEditorModeManager().redoCommand();
            return { ok: true, value: this.getHistoryState() };
        } catch (error) {
            return this.mapHistoryError(error);
        }
    }

    public getHistoryState(): HistoryStateSnapshot {
        const snapshot = this.scene.getStandaloneEntityEditorSnapshot();
        return {
            canUndo: snapshot?.canUndo ?? false,
            canRedo: snapshot?.canRedo ?? false,
        };
    }

    public async flush(): Promise<void> {
        await this.scene.getMapEditorModeManager().flush();
    }

    private async getPrefab(
        collectionName: string,
        prefabId: string,
    ): Promise<FurnitureActionResult<EntityPrefab>> {
        const prefab = await this.scene.getEntitiesCollectionsManager().getEntityPrefab(collectionName, prefabId);
        if (!prefab) {
            return this.fail("prefab_not_found", `Unknown prefab "${collectionName}/${prefabId}"`);
        }
        return { ok: true, value: prefab };
    }

    private async ensurePrefabDimensions(prefab: EntityPrefab): Promise<{ width: number; height: number }> {
        if (!this.scene.textures.exists(prefab.imagePath)) {
            await new Promise<void>((resolve) => {
                this.scene.load.image(prefab.imagePath, prefab.imagePath);
                this.scene.load.once(`filecomplete-image-${prefab.imagePath}`, () => resolve());
                this.scene.load.start();
            }).catch(() => undefined);
        }

        const texture = this.scene.textures.get(prefab.imagePath);
        const image = texture.getSourceImage() as { width?: number; height?: number } | undefined;
        return {
            width: image?.width ?? 32,
            height: image?.height ?? 32,
        };
    }

    private toTopLeftPosition(
        position: { x: number; y: number },
        dimensions: { width: number; height: number },
    ): { x: number; y: number } {
        return {
            x: Math.floor(position.x - dimensions.width * 0.5),
            y: Math.floor(position.y - dimensions.height * 0.5),
        };
    }

    private validatePlacement(
        topLeft: { x: number; y: number },
        dimensions: { width: number; height: number },
        collisionGrid?: number[][],
        oldTopLeft?: { x: number; y: number },
    ): FurnitureActionResult<FurnitureEntitySnapshot> | { ok: true } {
        const wrapper = this.scene.getGameMapFrontWrapper();
        if (wrapper.isOutOfMapBounds(topLeft.x, topLeft.y, dimensions.width, dimensions.height)) {
            return this.fail("invalid_target", "Target position is outside the map");
        }
        if (
            !wrapper.canEntityBePlacedOnMap(
                topLeft,
                dimensions.width,
                dimensions.height,
                collisionGrid,
                oldTopLeft,
            )
        ) {
            return this.fail("collision_blocked", "Target position is blocked");
        }
        return { ok: true };
    }

    private toPrefabSnapshot(prefab: EntityPrefab): FurniturePrefabSnapshot {
        return {
            collectionName: prefab.collectionName,
            prefabId: prefab.id,
            name: prefab.name,
            color: prefab.color,
            direction: prefab.direction,
            hasCollisionGrid: (prefab.collisionGrid?.length ?? 0) > 0,
        };
    }

    private toEntitySnapshot(entity: Entity): FurnitureEntitySnapshot {
        return {
            id: entity.entityId,
            x: entity.x,
            y: entity.y,
            width: entity.displayWidth,
            height: entity.displayHeight,
            prefab: this.toPrefabSnapshot(entity.getPrefab()),
            propertiesCount: entity.getProperties().length,
        };
    }

    private mapCommandError(error: unknown): FurnitureActionResult<never> {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("persistence_failed")) {
            return this.fail("persistence_failed", message, error);
        }
        return this.fail("command_failed", message, error);
    }

    private mapHistoryError(error: unknown): HistoryActionResult {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("persistence_failed")) {
            return { ok: false, code: "persistence_failed", message, cause: error };
        }
        return { ok: false, code: "command_failed", message, cause: error };
    }

    private fail<T>(
        code: FurnitureActionErrorCode,
        message: string,
        cause?: unknown,
    ): FurnitureActionResult<T> {
        return { ok: false as const, code, message, cause };
    }
}
