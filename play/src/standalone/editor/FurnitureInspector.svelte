<script lang="ts">
    import type { EntityPrefab } from "@workadventure/map-editor";
    import type { EntityVariant } from "../../front/Phaser/Game/MapEditor/Entities/EntityVariant";
    import type { FurnitureEditorController } from "./FurnitureEditorController";
    import FurnitureVariantPicker from "./FurnitureVariantPicker.svelte";

    interface Props {
        controller: FurnitureEditorController;
        selectedPrefab?: EntityPrefab;
        selectedVariant?: EntityVariant;
        selectedEntityId?: string;
    }

    let { controller, selectedPrefab, selectedVariant, selectedEntityId }: Props = $props();
</script>

{#if selectedPrefab && selectedVariant}
    <div class="flex flex-col gap-4">
        <h2 class="m-0 text-xl">{selectedPrefab.name}</h2>
        {#if selectedEntityId}
            <p class="m-0 opacity-70" data-testid="standalone-selected-entity-id">Entity: {selectedEntityId}</p>
            <p class="m-0 opacity-70">拖动家具可改变位置；Delete/Backspace 可删除。</p>
        {:else}
            <p class="m-0 opacity-70">当前修改的是待放置家具，点击画布后将使用这里选中的变体。</p>
        {/if}
        <FurnitureVariantPicker
            {selectedPrefab}
            variant={selectedVariant}
            onPickItem={(prefab) => controller.applyPrefabSelection(prefab)}
        />
        {#if selectedEntityId}
            <button class="danger" data-testid="standalone-delete-entity" onclick={() => void controller.deleteSelected()}
                >删除家具</button
            >
        {/if}
    </div>
{:else}
    <div class="flex flex-col gap-2">
        <h2 class="m-0 text-xl">放置家具</h2>
        <p class="m-0 opacity-70">从左侧选择家具后，在画布中点击即可放置。</p>
    </div>
{/if}
