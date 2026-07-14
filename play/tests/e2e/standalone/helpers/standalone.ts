import { expect, type Page } from "@playwright/test";

export type BridgeEntity = {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    prefabId: string;
    collectionName: string;
    name: string;
    color: string;
    direction: string;
};

type StandaloneTestApi = {
    getSceneState(): {
        sceneId: string;
        activeSceneId: string | null;
        editor: {
            active: boolean;
            canUndo: boolean;
            canRedo: boolean;
            selectedEntityId?: string;
        };
        network: Array<{ transport: "fetch" | "xhr" | "websocket"; url: string }>;
    };
    getPlayerState(): {
        x: number;
        y: number;
        direction: string;
        moving: boolean;
    };
    getEntities(): BridgeEntity[];
    movePlayer(target: { x: number; y: number }): Promise<{ x: number; y: number; cancelled: boolean }>;
    openFurnitureEditor(): Promise<void>;
    closeFurnitureEditor(): Promise<void>;
    selectFurniture(input: { collectionName: string; prefabId: string }): Promise<{ prefabId: string }>;
    placeFurniture(input: { x: number; y: number }): Promise<{ entityId: string }>;
    selectEntity(input: { entityId: string }): Promise<{ entityId: string }>;
    moveEntity(input: { entityId: string; x: number; y: number }): Promise<{ entityId: string; x: number; y: number }>;
    changeEntityVariant(input: {
        entityId: string;
        collectionName: string;
        prefabId: string;
    }): Promise<{ entityId: string; prefabId: string }>;
    deleteEntity(input: { entityId: string }): Promise<void>;
    undo(): Promise<void>;
    redo(): Promise<void>;
    flushPersistence(): Promise<void>;
    clearOverlay(): Promise<void>;
};

export async function gotoStandalone(page: Page, scene: "home" | "office" = "home"): Promise<void> {
    await page.goto(`/standalone.html?scene=${scene}`);
    await page.waitForFunction(() => typeof window.__standaloneTest !== "undefined");
    await page.waitForSelector('[data-testid="standalone-active-scene"]');
}

export async function clearStandaloneIndexedDb(page: Page): Promise<void> {
    await page.addInitScript(() => {
        if (sessionStorage.getItem("__standalone_e2e_db_cleared") === "true") {
            return;
        }
        sessionStorage.setItem("__standalone_e2e_db_cleared", "true");
        indexedDB.deleteDatabase("workadventure-standalone");
        localStorage.removeItem("workadventure-standalone.active-scene");
    });
}

export async function bridgeCall<T>(page: Page, expression: string, arg?: unknown): Promise<T> {
    return page.evaluate(
        ([fn, payload]) => {
            const bridge = (window as Window & { __standaloneTest?: StandaloneTestApi }).__standaloneTest;
            if (!bridge) {
                throw new Error("Standalone test bridge is not available");
            }
            const target = bridge[fn as keyof StandaloneTestApi] as (...args: unknown[]) => unknown;
            if (typeof target !== "function") {
                throw new Error(`Bridge method "${fn}" is not a function`);
            }
            return target(payload);
        },
        [expression, arg] as const,
    ) as Promise<T>;
}

export async function getEntities(page: Page): Promise<BridgeEntity[]> {
    return bridgeCall(page, "getEntities");
}

export async function getPlayerState(page: Page) {
    return bridgeCall<{ x: number; y: number; direction: string; moving: boolean }>(page, "getPlayerState");
}

export async function getSceneState(page: Page) {
    return bridgeCall<StandaloneTestApi["getSceneState"] extends () => infer T ? T : never>(page, "getSceneState");
}

export async function expectSingleCanvas(page: Page): Promise<void> {
    await expect(page.locator("canvas")).toHaveCount(1);
}
