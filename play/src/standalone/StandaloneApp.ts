import * as Phaser from "phaser";
import "phaser4-rex-plugins/plugins/awaitloader.js";
import AwaitLoaderPlugin from "phaser4-rex-plugins/plugins/awaitloader-plugin.js";
import OutlineFilterPlugin from "phaser4-rex-plugins/plugins/outlinefilter-plugin.js";
import { mount, unmount } from "svelte";
import type { Unsubscriber } from "svelte/store";
import type { Room } from "../front/Connection/Room";
import { Game } from "../front/Phaser/Game/Game";
import { GameScene } from "../front/Phaser/Game/GameScene";
import type { GameSceneRuntime } from "../front/Phaser/Game/GameSceneRuntime";
import { HdpiManager } from "../front/Phaser/Services/HdpiManager";
import { waScaleManager } from "../front/Phaser/Services/WaScaleManager";
import { canvasSize, coWebsiteManager } from "../front/Stores/CoWebsiteStore";
import StandaloneEditor from "./StandaloneEditor.svelte";
import type { DefaultStandaloneSceneController } from "./StandaloneSceneController";
import "./standalone.css";

export class StandaloneApp {
    private game: Game | undefined;
    private scene: GameScene | undefined;
    private editor: ReturnType<typeof mount> | undefined;
    private canvasSizeUnsubscriber: Unsubscriber | undefined;

    public mountEditor(controller: DefaultStandaloneSceneController): void {
        if (this.editor) {
            return;
        }
        this.editor = mount(StandaloneEditor, {
            target: document.body,
            props: { controller },
        });
    }

    public startScene(room: Room, runtime: GameSceneRuntime): GameScene {
        const scene = new GameScene(room, "standalone-game", undefined, runtime);
        // WaScaleManager owns zoom by resizing the render buffer and/or changing the camera zoom.
        // Phaser's RESIZE mode independently rewrites the same canvas dimensions and causes the
        // canvas to collapse after a wheel animation. Use the same initial sizing contract as the
        // online App instead, then let WaScaleManager react to viewport changes.
        const { width, height } = coWebsiteManager.getGameSize();
        const hdpiManager = new HdpiManager(640 * 480, 196 * 196);
        const { game: gameSize, real: realSize } = hdpiManager.getOptimalGameSize({ width, height });
        this.game = new Game({
            type: Phaser.AUTO,
            title: "WorkAdventure Standalone",
            parent: "game",
            backgroundColor: "#1b2a41",
            pixelArt: true,
            render: { antialias: false, roundPixels: true },
            scale: {
                parent: "game",
                width: gameSize.width,
                height: gameSize.height,
                zoom: realSize.width / gameSize.width,
                autoRound: true,
                resizeInterval: 999999999999,
            },
            physics: {
                default: "arcade",
                arcade: { debug: false },
            },
            dom: { createContainer: true },
            disableContextMenu: true,
            scene: [scene],
            plugins: {
                global: [{ key: "rexAwaitLoader", plugin: AwaitLoaderPlugin, start: true }],
            },
            callbacks: {
                postBoot: (game) => {
                    if (game.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
                        game.plugins.install("rexOutlineFilter", OutlineFilterPlugin, true);
                    }
                },
            },
        });
        waScaleManager.setGame(this.game);
        this.scene = scene;
        this.ensureCanvasSizeSubscription();
        this.game.events.on(Phaser.Core.Events.POST_STEP, () => {
            if (!scene.CurrentPlayer) {
                return;
            }
            document.documentElement.dataset.standaloneActiveScene = room.key;
            document.documentElement.dataset.standalonePlayerPosition = JSON.stringify({
                x: scene.CurrentPlayer.x,
                y: scene.CurrentPlayer.y,
            });
            document.documentElement.dataset.standaloneEntities = JSON.stringify(
                scene.getGameMap().getWamFile()?.getGameMapEntities().getEntities() ?? {},
            );
            document.documentElement.dataset.standaloneEntityDiagnostics = JSON.stringify(
                [...scene.getGameMapFrontWrapper().getEntitiesManager().getEntities().values()].map((entity) => ({
                    id: entity.entityId,
                    x: entity.x,
                    y: entity.y,
                    screenX: entity.x - scene.cameras.main.worldView.x,
                    screenY: entity.y - scene.cameras.main.worldView.y,
                    width: entity.displayWidth,
                    height: entity.displayHeight,
                    interactive: entity.input?.enabled ?? false,
                    canEdit: entity.canEdit,
                })),
            );
        });
        return scene;
    }

    public async destroyGame(): Promise<void> {
        try {
            this.scene?.cleanupClosingScene();
        } catch (error) {
            console.error("[Standalone] scene cleanup failed before destroying Phaser Game", error);
        }
        this.scene = undefined;
        if (this.game) {
            this.game.destroy(true);
            this.game = undefined;
            await new Promise<void>((resolve) => {
                setTimeout(resolve, 0);
            });
        }
        delete document.documentElement.dataset.standalonePlayerPosition;
        delete document.documentElement.dataset.standaloneEntities;
        delete document.documentElement.dataset.standaloneEntityDiagnostics;
    }

    public async destroy(): Promise<void> {
        await this.destroyGame();
        this.canvasSizeUnsubscriber?.();
        this.canvasSizeUnsubscriber = undefined;
        if (this.editor) {
            await unmount(this.editor);
            this.editor = undefined;
        }
    }

    private ensureCanvasSizeSubscription(): void {
        if (this.canvasSizeUnsubscriber) {
            return;
        }
        this.canvasSizeUnsubscriber = canvasSize.subscribe(({ width, height }) => {
            if (width < 1 || height < 1) {
                return;
            }
            waScaleManager.applyNewSize();
            waScaleManager.refreshFocusOnTarget();
        });
    }
}
