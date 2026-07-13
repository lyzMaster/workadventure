import {
    CreateEntityCommand,
    DeleteEntityCommand,
    UpdateEntityCommand,
    WamFile,
    type WAMEntityData,
    type WAMFileFormat,
} from "@workadventure/map-editor";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RoomConnection } from "../../../src/front/Connection/RoomConnection";
import type { FrontCommandInterface } from "../../../src/front/Phaser/Game/MapEditor/Commands/FrontCommandInterface";
import { OnlineMapEditTransport } from "../../../src/front/Phaser/Game/MapEditor/OnlineMapEditTransport";
import { LocalMapEditTransport } from "../../../src/standalone/LocalMapEditTransport";
import type { SceneOverlay } from "../../../src/standalone/SceneOverlay";
import type { SceneStorage } from "../../../src/standalone/SceneStorage";
import { standaloneSceneRegistry } from "../../../src/standalone/StandaloneSceneRegistry";

const chair: WAMEntityData = {
    x: 32,
    y: 64,
    prefabRef: { collectionName: "basic furniture", id: "chair-down-grey" },
    properties: [],
};

class MemorySceneStorage implements SceneStorage {
    public overlay: SceneOverlay | null = null;
    public savePromises: Promise<void>[] = [];
    public loadOverlay(): Promise<SceneOverlay | null> {
        return Promise.resolve(this.overlay);
    }
    public saveOverlay(_sceneId: string, overlay: SceneOverlay): Promise<void> {
        const promise = Promise.resolve().then(() => {
            this.overlay = structuredClone(overlay);
        });
        this.savePromises.push(promise);
        return promise;
    }
    public clearOverlay(): Promise<void> {
        this.overlay = null;
        return Promise.resolve();
    }
}

class TestCreateCommand extends CreateEntityCommand implements FrontCommandInterface {
    public getUndoCommand(): TestDeleteCommand {
        return new TestDeleteCommand(this.wamFile, this.entityId);
    }
    public emitEvent = vi.fn();
}

class TestDeleteCommand extends DeleteEntityCommand implements FrontCommandInterface {
    public getUndoCommand(): TestCreateCommand {
        if (!this.entityConfig) throw new Error("Delete command has not executed");
        return new TestCreateCommand(this.wamFile, this.entityId, this.entityConfig);
    }
    public emitEvent = vi.fn();
}

class TestUpdateCommand extends UpdateEntityCommand implements FrontCommandInterface {
    public getUndoCommand(): TestUpdateCommand {
        return new TestUpdateCommand(this.wamFile, this.entityId, this.oldConfig, undefined, this.newConfig);
    }
    public emitEvent = vi.fn();
}

function createWam(): WamFile {
    const data: WAMFileFormat = {
        version: "2.1.0",
        mapUrl: "./map.tmj",
        entities: {},
        areas: [],
        entityCollections: [],
    };
    return new WamFile(data);
}

describe("LocalMapEditTransport", () => {
    let wamFile: WamFile;
    let storage: MemorySceneStorage;
    let transport: LocalMapEditTransport;

    beforeEach(() => {
        wamFile = createWam();
        storage = new MemorySceneStorage();
        transport = new LocalMapEditTransport(standaloneSceneRegistry.home, storage, () => wamFile, []);
    });

    it("persists a created entity", async () => {
        const command = new TestCreateCommand(wamFile, "chair", chair);
        await command.execute();

        await expect(transport.submit(command)).resolves.toMatchObject({ ok: true });
        expect(storage.overlay?.entities.chair).toEqual(chair);
    });

    it("persists an updated position and prefabRef", async () => {
        await new TestCreateCommand(wamFile, "chair", chair).execute();
        const command = new TestUpdateCommand(wamFile, "chair", {
            x: 128,
            prefabRef: { collectionName: "basic furniture", id: "chair-left-blue" },
        });
        await command.execute();

        await transport.submit(command);

        expect(storage.overlay?.entities.chair).toMatchObject({
            x: 128,
            prefabRef: { id: "chair-left-blue" },
        });
    });

    it("does not restore a deleted entity", async () => {
        await new TestCreateCommand(wamFile, "chair", chair).execute();
        const command = new TestDeleteCommand(wamFile, "chair");
        await command.execute();

        await transport.submit(command);

        expect(storage.overlay?.entities.chair).toBeUndefined();
    });

    it("persists undo and redo states", async () => {
        const create = new TestCreateCommand(wamFile, "chair", chair);
        await create.execute();
        await transport.submit(create);

        const undo = create.getUndoCommand();
        await undo.execute();
        await transport.submit(undo);
        expect(storage.overlay?.entities.chair).toBeUndefined();

        const redo = undo.getUndoCommand();
        await redo.execute();
        await transport.submit(redo);
        expect(storage.overlay?.entities.chair).toEqual(chair);
    });

    it("reports scene_not_loaded without writing", async () => {
        const command = new TestCreateCommand(wamFile, "chair", chair);
        const unloaded = new LocalMapEditTransport(standaloneSceneRegistry.home, storage, () => undefined, []);

        await expect(unloaded.submit(command)).resolves.toMatchObject({ ok: false, code: "scene_not_loaded" });
    });

    it("flush waits for the last persistence write", async () => {
        const command = new TestCreateCommand(wamFile, "chair", chair);
        await command.execute();

        const submitPromise = transport.submit(command);
        await transport.flush();
        await submitPromise;

        expect(storage.overlay?.sceneId).toBe("home");
        expect(storage.overlay?.entities.chair).toEqual(chair);
    });
});

describe("OnlineMapEditTransport", () => {
    it("keeps the original FrontCommand.emitEvent(RoomConnection) behavior", async () => {
        const connection = {} as RoomConnection;
        const command = new TestCreateCommand(createWam(), "chair", chair);
        const transport = new OnlineMapEditTransport(() => connection);

        await expect(transport.submit(command)).resolves.toEqual({ ok: true, commandId: command.commandId });
        expect(command.emitEvent).toHaveBeenCalledOnce();
        expect(command.emitEvent).toHaveBeenCalledWith(connection);
    });
});
