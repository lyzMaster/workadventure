import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const mapEditor: DeepPartial<Translation["mapEditor"]> = {
    "explorer": {
        "details": {
            "moveToEntity": "Zur Entität {name} bewegen"
        }
    },
    "properties": {
        "playAudio": {
            "actionButtonLabel": "Musik abspielen"
        },
        "openWebsite": {
            "actionButtonLabel": "Link öffnen"
        },
        "openFile": {
            "actionButtonLabel": "Datei öffnen"
        }
    }
};

export default mapEditor;
