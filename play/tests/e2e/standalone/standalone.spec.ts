import { test, expect } from "@playwright/test";
import {
    bridgeCall,
    clearStandaloneIndexedDb,
    expectSingleCanvas,
    getEntities,
    getFurniturePrefabs,
    getPlayerState,
    getSceneState,
    gotoStandalone,
    listAgents,
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

        console.log("step: agent spawn");
        const agentAppearance = {
            textures: [
                {
                    id: "standalone-agent-e2e",
                    url: "/resources/characters/pipoya/Male%2001-1.png",
                    layer: 0,
                },
            ],
        };
        const spawnResult = await bridgeCall(page, "spawnAgent", {
            characterId: "agent-home",
            name: "Agent Home",
            sceneId: "home",
            appearance: agentAppearance,
            spawnPosition: { x: 96, y: 96, direction: "down", moving: false },
        });
        expect(spawnResult).toMatchObject({ ok: true });
        await expect(page.locator(".standalone-character-name", { hasText: "Agent Home" })).toBeVisible();
        await expect
            .poll(async () => {
                const agents = await listAgents(page);
                return agents.ok ? agents.value.length : 0;
            })
            .toBe(1);
        await expect
            .poll(async () => {
                const state = await bridgeCall(page, "getAgentState", { characterId: "agent-home" });
                return state.ok ? state.value.motionState : undefined;
            })
            .toBe("idle");

        console.log("step: agent move");
        const agentBeforeMove = await bridgeCall(page, "getAgentState", { characterId: "agent-home" });
        expect(agentBeforeMove).toMatchObject({ ok: true });
        const agentMoveResult = await bridgeCall(page, "moveAgent", {
            characterId: "agent-home",
            target: { x: 352, y: 96 },
        });
        expect(agentMoveResult).toMatchObject({ ok: true });
        const agentAfterMove = await bridgeCall(page, "getAgentState", { characterId: "agent-home" });
        expect(agentAfterMove.value.position.x).not.toBe(agentBeforeMove.value.position.x);

        console.log("step: agent blocked target");
        const wallMoveResult = await bridgeCall(page, "moveAgent", {
            characterId: "agent-home",
            target: { x: 8, y: 8 },
        });
        expect(wallMoveResult).toMatchObject({ ok: false, code: "path_not_found" });

        console.log("step: agent speech face stop");
        const speakResult = await bridgeCall(page, "speakAgent", {
            characterId: "agent-home",
            text: "hello",
            type: "speech",
        });
        expect(speakResult).toMatchObject({ ok: true });
        await expect(page.locator(".standalone-character-speech-bubble", { hasText: "hello" })).toBeVisible();
        const clearSpeechResult = await bridgeCall(page, "clearAgentSpeech", { characterId: "agent-home" });
        expect(clearSpeechResult).toMatchObject({ ok: true });
        await expect(page.locator(".standalone-character-speech-bubble", { hasText: "hello" })).toHaveCount(0);
        const faceResult = await bridgeCall(page, "faceAgent", { characterId: "agent-home", direction: "left" });
        expect(faceResult).toMatchObject({ ok: true });
        expect(faceResult.value.position.direction).toBe("left");
        const movingAgent = bridgeCall(page, "moveAgent", {
            characterId: "agent-home",
            target: { x: 416, y: 320 },
            options: { speed: 2 },
        });
        await page.waitForTimeout(50);
        const stopResult = await bridgeCall(page, "stopAgent", { characterId: "agent-home" });
        expect(stopResult).toMatchObject({ ok: true });
        await expect(movingAgent).resolves.toMatchObject({ ok: false, code: "cancelled" });

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

        const blockingPrefab = (await getFurniturePrefabs(page)).find((prefab) => prefab.hasCollisionGrid);
        expect(blockingPrefab).toBeTruthy();
        await bridgeCall(page, "selectFurniture", {
            collectionName: blockingPrefab?.collectionName,
            prefabId: blockingPrefab?.prefabId,
        });
        const blockingPlaced = await bridgeCall<{ entityId: string }>(page, "placeFurniture", {
            x: 320,
            y: 224,
        });
        const blockingEntity = (await getEntities(page)).find((entity) => entity.id === blockingPlaced.entityId);
        expect(blockingEntity).toBeTruthy();
        const furnitureBlockedMoveResult = await bridgeCall(page, "moveAgent", {
            characterId: "agent-home",
            target: { x: (blockingEntity?.x ?? 0) + 16, y: (blockingEntity?.y ?? 0) + 64 },
        });
        expect(furnitureBlockedMoveResult).toMatchObject({ ok: false, code: "path_not_found" });

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

        console.log("step: agent move cancellation and concurrency");
        const slowFirstMove = bridgeCall(page, "moveAgent", {
            characterId: "agent-home",
            target: { x: 96, y: 320 },
            options: { speed: 1 },
        });
        await page.waitForTimeout(50);
        const secondMove = bridgeCall(page, "moveAgent", {
            characterId: "agent-home",
            target: { x: 160, y: 320 },
        });
        await expect(slowFirstMove).resolves.toMatchObject({ ok: false, code: "cancelled" });
        await expect(secondMove).resolves.toMatchObject({ ok: true });

        const spawnSecondAgent = await bridgeCall(page, "spawnAgent", {
            characterId: "agent-home-2",
            name: "Agent Home 2",
            sceneId: "home",
            appearance: agentAppearance,
            spawnPosition: { x: 128, y: 96, direction: "down", moving: false },
        });
        expect(spawnSecondAgent).toMatchObject({ ok: true });
        const concurrentFirst = bridgeCall(page, "moveAgent", {
            characterId: "agent-home",
            target: { x: 352, y: 320 },
        });
        const concurrentSecond = bridgeCall(page, "moveAgent", {
            characterId: "agent-home-2",
            target: { x: 384, y: 320 },
        });
        await expect(concurrentFirst).resolves.toMatchObject({ ok: true });
        await expect(concurrentSecond).resolves.toMatchObject({ ok: true });

        const removeSecondAgent = await bridgeCall(page, "removeAgent", { characterId: "agent-home-2" });
        expect(removeSecondAgent).toMatchObject({ ok: true });
        expect(await bridgeCall(page, "getAgentState", { characterId: "agent-home-2" })).toMatchObject({
            ok: false,
            code: "character_not_found",
        });

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
        const officeAgents = await listAgents(page);
        expect(officeAgents).toMatchObject({ ok: true, value: [] });
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
        const restoredHomeAgents = await listAgents(page);
        expect(restoredHomeAgents).toMatchObject({ ok: true, value: [] });
        entities = await getEntities(page);
        expect(entities.some((entity) => entity.id === placed.entityId)).toBeTruthy();
        expect(entities.some((entity) => entity.id === officePlaced.entityId)).toBeFalsy();

        const playerStillWorksBefore = await getPlayerState(page);
        const playerStillWorksMove = await bridgeCall<{ x: number; y: number; cancelled: boolean }>(page, "movePlayer", {
            x: 96,
            y: 96,
        });
        expect(playerStillWorksMove.cancelled).toBeFalsy();
        const playerStillWorksAfter = await getPlayerState(page);
        expect(playerStillWorksAfter).not.toMatchObject({
            x: playerStillWorksBefore.x,
            y: playerStillWorksBefore.y,
        });

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
