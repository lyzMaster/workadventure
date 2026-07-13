import type { LocalMapEditorCommand } from "@workadventure/map-editor";
import type { GameMapFrontWrapper } from "../../GameMap/GameMapFrontWrapper";

export abstract class MapEditorTool {
    public abstract update(time: number, dt: number): void;
    public abstract clear(): void;
    public abstract activate(): void;
    public abstract destroy(): void;
    public abstract subscribeToGameMapFrontWrapperEvents(gameMapFrontWrapper: GameMapFrontWrapper): void;
    public abstract handleKeyDownEvent(event: KeyboardEvent): void;
    /**
     * React on commands coming from the outside
     */
    public abstract handleIncomingCommandMessage(editMapCommandMessage: LocalMapEditorCommand): Promise<void>;
}
