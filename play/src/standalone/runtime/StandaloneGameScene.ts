import * as Phaser from "phaser";
import type { ITiledMap, ITiledMapTileset } from "@workadventure/tiled-map-type-guard";
import {
    EntityPermissions,
    type EntityPrefab,
    type EntityPrefabType,
    GameMap,
    normalizeStandaloneWam,
    standaloneWamToStorageDto,
    storageDtoToStandaloneWam,
    type WAMFileFormat,
} from "@workadventure/map-editor";
import { Direction, type CharacterMoveResult } from "@workadventure/game-model";
import { DirtyScene } from "../../front/Phaser/Game/DirtyScene";
import { SuperLoaderPlugin } from "../../front/Phaser/Services/SuperLoaderPlugin";
import type { WokaTextureDescriptionInterface } from "../../front/Phaser/Entity/PlayerTextures";
import { lazyLoadPlayerCharacterTextures } from "../../front/Phaser/Entity/PlayerTexturesLoadingManager";
import { UserInputManager } from "../../front/Phaser/UserInput/UserInputManager";
import { waScaleManager } from "../../front/Phaser/Services/WaScaleManager";
import { GameMapFrontWrapper } from "../../front/Phaser/Game/GameMap/GameMapFrontWrapper";
import { EntitiesCollectionsManager } from "../../front/Phaser/Game/MapEditor/EntitiesCollectionsManager";
import { CameraManager } from "../../front/Phaser/Game/CameraManager";
import type { MapEditorRuntimeController } from "../../front/Phaser/Game/MapEditor/MapEditorController";
import { EditorToolName } from "../../front/Phaser/Game/MapEditor/EditorToolName";
import { OutlineManager } from "../../front/Phaser/Game/UI/OutlineManager";
import type { Entity } from "../../front/Phaser/ECS/Entity";
import { mapEditorModeStore } from "../../front/Stores/MapEditorCoreStore";
import {
    mapEditorEntityModeStore,
    mapEditorSelectedEntityIdStore,
    mapEditorSelectedEntityPrefabStore,
} from "../../front/Stores/MapEditorEntityEditorStore";
import type { SceneStorage } from "../SceneStorage";
import { mergeSceneOverlay } from "../SceneOverlay";
import { LocalMapEditTransport } from "../LocalMapEditTransport";
import type { StandaloneSceneDefinition } from "../StandaloneSceneDefinition";
import type { StandaloneSceneContext } from "../StandaloneSceneResolver";
import { StandaloneUserInputHandler } from "./StandaloneUserInputHandler";
import { StandaloneEntityMapEditorModeManager } from "./StandaloneEntityMapEditorModeManager";
import { UpdateEntityFrontCommand } from "../../front/Phaser/Game/MapEditor/Commands/Entity/UpdateEntityFrontCommand";
import type { CharacterRuntimeHost } from "../characters/CharacterRuntimeHost";
import { CharacterNameLayer } from "../characters/CharacterNameLayer";
import { DEFAULT_LOCAL_PLAYER_MOVEMENT, LocalPlayer } from "../characters/LocalPlayer";
import { characterMovedEventName, type CharacterMovedEvent } from "../characters/CharacterEvents";
import { CharacterPathfinder } from "../pathfinding/CharacterPathfinder";
import { AgentCharacterRepository } from "../characters/AgentCharacterRepository";
import { AgentCharacterController } from "../characters/AgentCharacterController";
import { PhaserAgentCharacterTextureLoader } from "../characters/AgentCharacterTextureLoader";
import type { StandaloneCharacter } from "../characters/StandaloneCharacter";
import type { CollisionGridProvider } from "../pathfinding/CollisionGridProvider";
import { FurnitureRuntimeController } from "../furniture/FurnitureRuntimeController";
import { StandaloneAgentCommandAdapter } from "../commands/StandaloneAgentCommandAdapter";
import type { WorldSceneRuntime } from "../commands/types";
import { Deferred } from "../../common/Deferred";

type Position = { x: number; y: number };
type Tilemap = Phaser.Tilemaps.Tilemap;
type Tileset = Phaser.Tilemaps.Tileset;
type PhysicsSprite = Phaser.Physics.Arcade.Sprite;

const MOUSE_WHEEL_ZOOM_RATE = 0.5;

export class StandaloneGameScene extends DirtyScene implements CharacterRuntimeHost {
    public readonly superLoad: SuperLoaderPlugin;
    public CurrentPlayer!: LocalPlayer;
    public Map!: Tilemap;
    public Objects: PhysicsSprite[] = [];
    public Terrains: Tileset[] = [];
    public userInputManager!: UserInputManager;
    public usernameLayer!: CharacterNameLayer;
    private agentCharacterRepository!: AgentCharacterRepository;
    private agentCharacterController!: AgentCharacterController;
    private furnitureRuntimeController!: FurnitureRuntimeController;
    private worldSceneRuntime!: WorldSceneRuntime;

    private readonly sceneReadyToStartDeferred = new Deferred<void>();
    public readonly sceneReadyToStartPromise = this.sceneReadyToStartDeferred.promise;
    private readonly entityPermissionsDeferred = new Deferred<EntityPermissions>();
    private entityPermissions: EntityPermissions | undefined;
    private mapFile!: ITiledMap;
    private wamFile!: WAMFileFormat;
    private mapUrlFile!: string;
    private baseEntityIds: string[] = [];
    private gameMapFrontWrapper!: GameMapFrontWrapper;
    private entitiesCollectionsManager = new EntitiesCollectionsManager();
    private pathfinder!: CharacterPathfinder;
    private cameraManager!: CameraManager;
    private mapEditorModeManager!: MapEditorRuntimeController;
    private outlineManager!: OutlineManager;
    private mapEditTransport: LocalMapEditTransport | undefined;
    private pendingFurniturePrefab: EntityPrefab | undefined;

    public constructor(
        private readonly context: StandaloneSceneContext,
        private readonly definition: StandaloneSceneDefinition,
        private readonly storage: SceneStorage,
        private readonly playerName: string,
        private readonly characterTextures: WokaTextureDescriptionInterface[],
    ) {
        super({ key: context.sceneKey });
        this.superLoad = new SuperLoaderPlugin(this);
    }

    public get phaserScene(): Phaser.Scene {
        return this;
    }

    public get sceneId(): string {
        return this.context.sceneId;
    }

    public preload(): void {
        this.sound.pauseOnBlur = false;
        this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: { src: string }) => {
            console.error(`[Standalone] resource_load_failed: ${file.src}`);
        });
        this.superLoad.loadPromise(this.loadWamAndQueueMap());
    }

    public create(): void {
        try {
            this.input.topOnly = false;
            this.trackDirtyAnims();
            this.outlineManager = new OutlineManager(this);
            this.Map = this.add.tilemap(this.mapUrlFile);
            this.createTilesets();
            this.physics.world.setBounds(0, 0, this.Map.widthInPixels, this.Map.heightInPixels);
            this.usernameLayer = new CharacterNameLayer(this);
            this.gameMapFrontWrapper = new GameMapFrontWrapper(
                this,
                new GameMap(this.mapFile, this.wamFile),
                this.Map,
                this.Terrains,
            );
            this.gameMapFrontWrapper.initialize().catch((error) => {
                console.error("[Standalone] game_map_initialize_failed", error);
                this.sceneReadyToStartDeferred.reject(error);
            });
            const collisionGridProvider: CollisionGridProvider = {
                getCollisionGrid: () => this.gameMapFrontWrapper.getCollisionGrid({ emitMapChangedEvent: false }),
                getTileDimensions: () => this.gameMapFrontWrapper.getTileDimensions(),
            };
            this.pathfinder = new CharacterPathfinder(collisionGridProvider);
            this.agentCharacterRepository = new AgentCharacterRepository();
            this.agentCharacterController = new AgentCharacterController({
                host: this,
                repository: this.agentCharacterRepository,
                pathfinder: this.pathfinder,
                collisionGridProvider,
                textureLoader: new PhaserAgentCharacterTextureLoader(this),
                createMapCollisionForCharacter: (character) => this.createMapCollisionForCharacter(character),
            });
            this.furnitureRuntimeController = new FurnitureRuntimeController(this);
            this.worldSceneRuntime = {
                sceneId: this.sceneId,
                agentCommands: new StandaloneAgentCommandAdapter(this.agentCharacterController),
                furnitureCommands: this.furnitureRuntimeController,
                historyCommands: this.furnitureRuntimeController,
                flush: () => this.flushPersistence(),
            };
            this.userInputManager = new UserInputManager(this, new StandaloneUserInputHandler(this));
            this.cameraManager = new CameraManager(
                this,
                { width: this.Map.widthInPixels, height: this.Map.heightInPixels },
                waScaleManager,
            );
            this.mapEditTransport = new LocalMapEditTransport(
                this.definition,
                this.storage,
                () => this.getGameMap().getWamFile(),
                this.baseEntityIds,
            );
            this.mapEditorModeManager = new StandaloneEntityMapEditorModeManager(this, this.mapEditTransport);
            this.initializeLocalPlayer().catch((error) => {
                console.error("[Standalone] local_player_initialize_failed", error);
                this.sceneReadyToStartDeferred.reject(error);
            });
        } catch (error) {
            console.error("[Standalone] scene_create_failed", error);
            this.sceneReadyToStartDeferred.reject(error);
            throw error;
        }
    }

    public update(time: number, delta: number): void {
        this.mapEditorModeManager?.update(time, delta);
        this.agentCharacterRepository?.update(delta);
        this.CurrentPlayer?.moveUser(delta, this.userInputManager.getEventListForGameTick());
    }

    public cleanupClosingScene(): void {
        this.agentCharacterController?.destroy();
        this.agentCharacterRepository?.clear();
        this.CurrentPlayer?.destroy();
        this.pathfinder?.destroy();
        this.userInputManager?.destroy();
        this.cameraManager?.destroy();
        this.mapEditorModeManager?.destroy();
        this.outlineManager?.clear();
        this.usernameLayer?.destroy();
    }

    public async flushPersistence(): Promise<void> {
        await this.mapEditTransport?.flush();
    }

    public getGameMap(): GameMap {
        return this.gameMapFrontWrapper.getGameMap();
    }

    public getGameMapFrontWrapper(): GameMapFrontWrapper {
        return this.gameMapFrontWrapper;
    }

    public getEntitiesCollectionsManager(): EntitiesCollectionsManager {
        return this.entitiesCollectionsManager;
    }

    public getCustomEntityCollectionUrl(): string {
        return new URL("./assets/entities/entities.json", this.context.wamUrl).toString();
    }

    public getCameraManager(): CameraManager {
        return this.cameraManager;
    }

    public getMapEditorModeManager(): MapEditorRuntimeController {
        return this.mapEditorModeManager;
    }

    public getPathfinder(): CharacterPathfinder {
        return this.pathfinder;
    }

    public getAgentController(): AgentCharacterController {
        return this.agentCharacterController;
    }

    public getWorldSceneRuntime(): WorldSceneRuntime {
        return this.worldSceneRuntime;
    }

    public getEntityById(entityId: string): Entity | undefined {
        return this.gameMapFrontWrapper.getEntitiesManager().getEntities().get(entityId);
    }

    public getPendingFurniturePrefab(): EntityPrefab | undefined {
        return this.pendingFurniturePrefab;
    }

    public getStandaloneEntityEditorSnapshot() {
        return this.mapEditorModeManager instanceof StandaloneEntityMapEditorModeManager
            ? this.mapEditorModeManager.getSnapshot()
            : undefined;
    }

    public openFurnitureEditor(): void {
        mapEditorModeStore.switchMode(true);
        this.mapEditorModeManager.equipTool(EditorToolName.EntityEditor);
    }

    public closeFurnitureEditor(): void {
        this.pendingFurniturePrefab = undefined;
        mapEditorSelectedEntityIdStore.set(undefined);
        mapEditorSelectedEntityPrefabStore.set(undefined);
        mapEditorEntityModeStore.set("ADD");
        mapEditorModeStore.switchMode(false);
    }

    public beginFurniturePlacement(prefab: EntityPrefab): void {
        this.pendingFurniturePrefab = prefab;
        mapEditorSelectedEntityIdStore.set(undefined);
        mapEditorEntityModeStore.set("ADD");
        mapEditorSelectedEntityPrefabStore.set(prefab);
        this.markDirty();
    }

    public clearFurnitureSelection(): void {
        this.pendingFurniturePrefab = undefined;
        mapEditorSelectedEntityIdStore.set(undefined);
        mapEditorEntityModeStore.set("ADD");
        mapEditorSelectedEntityPrefabStore.set(undefined);
        this.markDirty();
    }

    public async deleteSelectedFurniture(): Promise<void> {
        const entityId = this.getStandaloneEntityEditorSnapshot()?.selectedEntityId;
        if (!entityId) {
            return;
        }
        this.getEntityById(entityId)?.delete();
    }

    public async updateSelectedFurniturePrefab(prefab: EntityPrefab): Promise<void> {
        const entityId = this.getStandaloneEntityEditorSnapshot()?.selectedEntityId;
        if (!entityId) {
            return;
        }
        await this.getMapEditorModeManager().executeCommand(
            new UpdateEntityFrontCommand(
                this.getGameMap().getWamFile()!,
                entityId,
                { prefabRef: { collectionName: prefab.collectionName, id: prefab.id } },
                undefined,
                undefined,
                this.getGameMapFrontWrapper().getEntitiesManager(),
                this,
            ),
        );
        mapEditorSelectedEntityPrefabStore.set(undefined);
        this.markDirty();
    }

    public getEntityPermissions(): EntityPermissions {
        if (!this.entityPermissions) {
            throw new Error("Standalone entity permissions are not initialized yet");
        }
        return this.entityPermissions;
    }

    public getEntityPermissionsPromise(): Promise<EntityPermissions> {
        return this.entityPermissionsDeferred.promise;
    }

    public getOutlineManager(): OutlineManager {
        return this.outlineManager;
    }

    public handleMouseWheel(deltaY: number): void {
        let zoomFactor = Math.exp(((-deltaY * Math.log(2)) / 100) * MOUSE_WHEEL_ZOOM_RATE);
        zoomFactor = Phaser.Math.Clamp(zoomFactor, 0.1, 10);
        if (this.cameraManager.isZoomLocked()) {
            return;
        }
        const duration = zoomFactor > 1 ? zoomFactor * 250 : (1 / zoomFactor) * 250;
        this.cameraManager.zoomByFactor(zoomFactor, duration);
    }

    public async moveTo(position: Position, tryFindingNearestAvailable = false): Promise<CharacterMoveResult> {
        return this.CurrentPlayer.moveToPosition(position, tryFindingNearestAvailable);
    }

    public playSound(key: string, volume?: number): void {
        if (this.sound.get(key)) {
            this.sound.play(key, { volume });
        }
    }

    private async loadWamAndQueueMap(): Promise<void> {
        const response = await fetch(this.context.wamUrl);
        if (!response.ok) {
            throw new Error(`Unable to load standalone WAM ${this.context.wamUrl}: ${response.status}`);
        }
        const baseWam = this.normalizeRuntimeWam(await response.json(), this.context.wamUrl);
        this.baseEntityIds = Object.keys(baseWam.entities);
        this.wamFile = await this.mergeStoredOverlay(baseWam);
        this.mapUrlFile = new URL(this.wamFile.mapUrl, this.context.wamUrl).toString();
        this.queueTmjLoad(this.mapUrlFile);
        this.loadEntityCollections();
    }

    private async mergeStoredOverlay(baseWam: WAMFileFormat): Promise<WAMFileFormat> {
        try {
            const overlay = await this.storage.loadOverlay(this.context.sceneId);
            if (!overlay) {
                return baseWam;
            }
            const result = mergeSceneOverlay(baseWam, this.definition, overlay);
            if (!result.ok) {
                console.error(`[Standalone] overlay_merge_failed: ${result.message}`);
            }
            return this.normalizeRuntimeWam(result.wam, `overlay:${this.context.sceneId}`);
        } catch (error) {
            console.error("[Standalone] overlay_load_failed: using base WAM", error);
            return baseWam;
        }
    }

    private normalizeRuntimeWam(input: unknown, source: string): WAMFileFormat {
        const { wam, diagnostics } =
            typeof input === "object" && input !== null && "entities" in input && "areas" in input
                ? storageDtoToStandaloneWam(input as WAMFileFormat)
                : normalizeStandaloneWam(input);
        if (diagnostics.length > 0) {
            console.warn(`[Standalone] stripped_unsupported_wam_features: ${source}`, diagnostics);
        }
        return standaloneWamToStorageDto(wam);
    }

    private queueTmjLoad(mapUrlFile: string): void {
        this.load.on(`filecomplete-tilemapJSON-${mapUrlFile}`, (key: string, type: string, data: unknown) => {
            this.onMapLoad(data);
        });
        this.load.tilemapTiledJSON(mapUrlFile, mapUrlFile);
        if (this.cache.tilemap.exists(mapUrlFile)) {
            const data = this.cache.tilemap.get(mapUrlFile);
            this.onMapLoad(data.data);
        }
    }

    private onMapLoad(data: unknown): void {
        this.mapFile = structuredClone(data) as ITiledMap;
        const mapDirUrl = this.mapUrlFile.substring(0, this.mapUrlFile.lastIndexOf("/"));
        for (const tileset of this.mapFile.tilesets) {
            if ("source" in tileset) {
                throw new Error(`Standalone maps must embed tilesets: ${tileset.source}`);
            }
            if (typeof tileset.name === "undefined" || !("image" in tileset)) {
                console.warn("[Standalone] unsupported tileset", tileset);
                continue;
            }
            const imageUrl = `${mapDirUrl}/${tileset.image}`;
            if (tileset.image.includes(".svg")) {
                this.load.svg(imageUrl, imageUrl, {
                    width: tileset.imagewidth,
                    height: tileset.imageheight,
                });
            } else {
                this.load.image(imageUrl, imageUrl);
            }
        }
    }

    private createTilesets(): void {
        const mapDirUrl = this.mapUrlFile.substring(0, this.mapUrlFile.lastIndexOf("/"));
        for (const tileset of this.mapFile.tilesets as ITiledMapTileset[]) {
            if ("source" in tileset || !("image" in tileset)) {
                throw new Error(`Unsupported standalone tileset in ${this.mapUrlFile}`);
            }
            const tilesetImage = this.Map.addTilesetImage(
                tileset.name,
                `${mapDirUrl}/${tileset.image}`,
                tileset.tilewidth,
                tileset.tileheight,
                tileset.margin,
                tileset.spacing,
            );
            if (tilesetImage) {
                this.Terrains.push(tilesetImage);
            }
        }
    }

    private loadEntityCollections(): void {
        const collectionDescriptors: { url: string; type: EntityPrefabType }[] = this.wamFile.entityCollections.map(
            (collectionUrl) => ({
                url: new URL(collectionUrl.url, this.context.wamUrl).toString(),
                type: "Default",
            }),
        );
        collectionDescriptors.push({ url: this.getCustomEntityCollectionUrl(), type: "Custom" });
        this.entitiesCollectionsManager.loadCollections(collectionDescriptors);
    }

    private async initializeLocalPlayer(): Promise<void> {
        await this.gameMapFrontWrapper.initializedPromise.promise;
        const gameMapAreas = this.getGameMap().getWamFile()?.getGameMapAreas();
        if (gameMapAreas) {
            this.entityPermissions = new EntityPermissions(gameMapAreas, [], true, undefined);
            this.entityPermissionsDeferred.resolve(this.entityPermissions);
        }
        const textures = lazyLoadPlayerCharacterTextures(this.superLoad, this.characterTextures);
        const startPosition = this.computeStartPosition();
        this.CurrentPlayer = new LocalPlayer(
            this,
            {
                id: "local-player",
                name: this.playerName,
                x: startPosition.x,
                y: startPosition.y,
                texturesPromise: textures,
                direction: this.context.defaultSpawn?.direction ?? Direction.DOWN,
                movementConfig: DEFAULT_LOCAL_PLAYER_MOVEMENT,
            },
            this.pathfinder,
        );
        this.createMapCollisionForCharacter(this.CurrentPlayer);
        this.cameraManager.startFollowPlayer(this.CurrentPlayer, 0);
        this.CurrentPlayer.on(characterMovedEventName, (event: CharacterMovedEvent) => {
            this.handleCurrentPlayerHasMovedEvent(event);
        });
        await this.CurrentPlayer.ready();
        this.gameMapFrontWrapper.setPosition(startPosition.x, startPosition.y);
        this.gameMapFrontWrapper.initializeAreaManager([], true);
        this.sceneReadyToStartDeferred.resolve();
        this.markDirty();
    }

    private computeStartPosition(): Position {
        if (this.context.defaultSpawn) {
            return { x: this.context.defaultSpawn.x, y: this.context.defaultSpawn.y };
        }
        return {
            x: (this.mapFile.width ?? 0) * ((this.mapFile.tilewidth ?? 32) / 2),
            y: (this.mapFile.height ?? 0) * ((this.mapFile.tileheight ?? 32) / 2),
        };
    }

    private createMapCollisionForCharacter(character: StandaloneCharacter): void {
        for (const phaserLayer of this.gameMapFrontWrapper.phaserLayers) {
            if (phaserLayer.layer.name === "__areasCollisionLayer") {
                continue;
            }
            this.physics.add.collider(character, phaserLayer);
            phaserLayer.setCollisionByProperty({ collides: true });
        }
    }

    private handleCurrentPlayerHasMovedEvent(event: CharacterMovedEvent): void {
        this.gameMapFrontWrapper.setPosition(event.x, event.y);
        this.markDirty();
    }
}
