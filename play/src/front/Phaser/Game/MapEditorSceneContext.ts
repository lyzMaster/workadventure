import type * as Phaser from "phaser";
import type { EntityPermissions, GameMap } from "@workadventure/map-editor";
import type { UserInputManager } from "../UserInput/UserInputManager";
import type { EntitiesCollectionsManager } from "./MapEditor/EntitiesCollectionsManager";
import type { GameMapFrontWrapper } from "./GameMap/GameMapFrontWrapper";
import type { CameraManager } from "./CameraManager";
import type { MapEditorRuntimeController } from "./MapEditor/MapEditorController";
import type { OutlineManager } from "./UI/OutlineManager";

export type MapEditorSceneContext = Phaser.Scene & {
    CurrentPlayer?: Phaser.GameObjects.GameObject & {
        x: number;
        y: number;
        getPosition(): { x: number; y: number };
        destroyText?(id: string): void;
        playText?(
            id: string,
            text: string,
            duration?: number,
            callback?: () => void,
            createStackAnimation?: boolean,
            type?: "warning" | "message",
        ): void;
    };
    MapPlayersByKey?: Pick<Map<number, Phaser.GameObjects.GameObject & { x: number; y: number }>, "get">;
    roomUrl?: string;
    connection?: {
        getAllTags(): string[];
        hasTag?(tag: string): boolean;
    };
    userInputManager: Pick<
        UserInputManager,
        | "disableControls"
        | "restoreControls"
        | "disableRightClick"
        | "restoreRightClick"
        | "isControlsEnabled"
        | "isRightClickEnabled"
    >;
    sceneReadyToStartPromise: Promise<void>;
    getGameMap(): GameMap;
    getGameMapFrontWrapper(): GameMapFrontWrapper;
    getEntitiesCollectionsManager(): EntitiesCollectionsManager;
    getCustomEntityCollectionUrl(): string;
    getCameraManager(): CameraManager;
    getMapEditorModeManager(): MapEditorRuntimeController;
    getEntityPermissions(): EntityPermissions;
    getEntityPermissionsPromise(): Promise<EntityPermissions>;
    getOutlineManager(): OutlineManager;
    handleMouseWheel(deltaY: number): void;
    moveTo?(position: { x: number; y: number }, tryFindingNearestAvailable?: boolean, speed?: number): Promise<unknown>;
    playSound(key: string, volume?: number): void;
    sendViewportToServer?(): void;
    reposition?(): void;
    markDirty(): void;
};
