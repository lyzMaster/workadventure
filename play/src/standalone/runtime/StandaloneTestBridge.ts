import * as Phaser from "phaser";
import type { Game } from "../../front/Phaser/Game/Game";
import type { StandaloneSceneId } from "../StandaloneSceneDefinition";
import type { StandaloneGameScene } from "./StandaloneGameScene";

export interface StandaloneTestBridge {
    destroy(): void;
}

type NetworkAuditEntry = {
    transport: "fetch" | "xhr" | "websocket";
    url: string;
};

let networkBridgeInstalled = false;

export function installStandaloneTestBridge(
    game: Game,
    scene: StandaloneGameScene,
    sceneId: StandaloneSceneId,
): StandaloneTestBridge | undefined {
    if (import.meta.env.VITE_ENABLE_TEST_BRIDGE !== "true") {
        return undefined;
    }
    installNetworkAuditBridge();
    const postStep = () => {
        if (!scene.CurrentPlayer) {
            return;
        }
        document.documentElement.dataset.standaloneActiveScene = sceneId;
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
    };
    game.events.on(Phaser.Core.Events.POST_STEP, postStep);
    return {
        destroy() {
            game.events.off(Phaser.Core.Events.POST_STEP, postStep);
            delete document.documentElement.dataset.standaloneActiveScene;
            delete document.documentElement.dataset.standalonePlayerPosition;
            delete document.documentElement.dataset.standaloneEntities;
            delete document.documentElement.dataset.standaloneEntityDiagnostics;
        },
    };
}

function installNetworkAuditBridge(): void {
    if (networkBridgeInstalled) {
        return;
    }
    networkBridgeInstalled = true;
    const requests: NetworkAuditEntry[] = [];
    const record = (transport: NetworkAuditEntry["transport"], url: string | URL) => {
        requests.push({ transport, url: String(url) });
        document.documentElement.dataset.standaloneNetworkAudit = JSON.stringify(requests);
    };

    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
        record("fetch", input instanceof Request ? input.url : input);
        return nativeFetch(input, init);
    };

    const nativeOpen: (
        this: XMLHttpRequest,
        method: string,
        url: string | URL,
        async: boolean,
        user?: string | null,
        password?: string | null,
    ) => void = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (
        method: string,
        url: string | URL,
        async: boolean = true,
        user?: string | null,
        password?: string | null,
    ) {
        record("xhr", url);
        return nativeOpen.call(this, method, url, async, user, password);
    };

    const NativeWebSocket = window.WebSocket;
    window.WebSocket = class AuditedWebSocket extends NativeWebSocket {
        public constructor(url: string | URL, protocols?: string | string[]) {
            record("websocket", url);
            super(url, protocols);
        }
    };
}
