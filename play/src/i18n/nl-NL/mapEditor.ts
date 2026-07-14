import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const mapEditor: DeepPartial<Translation["mapEditor"]> = {
    "explorer": {
        "details": {
            "moveToEntity": "Verplaats naar entiteit {name}"
        }
    },
    "properties": {
        "playAudio": {
            "actionButtonLabel": "Speel muziek"
        },
        "openWebsite": {
            "actionButtonLabel": "Open link"
        },
        "openFile": {
            "actionButtonLabel": "Open bestand"
        }
    }
};

export default mapEditor;
