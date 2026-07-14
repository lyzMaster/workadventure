import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const mapEditor: DeepPartial<Translation["mapEditor"]> = {
    "explorer": {
        "details": {
            "moveToEntity": "오브젝트로 이동: {name}"
        }
    },
    "properties": {
        "playAudio": {
            "actionButtonLabel": "음악 재생"
        },
        "openWebsite": {
            "actionButtonLabel": "링크 열기"
        },
        "openFile": {
            "actionButtonLabel": "파일 열기"
        }
    }
};

export default mapEditor;
