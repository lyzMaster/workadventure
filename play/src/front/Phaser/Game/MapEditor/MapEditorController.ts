import type { Command } from "@workadventure/map-editor";
import type { MapEditorSceneContext } from "../SceneContext";
import type { FrontCommandInterface } from "./Commands/FrontCommandInterface";
import type { EditorToolName } from "./EditorToolName";

export interface MapEditorController {
    executeCommand(command: Command & FrontCommandInterface): Promise<void>;
    executeLocalCommand(command: Command & FrontCommandInterface): Promise<void>;
    getScene(): MapEditorSceneContext;
}

export interface MapEditorRuntimeController extends MapEditorController {
    update(time: number, dt: number): void;
    undoCommand(): Promise<void>;
    redoCommand(): Promise<void>;
    flush(): Promise<void>;
    destroy(): void;
    handleKeyDownEvent(event: KeyboardEvent): boolean;
    equipTool(tool?: EditorToolName): void;
}
