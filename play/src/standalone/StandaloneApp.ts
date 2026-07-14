import * as Phaser from "phaser";
import "phaser4-rex-plugins/plugins/awaitloader.js";
import AwaitLoaderPlugin from "phaser4-rex-plugins/plugins/awaitloader-plugin.js";
import OutlineFilterPlugin from "phaser4-rex-plugins/plugins/outlinefilter-plugin.js";
import { mount, unmount } from "svelte";
import { Game } from "../front/Phaser/Game/Game";
import { HdpiManager } from "../front/Phaser/Services/HdpiManager";
import { waScaleManager } from "../front/Phaser/Services/WaScaleManager";
import type { WokaTextureDescriptionInterface } from "../front/Phaser/Entity/PlayerTextures";
import StandaloneEditor from "./StandaloneEditor.svelte";
import type { DefaultStandaloneSceneController } from "./StandaloneSceneController";
import type { SceneStorage } from "./SceneStorage";
import type { StandaloneSceneDefinition } from "./StandaloneSceneDefinition";
import type { StandaloneSceneContext } from "./StandaloneSceneResolver";
import { installStandaloneTestBridge, type StandaloneTestBridge } from "./runtime/StandaloneTestBridge";
import { StandaloneGameScene } from "./runtime/StandaloneGameScene";
import "./standalone.css";

export class StandaloneApp {
    private game: Game | undefined;
    private scene: StandaloneGameScene | undefined;
    private editor: ReturnType<typeof mount> | undefined;
    private resizeHandler: (() => void) | undefined;
    private testBridge: StandaloneTestBridge | undefined;

    public mountEditor(controller: DefaultStandaloneSceneController): void {
        if (this.editor) {
            return;
        }
        this.editor = mount(StandaloneEditor, {
            target: document.body,
            props: { controller },
        });
    }

    public startScene(
        context: StandaloneSceneContext,
        definition: StandaloneSceneDefinition,
        storage: SceneStorage,
        playerName: string,
        characterTextures: WokaTextureDescriptionInterface[],
    ): StandaloneGameScene {
        const scene = new StandaloneGameScene(context, definition, storage, playerName, characterTextures);
        // WaScaleManager owns zoom by resizing the render buffer and/or changing the camera zoom.
        // Phaser's RESIZE mode independently rewrites the same canvas dimensions and causes the
        // canvas to collapse after a wheel animation. Use the same initial sizing contract as the
        // online App instead, then let WaScaleManager react to viewport changes.
        const { width, height } = this.getViewportSize();
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
        this.ensureResizeSubscription();
        this.testBridge = installStandaloneTestBridge(this.game, scene, context.sceneId);
        return scene;
    }

    public async destroyGame(): Promise<void> {
        try {
            this.testBridge?.destroy();
            this.testBridge = undefined;
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
        if (this.resizeHandler) {
            window.removeEventListener("resize", this.resizeHandler);
            this.resizeHandler = undefined;
        }
        if (this.editor) {
            await unmount(this.editor);
            this.editor = undefined;
        }
    }

    private ensureResizeSubscription(): void {
        if (this.resizeHandler) {
            return;
        }
        this.resizeHandler = () => {
            waScaleManager.applyNewSize();
            waScaleManager.refreshFocusOnTarget();
        };
        window.addEventListener("resize", this.resizeHandler);
    }

    private getViewportSize(): { width: number; height: number } {
        return {
            width: Math.max(1, window.innerWidth),
            height: Math.max(1, window.innerHeight),
        };
    }
}
