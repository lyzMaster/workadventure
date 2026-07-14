import { test, expect } from "@playwright/test";
import {
    bridgeCall,
    cancelWorldCommand,
    clearStandaloneIndexedDb,
    executeWorldCommand,
    expectSingleCanvas,
    getEntities,
    getFurniturePrefabs,
    getPlayerState,
    getSceneState,
    getWorldEvents,
    gotoStandalone,
    inspectStandaloneIndexedDb,
    listAgents,
    readStandaloneAppWorld,
    readStandaloneSceneOverlay,
    seedLegacyStandaloneIndexedDbV1,
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
        await expect(executeWorldCommand(page, "scene.getState", {}, "home", undefined, "scene-state-home")).resolves.toMatchObject(
            { status: "succeeded" },
        );

        console.log("step: switch office");
        await expect(
            executeWorldCommand(page, "scene.switch", { sceneId: "office" }, undefined, undefined, "scene-switch-office"),
        ).resolves.toMatchObject({ status: "succeeded", sceneId: "office" });
        await expect(page.getByTestId("standalone-active-scene")).toContainText("Office");
        await expectSingleCanvas(page);

        const officeState = await getSceneState(page);
        expect(officeState.sceneId).toBe("office");
        expect(officeState.activeSceneId).toBe("office");

        console.log("step: switch home");
        await expect(
            executeWorldCommand(page, "scene.switch", { sceneId: "home" }, undefined, undefined, "scene-switch-home"),
        ).resolves.toMatchObject({ status: "succeeded", sceneId: "home" });
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
        const spawnResult = await executeWorldCommand(page, "agent.spawn", {
            characterId: "agent-home",
            name: "Agent Home",
            sceneId: "home",
            appearance: agentAppearance,
            spawnPosition: { x: 96, y: 96, direction: "down", moving: false },
        }, "home", undefined, "agent-spawn-home");
        expect(spawnResult).toMatchObject({ status: "succeeded" });
        await expect(page.locator(".standalone-character-name", { hasText: "Agent Home" })).toBeVisible();
        await expect
            .poll(async () => {
                const agents = await listAgents(page);
                return agents.ok ? agents.value.length : 0;
            })
            .toBe(1);
        await expect
            .poll(async () => {
                const state = await executeWorldCommand(page, "agent.getState", { characterId: "agent-home" });
                return state.status === "succeeded" ? (state.data as { motionState: string }).motionState : undefined;
            })
            .toBe("idle");

        console.log("step: agent move");
        const agentBeforeMove = await executeWorldCommand<{ position: { x: number } }>(
            page,
            "agent.getState",
            { characterId: "agent-home" },
        );
        expect(agentBeforeMove).toMatchObject({ status: "succeeded" });
        const agentMoveResult = await executeWorldCommand(page, "agent.moveTo", {
            characterId: "agent-home",
            target: { x: 352, y: 96 },
        }, undefined, undefined, "agent-move-home");
        expect(agentMoveResult).toMatchObject({ status: "succeeded" });
        const agentAfterMove = await executeWorldCommand<{ position: { x: number } }>(
            page,
            "agent.getState",
            { characterId: "agent-home" },
        );
        expect((agentAfterMove.data as { position: { x: number } }).position.x).not.toBe(
            (agentBeforeMove.data as { position: { x: number } }).position.x,
        );

        console.log("step: agent blocked target");
        const wallMoveResult = await executeWorldCommand(page, "agent.moveTo", {
            characterId: "agent-home",
            target: { x: 8, y: 8 },
        });
        expect(wallMoveResult).toMatchObject({ status: "failed", error: { code: "path_not_found" } });

        console.log("step: agent speech face stop");
        const speakResult = await executeWorldCommand(page, "agent.speak", {
            characterId: "agent-home",
            text: "hello",
            type: "speech",
        });
        expect(speakResult).toMatchObject({ status: "succeeded" });
        await expect(page.locator(".standalone-character-speech-bubble", { hasText: "hello" })).toBeVisible();
        const clearSpeechResult = await executeWorldCommand(page, "agent.clearSpeech", { characterId: "agent-home" });
        expect(clearSpeechResult).toMatchObject({ status: "succeeded" });
        await expect(page.locator(".standalone-character-speech-bubble", { hasText: "hello" })).toHaveCount(0);
        const faceResult = await executeWorldCommand<{ position: { direction: string } }>(
            page,
            "agent.face",
            { characterId: "agent-home", direction: "left" },
        );
        expect(faceResult).toMatchObject({ status: "succeeded" });
        expect((faceResult.data as { position: { direction: string } }).position.direction).toBe("left");
        const movingCommandId = "agent-move-cancel-explicit";
        const movingAgent = executeWorldCommand(page, "agent.moveTo", {
            characterId: "agent-home",
            target: { x: 416, y: 320 },
            options: { speed: 2 },
        }, undefined, undefined, movingCommandId);
        await page.waitForTimeout(50);
        expect(await cancelWorldCommand(page, movingCommandId)).toBe(true);
        await expect(movingAgent).resolves.toMatchObject({ status: "cancelled", error: { code: "cancelled" } });
        const stopResult = await executeWorldCommand(page, "agent.stop", { characterId: "agent-home" });
        expect(stopResult).toMatchObject({ status: "succeeded" });

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
        const placedResult = await executeWorldCommand<{ id: string }>(
            page,
            "furniture.place",
            {
                entityId: "entity-home-1",
                prefab: { collectionName: furnitureCollectionName, prefabId: firstPrefabId },
                position: { x: playerAfterCollision.x + 64, y: playerAfterCollision.y + 64 },
            },
            "home",
            undefined,
            "furniture-place-home-1",
        );
        expect(placedResult).toMatchObject({ status: "succeeded" });
        const placed = { entityId: (placedResult.data as { id: string }).id };
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
        const blockingPlacedResult = await executeWorldCommand<{ id: string }>(
            page,
            "furniture.place",
            {
                entityId: "entity-home-2",
                prefab: {
                    collectionName: blockingPrefab?.collectionName,
                    prefabId: blockingPrefab?.prefabId,
                },
                position: { x: 320, y: 224 },
            },
            "home",
            undefined,
            "furniture-place-home-2",
        );
        expect(blockingPlacedResult).toMatchObject({ status: "succeeded" });
        const blockingPlaced = { entityId: (blockingPlacedResult.data as { id: string }).id };
        const blockingEntity = (await getEntities(page)).find((entity) => entity.id === blockingPlaced.entityId);
        expect(blockingEntity).toBeTruthy();
        const furnitureBlockedMoveResult = await executeWorldCommand(page, "agent.moveTo", {
            characterId: "agent-home",
            target: { x: (blockingEntity?.x ?? 0) + 16, y: (blockingEntity?.y ?? 0) + 64 },
        });
        expect(furnitureBlockedMoveResult).toMatchObject({ status: "failed", error: { code: "path_not_found" } });

        console.log("step: update furniture");
        await bridgeCall(page, "selectEntity", { entityId: placed.entityId });
        await expect
            .poll(async () => (await getSceneState(page)).editor.selectedEntityId)
            .toBe(placed.entityId);

        const moved = await executeWorldCommand(page, "furniture.move", {
            entityId: placed.entityId,
            position: {
                x: (created?.x ?? 0) + 32,
                y: (created?.y ?? 0) + 32,
            },
        });
        entities = await getEntities(page);
        const movedEntity = entities.find((entity) => entity.id === placed.entityId);
        expect(moved).toMatchObject({ status: "succeeded" });
        expect(movedEntity?.x).toBe((moved.data as { x: number }).x);
        expect(movedEntity?.y).toBe((moved.data as { y: number }).y);

        const secondButton = catalogButtons.nth(1);
        const secondPrefabTestId = (await secondButton.getAttribute("data-testid")) ?? "";
        const secondPrefabId = secondPrefabTestId.replace("standalone-prefab-", "");
        await bridgeCall(page, "selectFurniture", {
            collectionName: furnitureCollectionName,
            prefabId: secondPrefabId,
        });
        await executeWorldCommand(page, "furniture.setVariant", {
            entityId: placed.entityId,
            prefab: {
                collectionName: movedEntity?.collectionName,
                prefabId: secondPrefabId,
            },
        });
        await expect
            .poll(async () => (await getEntities(page)).find((entity) => entity.id === placed.entityId)?.prefabId)
            .toBe(secondPrefabId);

        await executeWorldCommand(page, "history.undo", {});
        await expect
            .poll(async () => (await getEntities(page)).find((entity) => entity.id === placed.entityId)?.prefabId)
            .toBe(firstPrefabId);

        await executeWorldCommand(page, "history.redo", {});
        await expect
            .poll(async () => (await getEntities(page)).find((entity) => entity.id === placed.entityId)?.prefabId)
            .toBe(secondPrefabId);

        console.log("step: agent move cancellation and concurrency");
        const duplicateCommandId = "agent-duplicate-move";
        const slowFirstMove = executeWorldCommand(page, "agent.moveTo", {
            characterId: "agent-home",
            target: { x: 96, y: 320 },
            options: { speed: 1 },
        }, undefined, undefined, duplicateCommandId);
        await page.waitForTimeout(50);
        const duplicateMove = executeWorldCommand(page, "agent.moveTo", {
            characterId: "agent-home",
            target: { x: 96, y: 320 },
            options: { speed: 1 },
        }, undefined, undefined, duplicateCommandId);
        await expect(duplicateMove).resolves.toMatchObject({ status: "succeeded" });
        const secondMove = executeWorldCommand(page, "agent.moveTo", {
            characterId: "agent-home",
            target: { x: 160, y: 320 },
        }, undefined, undefined, "agent-second-move");
        await expect(slowFirstMove).resolves.toMatchObject({ status: "succeeded" });
        await expect(secondMove).resolves.toMatchObject({ status: "succeeded" });

        const spawnSecondAgent = await executeWorldCommand(page, "agent.spawn", {
            characterId: "agent-home-2",
            name: "Agent Home 2",
            sceneId: "home",
            appearance: agentAppearance,
            spawnPosition: { x: 128, y: 96, direction: "down", moving: false },
        }, "home", undefined, "agent-spawn-home-2");
        expect(spawnSecondAgent).toMatchObject({ status: "succeeded" });
        const concurrentFirst = executeWorldCommand(page, "agent.moveTo", {
            characterId: "agent-home",
            target: { x: 352, y: 320 },
        }, undefined, undefined, "agent-concurrent-1");
        const concurrentSecond = executeWorldCommand(page, "agent.moveTo", {
            characterId: "agent-home-2",
            target: { x: 384, y: 320 },
        }, undefined, undefined, "agent-concurrent-2");
        await expect(concurrentFirst).resolves.toMatchObject({ status: "succeeded" });
        await expect(concurrentSecond).resolves.toMatchObject({ status: "succeeded" });

        const removeSecondAgent = await executeWorldCommand(page, "agent.remove", { characterId: "agent-home-2" });
        expect(removeSecondAgent).toMatchObject({ status: "succeeded" });
        expect(await executeWorldCommand(page, "agent.getState", { characterId: "agent-home-2" })).toMatchObject({
            status: "failed",
            error: { code: "character_not_found" },
        });

        console.log("step: reload restore");
        const playerBeforeReload = await getPlayerState(page);
        await executeWorldCommand(page, "world.flush", {});
        const appWorldBeforeReload = (await readStandaloneAppWorld(page)) as
            | {
                  activeSceneId: string;
                  scenes?: Record<string, { agents?: Record<string, unknown> }>;
              }
            | null;
        const homeOverlayBeforeReload = await readStandaloneSceneOverlay(page, "home");
        expect(appWorldBeforeReload).not.toBeNull();
        expect(appWorldBeforeReload?.activeSceneId).toBe("home");
        expect(appWorldBeforeReload?.scenes?.home?.agents).toHaveProperty("agent-home");
        expect(appWorldBeforeReload?.scenes?.home?.agents).not.toHaveProperty("agent-home-2");
        expect(appWorldBeforeReload?.scenes?.home).not.toHaveProperty("entities");
        expect(homeOverlayBeforeReload).not.toBeNull();
        expect(homeOverlayBeforeReload).toHaveProperty("entities");
        await page.reload();
        await page.waitForFunction(() => typeof window.__standaloneTest !== "undefined");
        await expect
            .poll(async () => (await getEntities(page)).some((entity) => entity.id === placed.entityId))
            .toBeTruthy();
        const playerAfterReload = await getPlayerState(page);
        expect(playerAfterReload).toMatchObject({
            x: playerBeforeReload.x,
            y: playerBeforeReload.y,
        });
        const restoredAgentsAfterReload = await listAgents(page);
        expect(restoredAgentsAfterReload.ok).toBe(true);
        expect(restoredAgentsAfterReload.ok ? restoredAgentsAfterReload.value.map((agent) => agent.id).sort() : []).toEqual([
            "agent-home",
        ]);

        console.log("step: office isolate");
        await expect(
            executeWorldCommand(
                page,
                "agent.spawn",
                {
                    characterId: "agent-switch",
                    name: "Agent Switch",
                    sceneId: "home",
                    appearance: agentAppearance,
                    spawnPosition: { x: 96, y: 96, direction: "down", moving: false },
                },
                "home",
                undefined,
                "agent-spawn-switch-home",
            ),
        ).resolves.toMatchObject({ status: "succeeded" });
        const moveBeforeSwitch = executeWorldCommand(
            page,
            "agent.moveTo",
            { characterId: "agent-switch", target: { x: 352, y: 96 }, options: { speed: 0.25 } },
            "home",
            undefined,
            "agent-switch-before-office-switch",
        );
        await expect
            .poll(async () => {
                const events = await getWorldEvents(page);
                return events.some(
                    (event) =>
                        event.commandId === "agent-switch-before-office-switch" && event.type === "command.started",
                );
            })
            .toBeTruthy();
        await expect(
            executeWorldCommand(page, "scene.switch", { sceneId: "office" }, undefined, undefined, "scene-switch-office-2"),
        ).resolves.toMatchObject({ status: "succeeded" });
        await expect(moveBeforeSwitch).resolves.toMatchObject({ status: "cancelled" });
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
        const officePlacedResult = await executeWorldCommand<{ id: string }>(
            page,
            "furniture.place",
            {
                entityId: "entity-office-1",
                prefab: { collectionName: furnitureCollectionName, prefabId: officeFirstPrefabId },
                position: { x: 320, y: 256 },
            },
            "office",
            undefined,
            "furniture-place-office-1",
        );
        expect(officePlacedResult).toMatchObject({ status: "succeeded" });
        const officePlaced = { entityId: (officePlacedResult.data as { id: string }).id };
        officeEntities = await getEntities(page);
        expect(officeEntities.some((entity) => entity.id === officePlaced.entityId)).toBeTruthy();

        await expect(
            executeWorldCommand(page, "scene.switch", { sceneId: "home" }, undefined, undefined, "scene-switch-home-2"),
        ).resolves.toMatchObject({ status: "succeeded" });
        await page.waitForFunction(() => typeof window.__standaloneTest !== "undefined");
        await expect(page.getByTestId("standalone-active-scene")).toContainText("Home");
        const restoredHomeAgents = await listAgents(page);
        expect(restoredHomeAgents.ok).toBe(true);
        expect(restoredHomeAgents.ok ? restoredHomeAgents.value.map((agent) => agent.id).sort() : []).toEqual([
            "agent-home",
            "agent-switch",
        ]);
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
        await executeWorldCommand(page, "furniture.remove", { entityId: placed.entityId });
        entities = await getEntities(page);
        expect(entities.some((entity) => entity.id === placed.entityId)).toBeFalsy();

        await executeWorldCommand(page, "history.undo", {});
        entities = await getEntities(page);
        expect(entities.some((entity) => entity.id === placed.entityId)).toBeTruthy();

        await executeWorldCommand(page, "history.redo", {});
        entities = await getEntities(page);
        expect(entities.some((entity) => entity.id === placed.entityId)).toBeFalsy();

        console.log("step: clear overlay");
        await bridgeCall(page, "clearOverlay");
        await page.waitForFunction(() => typeof window.__standaloneTest !== "undefined");
        await expect(page.getByTestId("standalone-active-scene")).toContainText("Home");
        entities = await getEntities(page);
        expect(entities.some((entity) => entity.id === placed.entityId)).toBeFalsy();
        const agentsAfterClearOverlay = await listAgents(page);
        expect(agentsAfterClearOverlay.ok).toBe(true);
        expect(agentsAfterClearOverlay.ok ? agentsAfterClearOverlay.value.map((agent) => agent.id).sort() : []).toEqual([
            "agent-home",
            "agent-switch",
        ]);

        console.log("step: network audit");
        const network = (await getSceneState(page)).network;
        expect(network.filter((entry) => /\/map(\?|$)/.test(entry.url)).length).toBe(0);
        expect(network.filter((entry) => entry.url.includes("/anonymLogin")).length).toBe(0);
        expect(network.filter((entry) => entry.url.includes("/ws/room")).length).toBe(0);
        expect(network.filter((entry) => entry.transport === "websocket").length).toBe(0);

        const events = await getWorldEvents(page);
        expect(events.some((event) => event.type === "scene.changed")).toBeTruthy();
        expect(events.some((event) => event.type === "agent.spawned")).toBeTruthy();
        expect(events.some((event) => event.type === "furniture.placed")).toBeTruthy();
    });

    test("IndexedDB v1 升级保留 scene-overlays 并创建 app-worlds", async ({ page }) => {
        await seedLegacyStandaloneIndexedDbV1(page, "home");

        await gotoStandalone(page, "home");
        await expect(executeWorldCommand(page, "world.flush", {})).resolves.toMatchObject({ status: "succeeded" });

        const database = await inspectStandaloneIndexedDb(page);
        expect(database.name).toBe("workadventure-standalone");
        expect(database.version).toBe(2);
        expect(database.stores.sort()).toEqual(["app-worlds", "scene-overlays"]);

        const overlay = await readStandaloneSceneOverlay(page, "home");
        expect(overlay).toMatchObject({
            sceneId: "home",
            baseMapId: "standalone-home",
            baseMapRevision: 1,
        });

        const appWorld = await readStandaloneAppWorld(page);
        expect(appWorld).toMatchObject({
            schemaVersion: 1,
            worldId: "standalone-default-world",
            activeSceneId: "home",
        });
    });

    test("AppWorld 持久化失败时保持运行时结果并允许 flush 重试", async ({ page }) => {
        await page.addInitScript(() => {
            const marker = "__standaloneFailAppWorldPutInstalled";
            if ((window as Window & Record<string, unknown>)[marker]) {
                return;
            }
            (window as Window & Record<string, unknown>)[marker] = true;
            const originalPut = IDBObjectStore.prototype.put;
            IDBObjectStore.prototype.put = function (...args: Parameters<IDBObjectStore["put"]>) {
                if (
                    sessionStorage.getItem("__standalone_fail_app_world_put") === "true" &&
                    this.transaction.db.name === "workadventure-standalone" &&
                    this.name === "app-worlds"
                ) {
                    throw new Error("Injected AppWorld put failure");
                }
                return originalPut.apply(this, args);
            };
        });

        await gotoStandalone(page, "home");

        const agentAppearance = {
            textures: [
                {
                    id: "standalone-agent-persistence-failure",
                    url: "/resources/characters/pipoya/Male%2001-1.png",
                    layer: 0,
                },
            ],
        };
        await expect(
            executeWorldCommand(
                page,
                "agent.spawn",
                {
                    characterId: "agent-persist",
                    name: "Agent Persist",
                    sceneId: "home",
                    appearance: agentAppearance,
                    spawnPosition: { x: 128, y: 128, direction: "down", moving: false },
                },
                "home",
                undefined,
                "agent-spawn-persist",
            ),
        ).resolves.toMatchObject({ status: "succeeded" });

        await page.evaluate(() => {
            sessionStorage.setItem("__standalone_fail_app_world_put", "true");
        });

        const faceResult = await executeWorldCommand<{ position: { direction: string } }>(
            page,
            "agent.face",
            { characterId: "agent-persist", direction: "right" },
            undefined,
            undefined,
            "agent-face-persist-failure",
        );
        expect(faceResult).toMatchObject({
            status: "failed",
            error: {
                code: "persistence_failed",
                details: {
                    runtimeApplied: true,
                    dirty: true,
                },
            },
        });

        const runtimeStateAfterFailure = await executeWorldCommand<{ position: { direction: string } }>(
            page,
            "agent.getState",
            { characterId: "agent-persist" },
        );
        expect(runtimeStateAfterFailure).toMatchObject({ status: "succeeded" });
        expect((runtimeStateAfterFailure.data as { position: { direction: string } }).position.direction).toBe("right");

        await expect(
            executeWorldCommand(page, "world.flush", {}, undefined, undefined, "world-flush-persist-failure"),
        ).resolves.toMatchObject({
            status: "failed",
            error: { code: "persistence_failed" },
        });

        const sceneStateDuringFailure = await executeWorldCommand<{
            persistence: { dirty: boolean; lastError?: { code: string } };
        }>(page, "scene.getState", {});
        expect(sceneStateDuringFailure).toMatchObject({ status: "succeeded" });
        expect(
            (sceneStateDuringFailure.data as {
                persistence: { dirty: boolean; lastError?: { code: string } };
            }).persistence,
        ).toMatchObject({
            dirty: true,
            lastError: { code: "persistence_failed" },
        });

        await page.evaluate(() => {
            sessionStorage.removeItem("__standalone_fail_app_world_put");
        });

        await expect(
            executeWorldCommand(page, "world.flush", {}, undefined, undefined, "world-flush-persist-retry"),
        ).resolves.toMatchObject({
            status: "succeeded",
            data: {
                appWorldSaved: true,
                sceneOverlaySaved: true,
            },
        });

        const sceneStateAfterRecovery = await executeWorldCommand<{
            persistence: { dirty: boolean; lastError?: { code: string } };
        }>(page, "scene.getState", {});
        expect(sceneStateAfterRecovery).toMatchObject({ status: "succeeded" });
        expect(
            (sceneStateAfterRecovery.data as {
                persistence: { dirty: boolean; lastError?: { code: string } };
            }).persistence.dirty,
        ).toBe(false);

        await page.reload();
        await page.waitForFunction(() => typeof window.__standaloneTest !== "undefined");
        await expect
            .poll(async () => executeWorldCommand(page, "agent.getState", { characterId: "agent-persist" }))
            .toMatchObject({
                status: "succeeded",
                data: {
                    position: { direction: "right" },
                },
            });
    });
});
