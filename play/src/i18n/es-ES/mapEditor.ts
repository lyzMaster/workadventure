import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const mapEditor: DeepPartial<Translation["mapEditor"]> = {
    "explorer": {
        "details": {
            "moveToEntity": "Ir a la entidad {name}"
        }
    },
    "properties": {
        "playAudio": {
            "actionButtonLabel": "Reproducir música"
        },
        "openWebsite": {
            "actionButtonLabel": "Abrir enlace"
        },
        "openFile": {
            "actionButtonLabel": "Abrir archivo"
        }
    }
};

export default mapEditor;
