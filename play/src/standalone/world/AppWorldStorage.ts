import type { AppWorldSnapshot } from "@workadventure/app-world";

export interface AppWorldSummary {
    worldId: string;
    revision: number;
    activeSceneId: string;
    updatedAt: string;
}

export interface AppWorldStorage {
    load(worldId: string): Promise<AppWorldSnapshot | null>;
    save(worldId: string, snapshot: AppWorldSnapshot): Promise<void>;
    clear(worldId: string): Promise<void>;
    list?(): Promise<AppWorldSummary[]>;
}
