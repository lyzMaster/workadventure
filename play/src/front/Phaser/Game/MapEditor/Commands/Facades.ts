import type { WAMSettings } from "@workadventure/map-editor";
import { gameManager } from "../../GameManager";
import { UpdateWAMSettingFrontCommand } from "./WAM/UpdateWAMSettingFrontCommand";

/**
 * A simple facade function that creates a UpdateWAMSettingFrontCommand and executes it.
 */
export async function executeUpdateWAMSettings(updateWAMSettingsMessage: Partial<WAMSettings>): Promise<void> {
    const scene = gameManager.getCurrentGameScene();
    const wamFile = scene.wamFile ?? scene.getGameMap().getWamFile()?.getWam();
    if (!wamFile) {
        return;
    }
    await scene.getMapEditorModeManager().executeCommand(
        new UpdateWAMSettingFrontCommand(
            wamFile,
            {
                message: updateWAMSettingsMessage,
            },
            scene.connection?.getAllTags() ?? [],
            scene.roomUrl,
        ),
    );
}
