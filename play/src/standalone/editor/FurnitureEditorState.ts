import { writable, type Readable } from "svelte/store";

export interface FurnitureEditorSelectedPrefab {
    collectionName: string;
    prefabId: string;
}

export interface FurnitureEditorState {
    active: boolean;
    mode: "browse" | "placing" | "selected";
    selectedEntityId?: string;
    selectedPrefab?: FurnitureEditorSelectedPrefab;
    canUndo: boolean;
    canRedo: boolean;
}

const initialState: FurnitureEditorState = {
    active: false,
    mode: "browse",
    canUndo: false,
    canRedo: false,
};

export class FurnitureEditorStateStore {
    private readonly store = writable<FurnitureEditorState>(initialState);

    public subscribe: Readable<FurnitureEditorState>["subscribe"] = this.store.subscribe;

    public set(state: FurnitureEditorState): void {
        this.store.set(state);
    }

    public reset(): void {
        this.store.set(initialState);
    }
}
