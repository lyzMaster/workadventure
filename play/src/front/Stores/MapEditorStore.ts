import type {
    AreaData,
} from "@workadventure/map-editor";
import { writable } from "svelte/store";
export { mapEditorModeStore, mapEditorSelectedToolStore, mapEditorVisibilityStore } from "./MapEditorCoreStore";
import type { MapEditorEntityToolMode } from "./MapEditorEntityEditorStore";
export {
    mapEditorCopiedEntityDataPropertiesStore,
    mapEditorDeleteCustomEntityEventStore,
    mapEditorEntityFileDroppedStore,
    mapEditorEntityModeStore,
    mapEditorEntityUploadEventStore,
    mapEditorModifyCustomEntityEventStore,
    mapEditorSelectedEntityDraggedStore,
    mapEditorSelectedEntityIdStore,
    mapEditorSelectedEntityPrefabStore,
    selectCategoryStore,
    type CategoryTag,
    type MapEditorEntityToolMode,
    type SelectableTag,
} from "./MapEditorEntityEditorStore";
import type { AreaPreview } from "../Phaser/Components/MapEditor/AreaPreview";
import type { Entity } from "../Phaser/ECS/Entity";
export type MapEditorAreaToolMode = "ADD" | "EDIT";

export const mapEditorSelectedAreaPreviewStore = writable<AreaPreview | undefined>(undefined);

export const mapEditorAreaModeStore = writable<MapEditorEntityToolMode>("ADD");

export enum WAM_SETTINGS_EDITOR_TOOL_MENU_ITEM {
    Megaphone = "Megaphone",
    Recording = "Recording",
    RoomSettings = "Room Settings",
    MatrixRoomList = "Matrix Room List",
}

export const mapEditorWamSettingsEditorToolCurrentMenuItemStore = writable<
    WAM_SETTINGS_EDITOR_TOOL_MENU_ITEM | undefined
>(undefined);

export const mapExplorationModeStore = writable<boolean>(false);
export const mapExplorationObjectSelectedStore = writable<Entity | AreaPreview | undefined>(undefined);
export const mapExplorationEntitiesStore = writable<Map<string, Entity>>(new Map());
export const mapExplorationAreasStore = writable<Map<string, AreaPreview> | undefined>(new Map());
export const mapEditorAskToClaimPersonalAreaStore = writable<AreaData | undefined>(undefined);

export const mapEditorRestrictedPropertiesStore = writable<string[]>([]);
