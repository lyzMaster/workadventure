<script lang="ts">
    import type { EntityVariant } from "../../front/Phaser/Game/MapEditor/Entities/EntityVariant";
    import type { FurnitureEditorController } from "./FurnitureEditorController";

    interface Props {
        controller: FurnitureEditorController;
        variants: EntityVariant[];
        selectedPrefabId?: string;
    }

    let { controller, variants, selectedPrefabId }: Props = $props();
    let search = $state("");

    const filteredVariants = $derived.by(() =>
        variants.filter((variant) =>
            variant.defaultPrefab.name.toLowerCase().includes(search.trim().toLowerCase()),
        ),
    );
</script>

<div class="flex flex-col gap-3">
    <div class="flex flex-col gap-1">
        <h2 class="m-0 text-xl">家具目录</h2>
        <input bind:value={search} placeholder="搜索家具" />
    </div>

    <div class="flex flex-col gap-2 overflow-auto" data-testid="standalone-furniture-catalog">
        {#each filteredVariants as variant (variant.id)}
            <button
                class:active={variant.defaultPrefab.id === selectedPrefabId}
                data-testid={`standalone-prefab-${variant.defaultPrefab.id}`}
                onclick={() => controller.pickPrefab(variant.defaultPrefab)}
            >
                {variant.defaultPrefab.name}
            </button>
        {/each}
    </div>
</div>
