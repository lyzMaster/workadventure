import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const mapEditor: DeepPartial<Translation["mapEditor"]> = {
    "explorer": {
        "details": {
            "moveToEntity": "移动到实体 {name}"
        }
    },
    "properties": {
        "playAudio": {
            "actionButtonLabel": "播放音乐"
        },
        "openWebsite": {
            "actionButtonLabel": "打开链接"
        },
        "openFile": {
            "actionButtonLabel": "打开文件"
        }
    }
};

export default mapEditor;
