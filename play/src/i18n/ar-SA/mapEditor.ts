import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const mapEditor: DeepPartial<Translation["mapEditor"]> = {
    "explorer": {
        "details": {
            "moveToEntity": "الانتقال إلى الكائن {name}"
        }
    },
    "properties": {
        "playAudio": {
            "actionButtonLabel": "تشغيل الموسيقى"
        },
        "openWebsite": {
            "actionButtonLabel": "فتح الرابط"
        },
        "openFile": {
            "actionButtonLabel": "فتح الملف"
        }
    }
};

export default mapEditor;
