import type { Command, LocalMapEditorCommand } from "@workadventure/map-editor";
import type { Unsubscriber } from "svelte/store";
import { get } from "svelte/store";
import type { MapEditorSceneContext } from "../../front/Phaser/Game/SceneContext";
import { mapEditorModeStore, mapEditorSelectedToolStore } from "../../front/Stores/MapEditorCoreStore";
import { mapEditorSelectedEntityIdStore } from "../../front/Stores/MapEditorEntityEditorStore";
import { EntityEditorTool } from "../../front/Phaser/Game/MapEditor/Tools/EntityEditorTool";
import type { MapEditorRuntimeController } from "../../front/Phaser/Game/MapEditor/MapEditorController";
import type { FrontCommandInterface } from "../../front/Phaser/Game/MapEditor/Commands/FrontCommandInterface";
import type { FrontCommand } from "../../front/Phaser/Game/MapEditor/Commands/FrontCommand";
import type { MapEditResult, MapEditTransport } from "../../front/Phaser/Game/MapEditor/MapEditTransport";
import { EditorToolName } from "../../front/Phaser/Game/MapEditor/EditorToolName";

export interface StandaloneEntityMapEditorSnapshot {
    active: boolean;
    canUndo: boolean;
    canRedo: boolean;
    selectedEntityId?: string;
}

const unsupportedMapEditTransport: MapEditTransport = {
    acknowledgement: "local",
    submit(command: FrontCommand): Promise<MapEditResult> {
        return Promise.resolve({
            ok: false,
            commandId: command.commandId,
            code: "unsupported_command",
            message: "No standalone map edit transport is attached",
        });
    },
};

export class StandaloneEntityMapEditorModeManager implements MapEditorRuntimeController {
    private readonly entityEditorTool: EntityEditorTool;
    private active = false;
    private activeTool?: EditorToolName;
    private readonly localCommandsHistory: FrontCommand[] = [];
    private currentCommandIndex = -1;
    private currentRunningCommand: Promise<void>;
    private runningUndoRedoCommand: Promise<void> = Promise.resolve();
    private mapEditorModeUnsubscriber?: Unsubscriber;
    private selectedEntityIdUnsubscriber?: Unsubscriber;
    private selectedEntityId?: string;

    public constructor(
        private readonly scene: MapEditorSceneContext,
        private readonly mapEditTransport: MapEditTransport = unsupportedMapEditTransport,
    ) {
        this.entityEditorTool = new EntityEditorTool(this);
        this.entityEditorTool.subscribeToGameMapFrontWrapperEvents(this.scene.getGameMapFrontWrapper());
        this.currentRunningCommand = this.scene.getGameMapFrontWrapper().initializedPromise.promise;
        this.subscribeToStores();
    }

    public update(time: number, dt: number): void {
        this.currentlyActiveTool?.update(time, dt);
    }

    public async executeCommand(command: Command & FrontCommandInterface): Promise<void> {
        await (this.currentRunningCommand = this.currentRunningCommand.then(async () => {
            await command.execute();
            const result = await this.mapEditTransport.submit(command);
            if (!result.ok) {
                await command.getUndoCommand().execute();
                throw new Error(`Map edit ${result.code}: ${result.message}`);
            }
            if (this.currentCommandIndex !== this.localCommandsHistory.length - 1) {
                this.localCommandsHistory.splice(this.currentCommandIndex + 1);
            }
            this.localCommandsHistory.push(command);
            this.currentCommandIndex += 1;
            this.scene.getGameMap().getWamFile()?.updateLastCommandIdProperty(command.commandId);
        }));
    }

    public async executeLocalCommand(command: Command & FrontCommandInterface): Promise<void> {
        await (this.currentRunningCommand = this.currentRunningCommand.then(async () => {
            await command.execute();
            this.scene.getGameMap().getWamFile()?.updateLastCommandIdProperty(command.commandId);
        }));
    }

    public async undoCommand(): Promise<void> {
        if (this.localCommandsHistory.length === 0 || this.currentCommandIndex === -1) {
            return;
        }
        this.runningUndoRedoCommand = this.runningUndoRedoCommand.then(async () => {
            const command = this.localCommandsHistory[this.currentCommandIndex];
            const undoCommand = command.getUndoCommand();
            await undoCommand.execute();
            const result = await this.mapEditTransport.submit(undoCommand);
            if (!result.ok) {
                await command.execute();
                throw new Error(`Map edit ${result.code}: ${result.message}`);
            }
            this.currentCommandIndex -= 1;
        });
        await this.runningUndoRedoCommand;
    }

    public async redoCommand(): Promise<void> {
        if (
            this.localCommandsHistory.length === 0 ||
            this.currentCommandIndex === this.localCommandsHistory.length - 1
        ) {
            return;
        }
        this.runningUndoRedoCommand = this.runningUndoRedoCommand.then(async () => {
            const command = this.localCommandsHistory[this.currentCommandIndex + 1];
            await command.execute();
            const result = await this.mapEditTransport.submit(command);
            if (!result.ok) {
                await command.getUndoCommand().execute();
                throw new Error(`Map edit ${result.code}: ${result.message}`);
            }
            this.currentCommandIndex += 1;
        });
        await this.runningUndoRedoCommand;
    }

    public async updateMapToNewest(commands: LocalMapEditorCommand[]): Promise<void> {
        for (const command of commands) {
            await this.entityEditorTool.handleIncomingCommandMessage(command);
        }
    }

    public getSnapshot(): StandaloneEntityMapEditorSnapshot {
        return {
            active: this.active,
            canUndo: this.currentCommandIndex >= 0,
            canRedo: this.currentCommandIndex < this.localCommandsHistory.length - 1,
            selectedEntityId: this.selectedEntityId,
        };
    }

    public setSelectedEntityId(entityId: string | undefined): void {
        this.selectedEntityId = entityId;
    }

    public async flush(): Promise<void> {
        await this.currentRunningCommand;
        await this.runningUndoRedoCommand;
        await this.mapEditTransport.flush?.();
    }

    public destroy(): void {
        this.entityEditorTool.destroy();
        this.mapEditorModeUnsubscriber?.();
        this.selectedEntityIdUnsubscriber?.();
    }

    public handleKeyDownEvent(event: KeyboardEvent): boolean {
        this.currentlyActiveTool?.handleKeyDownEvent(event);
        if (!get(mapEditorModeStore)) {
            return false;
        }
        switch (event.key.toLowerCase()) {
            case "escape":
            case "dead":
            case "`":
                this.equipTool(undefined);
                return true;
            case "3":
                this.equipTool(EditorToolName.EntityEditor);
                return true;
            case "z":
                if (event.ctrlKey || event.metaKey) {
                    if (event.shiftKey) {
                        this.redoCommand().catch((error) => console.error(error));
                    } else {
                        this.undoCommand().catch((error) => console.error(error));
                    }
                    return true;
                }
                return false;
            default:
                return false;
        }
    }

    public equipTool(tool?: EditorToolName): void {
        const nextTool = tool === EditorToolName.EntityEditor ? tool : undefined;
        if (this.activeTool === nextTool) {
            return;
        }
        this.currentlyActiveTool?.clear();
        this.activeTool = nextTool;
        this.currentlyActiveTool?.activate();
        mapEditorSelectedToolStore.set(nextTool);
    }

    public getScene(): MapEditorSceneContext {
        return this.scene;
    }

    private get currentlyActiveTool(): EntityEditorTool | undefined {
        return this.activeTool === EditorToolName.EntityEditor ? this.entityEditorTool : undefined;
    }

    private subscribeToStores(): void {
        this.mapEditorModeUnsubscriber = mapEditorModeStore.subscribe((active) => {
            this.active = active;
            this.equipTool(active ? EditorToolName.EntityEditor : undefined);
        });
        this.selectedEntityIdUnsubscriber = mapEditorSelectedEntityIdStore.subscribe((entityId) => {
            this.selectedEntityId = entityId;
        });
    }
}
