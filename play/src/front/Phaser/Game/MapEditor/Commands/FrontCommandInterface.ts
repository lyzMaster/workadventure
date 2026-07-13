import type { Command, LocalMapEditorCommand } from "@workadventure/map-editor";

/**
 * Commands implementing this interface will be able to emit an event to the Pusher and generate an undo command
 */
export interface FrontCommandInterface {
    getUndoCommand(): Command & FrontCommandInterface;

    toDto(sceneId: string): LocalMapEditorCommand;
}
