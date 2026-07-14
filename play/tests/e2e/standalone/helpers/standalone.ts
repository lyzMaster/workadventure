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

export type BridgePrefab = {
    prefabId: string;
    collectionName: string;
    name: string;
    hasCollisionGrid: boolean;
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
        world: unknown;
    };
    getPlayerState(): {
        x: number;
        y: number;
        direction: string;
        moving: boolean;
    };
    getEntities(): BridgeEntity[];
    listFurniturePrefabs(): BridgePrefab[];
    movePlayer(target: { x: number; y: number }): Promise<{ x: number; y: number; cancelled: boolean }>;
    executeWorldCommand(command: unknown, options?: { timeoutMs?: number }): Promise<WorldCommandResult>;
    cancelWorldCommand(commandId: string): boolean;
    getWorldEvents(): WorldEvent[];
    listActiveCommands(): unknown[];
    openFurnitureEditor(): Promise<void>;
    closeFurnitureEditor(): Promise<void>;
    selectFurniture(input: { collectionName: string; prefabId: string }): Promise<{ prefabId: string }>;
    placeFurniture(input: { x: number; y: number; entityId?: string }): Promise<WorldCommandResult>;
    selectEntity(input: { entityId: string }): Promise<{ entityId: string }>;
    moveEntity(input: { entityId: string; x: number; y: number }): Promise<WorldCommandResult>;
    changeEntityVariant(input: {
        entityId: string;
        collectionName: string;
        prefabId: string;
    }): Promise<WorldCommandResult>;
    deleteEntity(input: { entityId: string }): Promise<WorldCommandResult>;
    undo(): Promise<WorldCommandResult>;
    redo(): Promise<WorldCommandResult>;
    flushPersistence(): Promise<WorldCommandResult>;
    clearOverlay(): Promise<void>;
};

export type WorldCommandResult<T = unknown> = {
    schemaVersion: 1;
    commandId: string;
    type: string;
    status: "succeeded" | "failed" | "cancelled" | "timed_out";
    sceneId?: string;
    startedAt: string;
    finishedAt: string;
    data?: T;
    error?: { code: string; message: string; details?: Record<string, unknown> };
};

export type WorldEvent = {
    schemaVersion: 1;
    eventId: string;
    type: string;
    timestamp: string;
    commandId: string;
    sceneId: string;
    data?: unknown;
};

export async function gotoStandalone(page: Page, scene: "home" | "office" = "home"): Promise<void> {
    await page.goto(`/standalone.html?scene=${scene}`);
    await page.waitForFunction(() => typeof window.__standaloneTest !== "undefined");
    await page.waitForSelector('[data-testid="standalone-active-scene"]');
    await page.waitForFunction(
        (expectedScene) =>
            document.documentElement.dataset.standaloneActiveScene === expectedScene &&
            document.documentElement.dataset.standaloneControllerActiveScene === expectedScene &&
            typeof document.documentElement.dataset.standalonePlayerPosition === "string",
        scene,
    );
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
            return Array.isArray(payload) ? target(...payload) : target(payload);
        },
        [expression, arg] as const,
    ) as Promise<T>;
}

export async function getEntities(page: Page): Promise<BridgeEntity[]> {
    return bridgeCall(page, "getEntities");
}

export async function getFurniturePrefabs(page: Page): Promise<BridgePrefab[]> {
    return bridgeCall(page, "listFurniturePrefabs");
}

export async function getPlayerState(page: Page) {
    return bridgeCall<{ x: number; y: number; direction: string; moving: boolean }>(page, "getPlayerState");
}

export async function getSceneState(page: Page) {
    return bridgeCall<StandaloneTestApi["getSceneState"] extends () => infer T ? T : never>(page, "getSceneState");
}

export async function listAgents(page: Page): Promise<AgentActionResult<AgentCharacterSnapshot[]>> {
    const result = await executeWorldCommand<AgentCharacterSnapshot[]>(page, "agent.list", {});
    return {
        ok: result.status === "succeeded",
        actionId: result.commandId,
        value: (result.data ?? []) as AgentCharacterSnapshot[],
        code: result.error?.code as never,
        message: result.error?.message ?? "",
    } as AgentActionResult<AgentCharacterSnapshot[]>;
}

type AgentCharacterSnapshot = {
    id: string;
    name: string;
    sceneId: string;
    kind: "agent";
    position: {
        x: number;
        y: number;
        direction: "up" | "right" | "down" | "left";
        moving: boolean;
    };
    motionState: string;
};

type AgentActionResult<T> =
    | { ok: true; actionId: string; value: T }
    | { ok: false; actionId: string; code: string; message: string };

export async function executeWorldCommand<T = unknown>(
    page: Page,
    type: string,
    payload: unknown,
    sceneId?: "home" | "office",
    options?: { timeoutMs?: number },
    commandId?: string,
): Promise<WorldCommandResult<T>> {
    const command: Record<string, unknown> = {
        schemaVersion: 1,
        commandId: commandId ?? `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        type,
        payload,
    };
    if (sceneId) {
        command.sceneId = sceneId;
    }
    return bridgeCall(page, "executeWorldCommand", [
        command,
        options,
    ]) as Promise<WorldCommandResult<T>>;
}

export async function cancelWorldCommand(page: Page, commandId: string): Promise<boolean> {
    return bridgeCall(page, "cancelWorldCommand", commandId);
}

export async function getWorldEvents(page: Page): Promise<WorldEvent[]> {
    return bridgeCall(page, "getWorldEvents");
}

export async function expectSingleCanvas(page: Page): Promise<void> {
    await expect(page.locator("canvas")).toHaveCount(1);
}
