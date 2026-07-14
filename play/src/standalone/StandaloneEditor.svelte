<script lang="ts">
    import type { EntityPrefab } from "@workadventure/map-editor";
    import { onDestroy } from "svelte";
    import { EditorToolName } from "../front/Phaser/Game/MapEditor/EditorToolName";
    import { UpdateEntityFrontCommand } from "../front/Phaser/Game/MapEditor/Commands/Entity/UpdateEntityFrontCommand";
    import type { EntityVariant } from "../front/Phaser/Game/MapEditor/Entities/EntityVariant";
    import EntityEditorPicker from "../front/Components/MapEditor/EntityEditor/EntityEditorPicker.svelte";
    import EntityVariantColorPicker from "../front/Components/MapEditor/EntityEditor/EntityItem/EntityVariantColorPicker.svelte";
    import EntityVariantPositionPicker from "../front/Components/MapEditor/EntityEditor/EntityItem/EntityVariantPositionPicker.svelte";
    import { gameSceneIsLoadedStore } from "../front/Stores/GameSceneLoadedStore";
    import {
        mapEditorEntityModeStore,
        mapEditorModeStore,
        mapEditorSelectedEntityStore,
    } from "../front/Stores/MapEditorStore";
    import type { DefaultStandaloneSceneController } from "./StandaloneSceneController";
    import type { StandaloneSceneDefinition } from "./StandaloneSceneDefinition";

    interface Props {
        controller: DefaultStandaloneSceneController;
    }

    let { controller }: Props = $props();
    let selectedVariant = $state<EntityVariant>();
    let selectedPrefab = $state<EntityPrefab>();
    let clearing = $state(false);
    let variantsUnsubscriber: (() => void) | undefined;
    let sceneDefinitions = $derived.by(() => controller.getSceneDefinitions());
    let controllerState = $derived.by(() => controller.getState());
    let scene = $derived($controllerState.scene);
    let activeDefinition = $derived($controllerState.activeDefinition);
    let loading = $derived($controllerState.loading);

    const selectedEntityUnsubscriber = mapEditorSelectedEntityStore.subscribe((entity) => {
        selectedPrefab = entity?.getPrefab();
        refreshSelectedVariant();
    });

    $effect(() => {
        variantsUnsubscriber?.();
        variantsUnsubscriber = undefined;
        if (!$gameSceneIsLoadedStore || variantsUnsubscriber) return;
        if (!scene) return;
        variantsUnsubscriber = scene
            .getEntitiesCollectionsManager()
            .getEntitiesPrefabsVariantStore()
            .subscribe(() => refreshSelectedVariant());
    });

    function refreshSelectedVariant() {
        if (!$gameSceneIsLoadedStore || !selectedPrefab || !scene) {
            selectedVariant = undefined;
            return;
        }
        const manager = scene.getEntitiesCollectionsManager();
        const unsubscribe = manager.getEntitiesPrefabsVariantStore().subscribe((variants) => {
            selectedVariant = variants.find((variant) => variant.prefabIds.includes(selectedPrefab?.id ?? ""));
        });
        unsubscribe();
    }

    function openEditor() {
        if (!scene || loading) return;
        mapEditorModeStore.switchMode(true);
        scene.getMapEditorModeManager().equipTool(EditorToolName.EntityEditor);
    }

    function closeEditor() {
        mapEditorModeStore.switchMode(false);
    }

    async function updateSelectedPrefab(prefab: EntityPrefab) {
        const entity = $mapEditorSelectedEntityStore;
        if (!entity || !scene || loading) return;
        await scene
            .getMapEditorModeManager()
            .executeCommand(
                new UpdateEntityFrontCommand(
                    scene.getGameMap().getWamFile()!,
                    entity.entityId,
                    { prefabRef: { collectionName: prefab.collectionName, id: prefab.id } },
                    undefined,
                    undefined,
                    scene.getGameMapFrontWrapper().getEntitiesManager(),
                    scene,
                ),
            );
        selectedPrefab = prefab;
        refreshSelectedVariant();
    }

    async function updateSelectedColor(color: string) {
        const prefab = selectedVariant?.getEntityPrefabsPositions(color)[0];
        if (prefab) await updateSelectedPrefab(prefab);
    }

    async function clearAndReload() {
        if (!activeDefinition) return;
        if (!window.confirm(`清除 ${activeDefinition.displayName} 的本地装修并恢复基础地图？`)) return;
        clearing = true;
        try {
            await controller.clearActiveOverlayAndReload();
        } finally {
            clearing = false;
        }
    }

    function switchScene(definition: StandaloneSceneDefinition) {
        if (loading || definition.sceneId === $controllerState.activeSceneId) return;
        controller.switchTo(definition.sceneId).catch((error) => {
            console.error("[Standalone] scene_load_failed: scene switch failed", error);
        });
    }

    onDestroy(() => {
        selectedEntityUnsubscriber();
        variantsUnsubscriber?.();
    });
</script>

{#if scene && activeDefinition}
    <div class="standalone-editor-toolbar">
        <span class="standalone-scene-label" data-testid="standalone-active-scene">
            {activeDefinition.displayName}{loading ? " · Loading" : ""}
        </span>
        {#each sceneDefinitions as definition (definition.sceneId)}
            <button
                class:active={definition.sceneId === $controllerState.activeSceneId}
                data-testid={`standalone-switch-${definition.sceneId}`}
                disabled={loading || definition.sceneId === $controllerState.activeSceneId}
                onclick={() => switchScene(definition)}>{definition.displayName}</button
            >
        {/each}
        {#if !$mapEditorModeStore}
            <button data-testid="open-standalone-map-editor" disabled={loading} onclick={openEditor}>编辑地图</button>
        {:else}
            <button data-testid="close-standalone-map-editor" disabled={loading} onclick={closeEditor}>关闭编辑</button>
            <button
                data-testid="standalone-undo"
                disabled={loading}
                onclick={() => scene.getMapEditorModeManager().undoCommand()}>Undo</button
            >
            <button
                data-testid="standalone-redo"
                disabled={loading}
                onclick={() => scene.getMapEditorModeManager().redoCommand()}>Redo</button
            >
            <button data-testid="standalone-clear-overlay" disabled={clearing || loading} onclick={clearAndReload}
                >清除 {activeDefinition.displayName} 装修</button
            >
        {/if}
    </div>

    {#if $mapEditorModeStore && !loading}
        <aside class="standalone-editor-panel" data-testid="standalone-editor-panel">
            {#if $mapEditorEntityModeStore === "ADD"}
                <EntityEditorPicker allowUpload={false} {scene} />
            {:else if $mapEditorSelectedEntityStore}
                <div class="flex flex-col gap-4">
                    <h2 class="m-0 text-xl">已选择 {$mapEditorSelectedEntityStore.getPrefab().name}</h2>
                    <p class="m-0 opacity-70">拖动家具可改变位置；Delete/Backspace 可删除。</p>
                    {#if selectedVariant && selectedPrefab}
                        <EntityVariantColorPicker
                            colors={selectedVariant.colors}
                            selectedColor={selectedPrefab.color}
                            onColorChange={updateSelectedColor}
                        />
                        <EntityVariantPositionPicker
                            entityPrefabsPositions={selectedVariant.getEntityPrefabsPositions(selectedPrefab.color)}
                            selectedEntity={selectedPrefab}
                            onPickItem={updateSelectedPrefab}
                        />
                    {/if}
                    <button
                        class="danger"
                        data-testid="standalone-delete-entity"
                        onclick={() => $mapEditorSelectedEntityStore?.delete()}>删除家具</button
                    >
                </div>
            {/if}
        </aside>
    {/if}
{/if}
