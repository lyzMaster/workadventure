import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const mapEditor: DeepPartial<Translation["mapEditor"]> = {
    "explorer": {
        "details": {
            "moveToEntity": "K entitě {name} hyś"
        }
    },
    "properties": {
        "playAudio": {
            "actionButtonLabel": "Muziku wótegraś"
        },
        "openWebsite": {
            "actionButtonLabel": "Link wótcyniś"
        },
        "openFile": {
            "actionButtonLabel": "Dataju wótcyniś"
        }
    }
};

export default mapEditor;
