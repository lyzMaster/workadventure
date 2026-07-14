import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const mapEditor: DeepPartial<Translation["mapEditor"]> = {
    "explorer": {
        "details": {
            "moveToEntity": "Aller à l'entité {name}"
        }
    },
    "properties": {
        "playAudio": {
            "actionButtonLabel": "Jouer de la musique"
        },
        "openWebsite": {
            "actionButtonLabel": "Ouvrir le lien"
        },
        "openFile": {
            "actionButtonLabel": "Ouvrir le fichier"
        }
    }
};

export default mapEditor;
