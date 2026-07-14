import type { LocalMapEditorCommand } from "@workadventure/map-editor";
import type { GameMapFrontWrapper } from "../../GameMap/GameMapFrontWrapper";
import { mapEditorModeStore, mapEditorVisibilityStore } from "../../../../Stores/MapEditorStore";
import type { MapEditorModeManager } from "../MapEditorModeManager";
import type { MapEditorTool } from "./MapEditorTool";

export class CloseTool implements MapEditorTool {
    public constructor(private readonly mapEditorModeManager: MapEditorModeManager) {}

    public update(time: number, dt: number): void {
        // Nothing to be done
    }
    public clear(): void {
        // Nothing to be done
    }
    public activate(): void {
        this.mapEditorModeManager.equipTool(undefined);
        mapEditorModeStore.switchMode(false);
        mapEditorVisibilityStore.set(false);
    }
    public destroy(): void {
        // Nothing to be done
    }
    public subscribeToGameMapFrontWrapperEvents(gameMapFrontWrapper: GameMapFrontWrapper): void {
        // Nothing to be done
    }
    public handleKeyDownEvent(event: KeyboardEvent): void {
        // Nothing to be done
    }
    public handleIncomingCommandMessage(editMapCommandMessage: LocalMapEditorCommand): Promise<void> {
        // Nothing to be done
        return Promise.resolve();
    }
}
