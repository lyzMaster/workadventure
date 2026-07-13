import type { WAMFileFormat } from "@workadventure/map-editor";
import type { PositionInterface } from "../../Connection/ConnexionModels";
import type { GameScene } from "./GameScene";
import type { MapEditTransport } from "./MapEditor/MapEditTransport";

/**
 * Runtime boundary between the reusable Phaser scene and the environment that
 * supplies room state. The default online runtime stays inside GameScene;
 * standalone injects an implementation that never opens a network transport.
 */
export interface GameSceneRuntime {
    prepareWam?(wam: WAMFileFormat): Promise<WAMFileFormat>;
    createMapEditTransport?(scene: GameScene): MapEditTransport;
    getDefaultSpawn?(): PositionInterface | undefined;
    flushPersistence?(): Promise<void>;
    initialize(scene: GameScene): Promise<void>;
}
