<script lang="ts">
    import type { EntityPrefab } from "@workadventure/map-editor";
    import type { EntityVariant } from "../../front/Phaser/Game/MapEditor/Entities/EntityVariant";
    import EntityVariantColorPicker from "../../front/Components/MapEditor/EntityEditor/EntityItem/EntityVariantColorPicker.svelte";
    import EntityVariantPositionPicker from "../../front/Components/MapEditor/EntityEditor/EntityItem/EntityVariantPositionPicker.svelte";

    interface Props {
        selectedPrefab: EntityPrefab;
        variant: EntityVariant;
        onPickItem: (prefab: EntityPrefab) => void | Promise<void>;
    }

    let { selectedPrefab, variant, onPickItem }: Props = $props();
    let selectedColor = $derived(selectedPrefab.color);

    function onColorChange(color: string) {
        const prefab = variant.getEntityPrefabsPositions(color)[0];
        if (prefab) {
            void onPickItem(prefab);
        }
    }
</script>

<EntityVariantColorPicker colors={variant.colors} {selectedColor} onColorChange={onColorChange} />
<EntityVariantPositionPicker
    entityPrefabsPositions={variant.getEntityPrefabsPositions(selectedColor)}
    selectedEntity={selectedPrefab}
    onPickItem={(prefab) => void onPickItem(prefab)}
/>
