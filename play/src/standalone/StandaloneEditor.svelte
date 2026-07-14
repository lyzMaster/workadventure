<script lang="ts">
    import { onDestroy } from "svelte";
    import type { EntityPrefab } from "@workadventure/map-editor";
    import type { Unsubscriber } from "svelte/store";
    import type { EntityVariant } from "../front/Phaser/Game/MapEditor/Entities/EntityVariant";
    import type {
        DefaultStandaloneSceneController,
        StandaloneSceneControllerState,
    } from "./StandaloneSceneController";
    import type { StandaloneGameScene } from "./runtime/StandaloneGameScene";
    import { FurnitureEditorController } from "./editor/FurnitureEditorController";
    import type { FurnitureEditorState } from "./editor/FurnitureEditorState";
    import FurnitureCatalog from "./editor/FurnitureCatalog.svelte";
    import FurnitureEditorToolbar from "./editor/FurnitureEditorToolbar.svelte";
    import FurnitureInspector from "./editor/FurnitureInspector.svelte";

    interface Props {
        controller: DefaultStandaloneSceneController;
    }

    let { controller }: Props = $props();
    const furnitureController = new FurnitureEditorController();

    let clearing = $state(false);
    let variants: EntityVariant[] = $state([]);
    let selectedPrefab = $state<EntityPrefab>();
    let selectedVariant = $state<EntityVariant>();
    let controllerSnapshot = $state<StandaloneSceneControllerState>({
        activeSceneId: null,
        activeDefinition: null,
        scene: null,
        loading: false,
        error: null,
    });
    let editorSnapshot = $state<FurnitureEditorState>({
        active: false,
        mode: "browse",
        canUndo: false,
        canRedo: false,
    });

    let trackedScene: StandaloneGameScene | null = null;
    let variantsUnsubscriber: Unsubscriber | undefined;

    function refreshSelectedPrefab(scene: StandaloneGameScene | null): void {
        if (!scene) {
            selectedPrefab = undefined;
            selectedVariant = undefined;
            return;
        }
        selectedPrefab = editorSnapshot.selectedEntityId
            ? scene.getEntityById(editorSnapshot.selectedEntityId)?.getPrefab()
            : scene.getPendingFurniturePrefab();
        selectedVariant = selectedPrefab
            ? variants.find((variant) => variant.prefabIds.includes(selectedPrefab?.id ?? ""))
            : undefined;
    }

    function bindScene(scene: StandaloneGameScene | null): void {
        if (trackedScene === scene) {
            refreshSelectedPrefab(scene);
            return;
        }
        trackedScene = scene;
        furnitureController.attachScene(scene);
        variantsUnsubscriber?.();
        variantsUnsubscriber = undefined;
        variants = [];
        if (!scene) {
            refreshSelectedPrefab(null);
            return;
        }
        variantsUnsubscriber = scene
            .getEntitiesCollectionsManager()
            .getEntitiesPrefabsVariantStore()
            .subscribe((nextVariants) => {
                variants = nextVariants;
                refreshSelectedPrefab(scene);
            });
        refreshSelectedPrefab(scene);
    }

    const editorUnsubscriber = furnitureController.getState().subscribe((state) => {
        editorSnapshot = state;
        refreshSelectedPrefab(controllerSnapshot.scene);
    });

    $effect(() => {
        const controllerUnsubscriber = controller.getState().subscribe((state) => {
            controllerSnapshot = state;
            bindScene(state.scene);
        });

        return () => {
            controllerUnsubscriber();
        };
    });

    async function clearAndReload() {
        const activeDefinition = controllerSnapshot.activeDefinition;
        if (!activeDefinition) return;
        if (!window.confirm(`清除 ${activeDefinition.displayName} 的本地装修并恢复基础地图？`)) return;
        clearing = true;
        try {
            await controller.clearActiveOverlayAndReload();
        } finally {
            clearing = false;
        }
    }

    onDestroy(() => {
        editorUnsubscriber();
        variantsUnsubscriber?.();
    });
</script>

<FurnitureEditorToolbar
    {controller}
    {furnitureController}
    editorState={editorSnapshot}
    controllerState={controllerSnapshot}
    sceneDefinitions={controller.getSceneDefinitions()}
    {clearing}
    onClear={clearAndReload}
/>

{#if controllerSnapshot.scene && editorSnapshot.active && !controllerSnapshot.loading}
    <aside class="standalone-editor-panel" data-testid="standalone-editor-panel">
        <div class="grid grid-cols-2 gap-4 h-full">
            <FurnitureCatalog
                controller={furnitureController}
                {variants}
                selectedPrefabId={editorSnapshot.selectedPrefab?.prefabId}
            />
            <FurnitureInspector
                controller={furnitureController}
                {selectedPrefab}
                {selectedVariant}
                selectedEntityId={editorSnapshot.selectedEntityId}
            />
        </div>
    </aside>
{/if}
