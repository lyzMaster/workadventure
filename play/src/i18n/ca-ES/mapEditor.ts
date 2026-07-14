import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const mapEditor: DeepPartial<Translation["mapEditor"]> = {
    "explorer": {
        "details": {
            "moveToEntity": "Moure's a l'entitat {name}"
        }
    },
    "properties": {
        "playAudio": {
            "actionButtonLabel": "Reproduir música"
        },
        "openWebsite": {
            "actionButtonLabel": "Obrir enllaç"
        },
        "openFile": {
            "actionButtonLabel": "Obrir fitxer"
        }
    }
};

export default mapEditor;
