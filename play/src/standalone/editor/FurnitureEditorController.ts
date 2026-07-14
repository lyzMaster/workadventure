import type { EntityPrefab } from "@workadventure/map-editor";
import type { Readable } from "svelte/store";
import type { StandaloneGameScene } from "../runtime/StandaloneGameScene";
import type { StandaloneEntityMapEditorSnapshot } from "../runtime/StandaloneEntityMapEditorModeManager";
import { FurnitureEditorStateStore, type FurnitureEditorState } from "./FurnitureEditorState";

export class FurnitureEditorController {
    private readonly stateStore = new FurnitureEditorStateStore();
    private scene: StandaloneGameScene | null = null;

    public getState(): Readable<FurnitureEditorState> {
        return this.stateStore;
    }

    public attachScene(scene: StandaloneGameScene | null): void {
        this.scene = scene;
        this.syncFromRuntime();
    }

    public getScene(): StandaloneGameScene | null {
        return this.scene;
    }

    public syncFromRuntime(snapshot?: StandaloneEntityMapEditorSnapshot): void {
        const runtime = snapshot ?? this.scene?.getStandaloneEntityEditorSnapshot();
        if (!runtime) {
            this.stateStore.reset();
            return;
        }

        const selectedEntity = runtime.selectedEntityId ? this.scene?.getEntityById(runtime.selectedEntityId) : undefined;
        const selectedPrefab = selectedEntity?.getPrefab();

        this.stateStore.set({
            active: runtime.active,
            mode: selectedEntity
                ? "selected"
                : this.scene?.getPendingFurniturePrefab()
                  ? "placing"
                  : "browse",
            selectedEntityId: runtime.selectedEntityId,
            selectedPrefab: this.toSelectedPrefab(this.scene?.getPendingFurniturePrefab() ?? selectedPrefab),
            canUndo: runtime.canUndo,
            canRedo: runtime.canRedo,
        });
    }

    public open(): void {
        this.scene?.openFurnitureEditor();
        this.syncFromRuntime();
    }

    public close(): void {
        this.scene?.closeFurnitureEditor();
        this.syncFromRuntime();
    }

    public clearSelection(): void {
        this.scene?.clearFurnitureSelection();
        this.syncFromRuntime();
    }

    public pickPrefab(prefab: EntityPrefab): void {
        this.scene?.beginFurniturePlacement(prefab);
        this.syncFromRuntime();
    }

    public async deleteSelected(): Promise<void> {
        await this.scene?.deleteSelectedFurniture();
        this.syncFromRuntime();
    }

    public async updateSelectedPrefab(prefab: EntityPrefab): Promise<void> {
        await this.scene?.updateSelectedFurniturePrefab(prefab);
        this.syncFromRuntime();
    }

    public async undo(): Promise<void> {
        await this.scene?.getMapEditorModeManager().undoCommand();
        this.syncFromRuntime();
    }

    public async redo(): Promise<void> {
        await this.scene?.getMapEditorModeManager().redoCommand();
        this.syncFromRuntime();
    }

    private toSelectedPrefab(prefab: EntityPrefab | undefined) {
        if (!prefab) {
            return undefined;
        }
        return {
            collectionName: prefab.collectionName,
            prefabId: prefab.id,
        };
    }
}
