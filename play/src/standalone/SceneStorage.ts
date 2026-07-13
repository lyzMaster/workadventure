import type { SceneOverlay } from "./SceneOverlay";

export interface SceneOverlaySummary {
    sceneId: string;
    baseMapId: string;
    baseMapRevision: number;
    updatedAt: string;
}

export interface SceneStorage {
    loadOverlay(sceneId: string): Promise<SceneOverlay | null>;
    saveOverlay(sceneId: string, overlay: SceneOverlay): Promise<void>;
    clearOverlay(sceneId: string): Promise<void>;
    listOverlays?(): Promise<SceneOverlaySummary[]>;
}
