<script lang="ts">
    import type { DefaultStandaloneSceneController, StandaloneSceneControllerState } from "../StandaloneSceneController";
    import type { StandaloneSceneDefinition } from "../StandaloneSceneDefinition";
    import type { FurnitureEditorController } from "./FurnitureEditorController";
    import type { FurnitureEditorState } from "./FurnitureEditorState";

    interface Props {
        controller: DefaultStandaloneSceneController;
        furnitureController: FurnitureEditorController;
        editorState: FurnitureEditorState;
        controllerState: StandaloneSceneControllerState;
        sceneDefinitions: StandaloneSceneDefinition[];
        clearing: boolean;
        onClear: () => void | Promise<void>;
    }

    let { controller, furnitureController, editorState, controllerState, sceneDefinitions, clearing, onClear }: Props =
        $props();

    function switchScene(definition: StandaloneSceneDefinition) {
        if (controllerState.loading || definition.sceneId === controllerState.activeSceneId) return;
        controller.switchTo(definition.sceneId).catch((error) => {
            console.error("[Standalone] scene_load_failed: scene switch failed", error);
        });
    }
</script>

{#if controllerState.activeDefinition}
    <div class="standalone-editor-toolbar">
        <span class="standalone-scene-label" data-testid="standalone-active-scene">
            {controllerState.activeDefinition.displayName}{controllerState.loading ? " · Loading" : ""}
        </span>
        {#each sceneDefinitions as definition (definition.sceneId)}
            <button
                class:active={definition.sceneId === controllerState.activeSceneId}
                data-testid={`standalone-switch-${definition.sceneId}`}
                disabled={controllerState.loading || definition.sceneId === controllerState.activeSceneId}
                onclick={() => switchScene(definition)}>{definition.displayName}</button
            >
        {/each}

        {#if !editorState.active}
            <button
                data-testid="open-standalone-map-editor"
                disabled={controllerState.loading}
                onclick={() => furnitureController.open()}>编辑地图</button
            >
        {:else}
            <button
                data-testid="close-standalone-map-editor"
                disabled={controllerState.loading}
                onclick={() => furnitureController.close()}>关闭编辑</button
            >
            <button
                data-testid="standalone-undo"
                disabled={controllerState.loading || !editorState.canUndo}
                onclick={() => void furnitureController.undo()}>Undo</button
            >
            <button
                data-testid="standalone-redo"
                disabled={controllerState.loading || !editorState.canRedo}
                onclick={() => void furnitureController.redo()}>Redo</button
            >
            <button
                data-testid="standalone-clear-overlay"
                disabled={clearing || controllerState.loading}
                onclick={() => void onClear()}>清除 {controllerState.activeDefinition.displayName} 装修</button
            >
        {/if}
    </div>
{/if}
