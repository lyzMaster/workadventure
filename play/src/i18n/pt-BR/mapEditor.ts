import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const mapEditor: DeepPartial<Translation["mapEditor"]> = {
    "explorer": {
        "details": {
            "moveToEntity": "Mover para entidade {name}"
        }
    },
    "properties": {
        "playAudio": {
            "actionButtonLabel": "Tocar música"
        },
        "openWebsite": {
            "actionButtonLabel": "Abrir link"
        },
        "openFile": {
            "actionButtonLabel": "Abrir arquivo"
        }
    }
};

export default mapEditor;
