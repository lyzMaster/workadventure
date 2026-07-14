import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const mapEditor: DeepPartial<Translation["mapEditor"]> = {
    "explorer": {
        "details": {
            "moveToEntity": "Vai all'entità {name}"
        }
    },
    "properties": {
        "playAudio": {
            "actionButtonLabel": "Riproduci musica"
        },
        "openWebsite": {
            "actionButtonLabel": "Apri link"
        },
        "openFile": {
            "actionButtonLabel": "Apri file"
        }
    }
};

export default mapEditor;
