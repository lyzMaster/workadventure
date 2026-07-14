import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const mapEditor: DeepPartial<Translation["mapEditor"]> = {
    "explorer": {
        "details": {
            "moveToEntity": "K entitě {name} hić"
        }
    },
    "properties": {
        "playAudio": {
            "actionButtonLabel": "Hudźbu wothrać"
        },
        "openWebsite": {
            "actionButtonLabel": "Link wočinić"
        },
        "openFile": {
            "actionButtonLabel": "Dataju wočinić"
        }
    }
};

export default mapEditor;
