import type { LocalMapEditorCommand } from "@workadventure/map-editor";
import type { GameMapFrontWrapper } from "../../GameMap/GameMapFrontWrapper";
import type { MapEditorSceneContext } from "../../SceneContext";
import type { MapEditorModeManager } from "../MapEditorModeManager";
import { UpdateWAMSettingFrontCommand } from "../Commands/WAM/UpdateWAMSettingFrontCommand";
import { mapEditorVisibilityStore } from "../../../../Stores/MapEditorStore";
import { MapEditorTool } from "./MapEditorTool";

export class WAMSettingsEditorTool extends MapEditorTool {
    private scene: MapEditorSceneContext;
    private mapEditorModeManager: MapEditorModeManager;

    constructor(mapEditorModeManager: MapEditorModeManager) {
        super();
        this.mapEditorModeManager = mapEditorModeManager;
        this.scene = this.mapEditorModeManager.getScene();
    }

    public update(time: number, dt: number): void {
        // Nothing to be done
    }
    public clear(): void {
        // Nothing to be done
    }
    public activate(): void {
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
    /**
     * React on commands coming from the outside
     */
    public async handleIncomingCommandMessage(editMapCommandMessage: LocalMapEditorCommand): Promise<void> {
        const commandId = editMapCommandMessage.commandId;
        if (editMapCommandMessage.type === "wam.settings.update") {
            const wam = this.scene.getGameMap().getWamFile()?.getWam();
            if (wam === undefined) {
                throw new Error("WAM file is undefined");
            }

            // execute command locally
            await this.mapEditorModeManager.executeLocalCommand(
                new UpdateWAMSettingFrontCommand(
                    wam,
                    { message: editMapCommandMessage.message },
                    this.scene.connection?.getAllTags() ?? [],
                    this.scene.roomUrl,
                    commandId,
                ),
            );
        }
        return Promise.resolve();
    }
}
