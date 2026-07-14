<script lang="ts">
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { mapEditorEntityModeStore } from "../../../Stores/MapEditorStore";
    import EntityEditorPicker from "./EntityEditorPicker.svelte";
    import EntityPropertiesEditor from "./EntityPropertiesEditor.svelte";

    const scene = gameManager.getCurrentGameScene();
</script>

{#if $mapEditorEntityModeStore === "ADD"}
    <EntityEditorPicker {scene} />
{/if}
{#if $mapEditorEntityModeStore === "EDIT"}
    <EntityPropertiesEditor />
{/if}
