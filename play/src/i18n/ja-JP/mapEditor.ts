import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const mapEditor: DeepPartial<Translation["mapEditor"]> = {
    "explorer": {
        "details": {
            "moveToEntity": "エンティティ {name} に移動"
        }
    },
    "properties": {
        "playAudio": {
            "actionButtonLabel": "ミュージックを再生"
        },
        "openWebsite": {
            "actionButtonLabel": "リンクを開く"
        },
        "openFile": {
            "actionButtonLabel": "ファイルを開く"
        }
    }
};

export default mapEditor;
