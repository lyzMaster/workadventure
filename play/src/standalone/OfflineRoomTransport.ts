import type { WAMFileFormat } from "@workadventure/map-editor";
import type { PositionInterface } from "../front/Connection/ConnexionModels";
import type { GameScene } from "../front/Phaser/Game/GameScene";
import type { GameSceneRuntime } from "../front/Phaser/Game/GameSceneRuntime";
import type { MapEditTransport } from "../front/Phaser/Game/MapEditor/MapEditTransport";
import { LocalMapEditTransport } from "./LocalMapEditTransport";
import { mergeSceneOverlay } from "./SceneOverlay";
import type { SceneStorage } from "./SceneStorage";
import type { StandaloneSceneDefinition } from "./StandaloneSceneDefinition";
import type { StaticCharacterAssetCatalog } from "./StaticCharacterAssetCatalog";

/** A deliberately inert room transport: it only completes local scene startup. */
export class OfflineRoomTransport implements GameSceneRuntime {
    public constructor(
        private readonly characterAssets: StaticCharacterAssetCatalog,
        private readonly characterTextureIds: string[],
        private readonly definition: StandaloneSceneDefinition,
        private readonly storage: SceneStorage,
    ) {}

    private baseEntityIds: string[] = [];
    private mapEditTransport: LocalMapEditTransport | undefined;

    public async prepareWam(baseWam: WAMFileFormat): Promise<WAMFileFormat> {
        this.baseEntityIds = Object.keys(baseWam.entities);
        try {
            const overlay = await this.storage.loadOverlay(this.definition.sceneId);
            if (!overlay) {
                return baseWam;
            }
            const result = mergeSceneOverlay(baseWam, this.definition, overlay);
            if (!result.ok) {
                const code = result.code === "scene_mismatch" ? "overlay_scene_mismatch" : result.code;
                console.error(`[Standalone] ${code}: ${result.message}`);
            }
            return result.wam;
        } catch (error) {
            console.error("[Standalone] overlay_load_failed: unable to load SceneOverlay; using the base WAM", error);
            return baseWam;
        }
    }

    public createMapEditTransport(scene: GameScene): MapEditTransport {
        this.mapEditTransport = new LocalMapEditTransport(
            this.definition,
            this.storage,
            () => scene.getGameMap().getWamFile(),
            this.baseEntityIds,
        );
        return this.mapEditTransport;
    }

    public getDefaultSpawn(): PositionInterface | undefined {
        return this.definition.defaultSpawn
            ? { x: this.definition.defaultSpawn.x, y: this.definition.defaultSpawn.y }
            : undefined;
    }

    public async flushPersistence(): Promise<void> {
        await this.mapEditTransport?.flush();
    }

    public initialize(scene: GameScene): Promise<void> {
        return scene.initializeLocalPlayer(this.characterAssets.resolve(this.characterTextureIds));
    }
}
