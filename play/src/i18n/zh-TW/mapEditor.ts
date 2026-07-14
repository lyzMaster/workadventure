import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const mapEditor: DeepPartial<Translation["mapEditor"]> = {
    "explorer": {
        "details": {
            "moveToEntity": "移動到實體 {name}"
        }
    },
    "properties": {
        "playAudio": {
            "actionButtonLabel": "播放音樂"
        },
        "openWebsite": {
            "actionButtonLabel": "開啟連結"
        },
        "openFile": {
            "actionButtonLabel": "開啟檔案"
        }
    }
};

export default mapEditor;
