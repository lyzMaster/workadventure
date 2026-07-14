import { test, expect } from "@playwright/test";
import {
    bridgeCall,
    clearStandaloneIndexedDb,
    expectSingleCanvas,
    getEntities,
    getPlayerState,
    getSceneState,
    gotoStandalone,
} from "./helpers/standalone";

test.describe("Standalone regression", () => {
    test.beforeEach(async ({ page }) => {
        await clearStandaloneIndexedDb(page);
    });

    test("Home/Office 加载、切换、玩家移动碰撞、家具编辑、恢复与网络审计", async ({ page }) => {
        console.log("step: goto home");
        await gotoStandalone(page, "home");

        await expect(page.getByTestId("standalone-active-scene")).toContainText("Home");
        await expectSingleCanvas(page);

        const homeState = await getSceneState(page);
        expect(homeState.sceneId).toBe("home");
        expect(homeState.activeSceneId).toBe("home");

        console.log("step: switch office");
        await page.getByTestId("standalone-switch-office").click();
        await expect(page.getByTestId("standalone-active-scene")).toContainText("Office");
        await expectSingleCanvas(page);

        const officeState = await getSceneState(page);
        expect(officeState.sceneId).toBe("office");
        expect(officeState.activeSceneId).toBe("office");

        console.log("step: switch home");
        await page.getByTestId("standalone-switch-home").click();
        await expect(page.getByTestId("standalone-active-scene")).toContainText("Home");
        await expectSingleCanvas(page);

        console.log("step: player move");
        const playerBefore = await getPlayerState(page);
        const moveResult = await bridgeCall<{ x: number; y: number; cancelled: boolean }>(page, "movePlayer", {
            x: playerBefore.x + 96,
            y: playerBefore.y,
        });
        const playerAfterMove = await getPlayerState(page);
        expect(moveResult.cancelled).toBeFalsy();
        expect(playerAfterMove.x).not.toBe(playerBefore.x);

        const collisionResult = await bridgeCall<{ x: number; y: number; cancelled: boolean }>(page, "movePlayer", {
            x: -512,
            y: -512,
        }).catch(() => undefined);
        const playerAfterCollision = await getPlayerState(page);
        expect(collisionResult).toBeUndefined();
        expect(playerAfterCollision.x).toBeGreaterThanOrEqual(0);
        expect(playerAfterCollision.y).toBeGreaterThanOrEqual(0);

        console.log("step: open editor");
        await page.getByTestId("open-standalone-map-editor").click();
        await expect(page.getByTestId("standalone-editor-panel")).toBeVisible();
        const catalogButtons = page.locator("[data-testid^='standalone-prefab-']");
        await expect(catalogButtons.first()).toBeVisible();
        expect(await catalogButtons.count()).toBeGreaterThan(0);
        const furnitureCollectionName = "basic furniture";

        const firstButton = catalogButtons.first();
        const firstPrefabTestId = (await firstButton.getAttribute("data-testid")) ?? "";
        const firstPrefabId = firstPrefabTestId.replace("standalone-prefab-", "");
        await bridgeCall(page, "selectFurniture", {
            collectionName: furnitureCollectionName,
            prefabId: firstPrefabId,
        });

        console.log("step: place furniture");
        const placed = await bridgeCall<{ entityId: string }>(page, "placeFurniture", {
            x: playerAfterCollision.x + 64,
            y: playerAfterCollision.y + 64,
        });
        let entities = await getEntities(page);
        const created = entities.find((entity) => entity.id === placed.entityId);
        expect(created).toBeTruthy();
        expect(created?.prefabId).toBe(firstPrefabId);

        console.log("step: update furniture");
        await bridgeCall(page, "selectEntity", { entityId: placed.entityId });
        await expect
            .poll(async () => (await getSceneState(page)).editor.selectedEntityId)
            .toBe(placed.entityId);

        const moved = await bridgeCall<{ entityId: string; x: number; y: number }>(page, "moveEntity", {
            entityId: placed.entityId,
            x: (created?.x ?? 0) + 32,
            y: (created?.y ?? 0) + 32,
        });
        entities = await getEntities(page);
        const movedEntity = entities.find((entity) => entity.id === placed.entityId);
        expect(movedEntity?.x).toBe(moved.x);
        expect(movedEntity?.y).toBe(moved.y);

        const secondButton = catalogButtons.nth(1);
        const secondPrefabTestId = (await secondButton.getAttribute("data-testid")) ?? "";
        const secondPrefabId = secondPrefabTestId.replace("standalone-prefab-", "");
        await bridgeCall(page, "selectFurniture", {
            collectionName: furnitureCollectionName,
            prefabId: secondPrefabId,
        });
        await bridgeCall(page, "changeEntityVariant", {
            entityId: placed.entityId,
            collectionName: movedEntity?.collectionName,
            prefabId: secondPrefabId,
        });
        await expect
            .poll(async () => (await getEntities(page)).find((entity) => entity.id === placed.entityId)?.prefabId)
            .toBe(secondPrefabId);

        await bridgeCall(page, "undo");
        await expect
            .poll(async () => (await getEntities(page)).find((entity) => entity.id === placed.entityId)?.prefabId)
            .toBe(firstPrefabId);

        await bridgeCall(page, "redo");
        await expect
            .poll(async () => (await getEntities(page)).find((entity) => entity.id === placed.entityId)?.prefabId)
            .toBe(secondPrefabId);

        console.log("step: reload restore");
        await bridgeCall(page, "flushPersistence");
        await page.reload();
        await page.waitForFunction(() => typeof window.__standaloneTest !== "undefined");
        await expect
            .poll(async () => (await getEntities(page)).some((entity) => entity.id === placed.entityId))
            .toBeTruthy();

        console.log("step: office isolate");
        await page.getByTestId("standalone-switch-office").click();
        await page.waitForFunction(() => typeof window.__standaloneTest !== "undefined");
        await expect(page.getByTestId("standalone-active-scene")).toContainText("Office");
        let officeEntities = await getEntities(page);
        expect(officeEntities.some((entity) => entity.id === placed.entityId)).toBeFalsy();

        await page.getByTestId("open-standalone-map-editor").click();
        const officeCatalogButtons = page.locator("[data-testid^='standalone-prefab-']");
        const officeFirstPrefabId = ((await officeCatalogButtons.first().getAttribute("data-testid")) ?? "").replace(
            "standalone-prefab-",
            "",
        );
        await bridgeCall(page, "selectFurniture", {
            collectionName: furnitureCollectionName,
            prefabId: officeFirstPrefabId,
        });
        const officePlaced = await bridgeCall<{ entityId: string }>(page, "placeFurniture", {
            x: 320,
            y: 256,
        });
        officeEntities = await getEntities(page);
        expect(officeEntities.some((entity) => entity.id === officePlaced.entityId)).toBeTruthy();

        await page.getByTestId("standalone-switch-home").click();
        await page.waitForFunction(() => typeof window.__standaloneTest !== "undefined");
        await expect(page.getByTestId("standalone-active-scene")).toContainText("Home");
        entities = await getEntities(page);
        expect(entities.some((entity) => entity.id === placed.entityId)).toBeTruthy();
        expect(entities.some((entity) => entity.id === officePlaced.entityId)).toBeFalsy();

        console.log("step: delete undo redo");
        await bridgeCall(page, "deleteEntity", { entityId: placed.entityId });
        entities = await getEntities(page);
        expect(entities.some((entity) => entity.id === placed.entityId)).toBeFalsy();

        await bridgeCall(page, "undo");
        entities = await getEntities(page);
        expect(entities.some((entity) => entity.id === placed.entityId)).toBeTruthy();

        await bridgeCall(page, "redo");
        entities = await getEntities(page);
        expect(entities.some((entity) => entity.id === placed.entityId)).toBeFalsy();

        console.log("step: clear overlay");
        await bridgeCall(page, "clearOverlay");
        await page.waitForFunction(() => typeof window.__standaloneTest !== "undefined");
        await expect(page.getByTestId("standalone-active-scene")).toContainText("Home");
        entities = await getEntities(page);
        expect(entities.some((entity) => entity.id === placed.entityId)).toBeFalsy();

        console.log("step: network audit");
        const network = (await getSceneState(page)).network;
        expect(network.filter((entry) => /\/map(\?|$)/.test(entry.url)).length).toBe(0);
        expect(network.filter((entry) => entry.url.includes("/anonymLogin")).length).toBe(0);
        expect(network.filter((entry) => entry.url.includes("/ws/room")).length).toBe(0);
        expect(network.filter((entry) => entry.transport === "websocket").length).toBe(0);
    });
});
