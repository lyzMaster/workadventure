import type { EntityDataProperties, EntityPrefab } from "@workadventure/map-editor";
import { writable } from "svelte/store";

export type MapEditorEntityToolMode = "ADD" | "EDIT";

export const mapEditorSelectedEntityIdStore = writable<string | undefined>(undefined);

export const mapEditorSelectedEntityDraggedStore = writable<boolean>(false);

export const mapEditorEntityModeStore = writable<MapEditorEntityToolMode>("ADD");

export const mapEditorSelectedEntityPrefabStore = writable<EntityPrefab | undefined>(undefined);

export const mapEditorCopiedEntityDataPropertiesStore = writable<EntityDataProperties | undefined>(undefined);

export const mapEditorEntityFileDroppedStore = writable<boolean>(false);

export type CategoryTag =
    | {
          kind: "tag";
          tag: string;
      }
    | {
          kind: "special";
          tag: "most_used" | "custom";
      };

export type SelectableTag = CategoryTag | undefined;

export const selectCategoryStore = writable<SelectableTag>(undefined);
