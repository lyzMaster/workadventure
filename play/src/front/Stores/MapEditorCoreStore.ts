import { writable } from "svelte/store";
import type { EditorToolName } from "../Phaser/Game/MapEditor/EditorToolName";

export const mapEditorVisibilityStore = writable<boolean>(true);

function createMapEditorModeStore() {
    const { set, subscribe } = writable(false);

    subscribe((value) => {
        mapEditorVisibilityStore.set(value === true);
    });

    return {
        subscribe,
        set,
        switchMode: (value: boolean) => {
            set(value);
        },
    };
}

export const mapEditorModeStore = createMapEditorModeStore();

export const mapEditorSelectedToolStore = writable<EditorToolName | undefined>(undefined);
