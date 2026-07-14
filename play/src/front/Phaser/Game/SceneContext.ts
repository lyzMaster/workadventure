import type * as Phaser from "phaser";
import type { EntityPermissions, GameMap } from "@workadventure/map-editor";
import type { SuperLoaderPlugin } from "../Services/SuperLoaderPlugin";
import type { UserInputManager } from "../UserInput/UserInputManager";
import type { Player } from "../Player/Player";
import type { Character } from "../Entity/Character";
import type { EntitiesCollectionsManager } from "./MapEditor/EntitiesCollectionsManager";
import type { GameMapFrontWrapper } from "./GameMap/GameMapFrontWrapper";
import type { CameraManager } from "./CameraManager";
import type { MapEditorRuntimeController } from "./MapEditor/MapEditorController";
import type { PathfindingManager } from "../../Utils/PathfindingManager";
import type { UsernameDomLayer } from "./UsernameDomLayer";
import type { OutlineManager } from "./UI/OutlineManager";

export type CharacterSceneContext = Phaser.Scene & {
    readonly superLoad: SuperLoaderPlugin;
    readonly usernameDomLayer: Pick<UsernameDomLayer, "addUsername" | "invalidateAncestorScale" | "getAncestorScale">;
    roomUrl: string;
    connection?: {
        getUserId?(): number | undefined;
        emitFollowRequest?(): void;
        emitFollowConfirmation?(user: unknown): void;
        emitFollowAbort?(): void;
        emitAskPosition?(userUuid: string, roomUrl: string, type?: "move" | "locate", userId?: number): void;
    };
    MapPlayersByKey: Pick<Map<number, { x: number; y: number }>, "get">;
    markDirty(): void;
};

export type MapEditorSceneContext = Phaser.Scene & {
    CurrentPlayer?: Player;
    MapPlayersByKey?: Pick<Map<number, Character | Player>, "get">;
    roomUrl: string;
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
    getPathfindingManager(): PathfindingManager;
    getEntityPermissions(): EntityPermissions;
    getEntityPermissionsPromise(): Promise<EntityPermissions>;
    getOutlineManager(): OutlineManager;
    getRemotePlayersRepository(): { getPlayers(): Map<number, { getPosition(): { x: number; y: number } }> };
    handleMouseWheel(deltaY: number): void;
    moveTo(
        position: { x: number; y: number },
        tryFindingNearestAvailable?: boolean,
        speed?: number,
    ): Promise<{ x: number; y: number; cancelled: boolean }>;
    walkToPersonalDesk(): Promise<void>;
    playSound(key: string, volume?: number): void;
    sendViewportToServer?(): void;
    reposition?(): void;
    markDirty(): void;
};
