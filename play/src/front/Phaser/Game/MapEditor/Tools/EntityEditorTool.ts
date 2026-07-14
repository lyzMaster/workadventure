import * as Phaser from "phaser";
import type { EntityData, LocalMapEditorCommand, WAMEntityData } from "@workadventure/map-editor";
import { get } from "svelte/store";
import { v4 as uuidv4 } from "uuid";
import {
    mapEditorCopiedEntityDataPropertiesStore,
    mapEditorEntityFileDroppedStore,
    mapEditorEntityModeStore,
    mapEditorSelectedEntityIdStore,
} from "../../../../Stores/MapEditorEntityEditorStore";
import { TexturesHelper } from "../../../Helpers/TexturesHelper";
import { CopyEntityEventData, EntitiesManagerEvent } from "../../GameMap/EntitiesManager";
import { CreateEntityFrontCommand } from "../Commands/Entity/CreateEntityFrontCommand";
import { DeleteEntityFrontCommand } from "../Commands/Entity/DeleteEntityFrontCommand";
import { UpdateEntityFrontCommand } from "../Commands/Entity/UpdateEntityFrontCommand";
import type { MapEditorController } from "../MapEditorController";
import { EntityRelatedEditorTool } from "./EntityRelatedEditorTool";

import Key = Phaser.Input.Keyboard.Key;
import Pointer = Phaser.Input.Pointer;
import GameObject = Phaser.GameObjects.GameObject;

export class EntityEditorTool extends EntityRelatedEditorTool {
    private handleUpdateEntity: (entityData: EntityData) => void;
    private handleCopyEntity: (data: CopyEntityEventData) => void;

    protected shiftKey?: Key;
    protected pointerMoveEventHandler!: (pointer: Pointer, gameObjects: GameObject[]) => void;
    protected pointerDownEventHandler!: (pointer: Pointer, gameObjects: GameObject[]) => void;

    constructor(mapEditorModeManager: MapEditorController) {
        super(mapEditorModeManager);
        this.shiftKey = this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

        this.handleUpdateEntity = this.updateEntity.bind(this);
        this.handleCopyEntity = this.copyEntity.bind(this);
    }

    public activate(): void {
        super.activate();
        this.bindEventHandlers();
        this.bindEntitiesManagerEventHandlers();
    }

    public clear(): void {
        super.clear();
        this.unbindEventHandlers();
        this.unbindEntitiesManagerEventHandlers();
    }

    /**
     * React on commands coming from the outside
     */
    public async handleIncomingCommandMessage(editMapCommandMessage: LocalMapEditorCommand): Promise<void> {
        const commandId = editMapCommandMessage.commandId;
        switch (editMapCommandMessage.type) {
            case "entity.create": {
                const createEntityMessage = editMapCommandMessage.entity;
                const entityPrefab = await this.scene
                    .getEntitiesCollectionsManager()
                    .getEntityPrefab(
                        createEntityMessage.prefabRef.collectionName,
                        createEntityMessage.prefabRef.id,
                    );

                if (!entityPrefab) {
                    console.warn(
                        `NO PREFAB WAS FOUND FOR: ${createEntityMessage.prefabRef.collectionName} ${createEntityMessage.prefabRef.id}`,
                    );
                    return;
                }

                TexturesHelper.loadEntityImage(this.scene, entityPrefab.imagePath, entityPrefab.imagePath)
                    .then(() => {
                        this.entitiesManager
                            .getEntities()
                            .get(editMapCommandMessage.entityId)
                            ?.setTexture(entityPrefab.imagePath);
                    })
                    .catch((reason) => {
                        console.warn(reason);
                    });

                const entityData: WAMEntityData = {
                    ...createEntityMessage,
                };
                // execute command locally
                await this.mapEditorModeManager.executeLocalCommand(
                    new CreateEntityFrontCommand(
                        this.scene.getGameMap().getWamFile()!,
                        editMapCommandMessage.entityId,
                        entityData,
                        commandId,
                        this.entitiesManager,
                        editMapCommandMessage.dimensions ?? { width: 0, height: 0 },
                    ),
                );
                break;
            }
            case "entity.delete": {
                await this.mapEditorModeManager.executeLocalCommand(
                    new DeleteEntityFrontCommand(
                        this.scene.getGameMap().getWamFile()!,
                        editMapCommandMessage.entityId,
                        commandId,
                        this.entitiesManager,
                    ),
                );
                break;
            }
            case "entity.update": {
                await this.mapEditorModeManager.executeLocalCommand(
                    new UpdateEntityFrontCommand(
                        this.scene.getGameMap().getWamFile()!,
                        editMapCommandMessage.entityId,
                        editMapCommandMessage.patch,
                        commandId,
                        undefined,
                        this.entitiesManager,
                        this.scene,
                    ),
                );
                break;
            }
            default:
                break;
        }
    }

    public destroy() {
        super.destroy();
        this.unbindEventHandlers();
        this.unbindEntitiesManagerEventHandlers();
    }

    protected bindEntitiesManagerEventHandlers(): void {
        this.entitiesManager.on(EntitiesManagerEvent.UpdateEntity, this.handleUpdateEntity);
        this.entitiesManager.on(EntitiesManagerEvent.CopyEntity, this.handleCopyEntity);
    }

    protected bindEventHandlers() {
        this.pointerMoveEventHandler = (pointer: Pointer, gameObjects: GameObject[]) =>
            this.handlePointerMoveEvent(pointer, gameObjects);
        this.scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.pointerMoveEventHandler);

        this.pointerDownEventHandler = (pointer: Pointer, gameObjects: GameObject[]) =>
            this.handlePointerDownEvent(pointer, gameObjects);
        this.scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.pointerDownEventHandler);

        this.shiftKey?.on(Phaser.Input.Keyboard.Events.DOWN, () => {
            this.changePreviewTint();
        });

        this.shiftKey?.on(Phaser.Input.Keyboard.Events.UP, () => {
            this.changePreviewTint();
        });
    }

    protected handlePointerMoveEvent(pointer: Pointer, gameObjects: GameObject[]): void {
        // TODO: add shadow when moving into the area
        // .setDropShadow(4, 4, 0x000000);
        if (!this.entityPrefabPreview || !this.entityPrefab) {
            return;
        }

        this.updateEntityPrefabPreviewPosition(pointer);
        this.changePreviewTint();
    }

    protected changePreviewTint(): void {
        if (!this.entityPrefabPreview || !this.entityPrefab) {
            return;
        }
        if (!this.canEntityBePlaced()) {
            this.entityPrefabPreview.setTint(0xff0000);
        } else {
            if (this.shiftKey?.isDown) {
                this.entityPrefabPreview.setTint(0xffa500);
            } else {
                this.entityPrefabPreview.clearTint();
            }
        }
        this.scene.markDirty();
    }

    protected handlePointerDownEvent(pointer: Pointer, gameObjects: GameObject[]): void {
        if (get(mapEditorEntityModeStore) === "EDIT" && gameObjects.length === 0) {
            mapEditorEntityModeStore.set("ADD");
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
            mapEditorSelectedEntityIdStore.set(undefined);
        }

        if (!this.entityPrefabPreview || !this.entityPrefab) {
            return;
        }

        this.updateEntityPrefabPreviewPosition(pointer);

        if (!this.canEntityBePlaced()) {
            return;
        }

        if (pointer.rightButtonDown()) {
            this.cleanPreview();
            return;
        }
        let x = Math.floor(pointer.worldX);
        let y = Math.floor(pointer.worldY);

        if (this.entityPrefab.collisionGrid || this.shiftKey?.isDown) {
            const offsets = this.getEntityPrefabAlignWithGridOffset();
            x = Math.floor(pointer.worldX / 32) * 32 + offsets.x;
            y = Math.floor(pointer.worldY / 32) * 32 + offsets.y;
        }

        const entityId = uuidv4();

        const properties = get(mapEditorCopiedEntityDataPropertiesStore);

        const entityData: WAMEntityData = {
            x: Math.floor(x - this.entityPrefabPreview.displayWidth * 0.5),
            y: Math.floor(y - this.entityPrefabPreview.displayHeight * 0.5),
            prefabRef: this.entityPrefab,
            properties: properties ?? [],
            name: properties?.find((p) => p.type === "openFile")?.name ?? undefined,
        };

        this.mapEditorModeManager
            .executeCommand(
                new CreateEntityFrontCommand(
                    this.scene.getGameMap().getWamFile()!,
                    entityId,
                    entityData,
                    undefined,
                    this.entitiesManager,
                    { width: this.entityPrefabPreview.width, height: this.entityPrefabPreview.height },
                ),
            )
            .then(() => {
                const openEntity = this.entitiesManager.getEntities().get(entityId);
                if (get(mapEditorEntityFileDroppedStore)) {
                    mapEditorEntityFileDroppedStore.set(false);
                    mapEditorEntityModeStore.set("EDIT");
                    mapEditorSelectedEntityIdStore.set(openEntity?.entityId);
                }
            })
            .catch((e) => console.error(e));
    }

    protected unbindEventHandlers(): void {
        this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.pointerMoveEventHandler);
        this.shiftKey?.off(Phaser.Input.Keyboard.Events.DOWN);
        this.shiftKey?.off(Phaser.Input.Keyboard.Events.UP);
        this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.pointerDownEventHandler);
    }

    protected unbindEntitiesManagerEventHandlers(): void {
        this.entitiesManager.off(EntitiesManagerEvent.UpdateEntity, this.handleUpdateEntity);
        this.entitiesManager.off(EntitiesManagerEvent.CopyEntity, this.handleCopyEntity);
    }

    private canEntityBePlaced(): boolean {
        const gameMapFrontWrapper = this.scene.getGameMapFrontWrapper();
        if (!this.entityPrefabPreview || !this.entityPrefab) {
            return false;
        }
        return gameMapFrontWrapper.canEntityBePlacedOnMap(
            this.entityPrefabPreview.getTopLeft(),
            this.entityPrefabPreview.displayWidth,
            this.entityPrefabPreview.displayHeight,
            this.entityPrefab.collisionGrid,
            undefined,
            this.shiftKey?.isDown,
        );
    }

    private updateEntityPrefabPreviewPosition(pointer: Pointer): void {
        if (!this.entityPrefabPreview || !this.entityPrefab) {
            return;
        }

        if (this.entityPrefab.collisionGrid || this.shiftKey?.isDown) {
            const offset = this.getEntityPrefabAlignWithGridOffset();
            this.entityPrefabPreview.setPosition(
                Math.floor(pointer.worldX / 32) * 32 + offset.x,
                Math.floor(pointer.worldY / 32) * 32 + offset.y,
            );
        } else {
            this.entityPrefabPreview.setPosition(Math.floor(pointer.worldX), Math.floor(pointer.worldY));
        }

        this.entityPrefabPreview.setDepth(
            this.entityPrefabPreview.y +
                this.entityPrefabPreview.displayHeight * 0.5 +
                (this.entityPrefab.depthOffset ?? 0),
        );
    }

    private updateEntity(entityData: EntityData) {
        // Create commande to update entity data
        this.mapEditorModeManager
            .executeCommand(
                new UpdateEntityFrontCommand(
                    this.scene.getGameMap().getWamFile()!,
                    entityData.id,
                    {
                        ...entityData,
                    },
                    undefined,
                    undefined,
                    this.entitiesManager,
                    this.scene,
                ),
            )
            .catch((e) => console.error(e));
    }

    private copyEntity = (data: CopyEntityEventData) => {
        if (!CopyEntityEventData.parse(data)) {
            return;
        }
        const entityData: WAMEntityData = {
            x: data.position.x,
            y: data.position.y,
            prefabRef: data.prefabRef,
            properties: data.properties ?? [],
        };
        this.mapEditorModeManager
            .executeCommand(
                new CreateEntityFrontCommand(
                    this.scene.getGameMap().getWamFile()!,
                    undefined,
                    entityData,
                    undefined,
                    this.entitiesManager,
                    data.entityDimensions,
                ),
            )
            .catch((e) => console.error(e));
        this.cleanPreview();
    };

}
