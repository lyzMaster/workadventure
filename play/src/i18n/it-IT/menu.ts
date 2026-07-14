import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const menu: DeepPartial<Translation["menu"]> = {
    "shortcuts": {
        "moveUp": "Sposta su",
        "moveDown": "Sposta giù",
        "moveLeft": "Sposta a sinistra",
        "moveRight": "Sposta a destra",
        "speedUp": "Corri",
        "interact": "Interagisci",
        "follow": "Segui"
    }
};

export default menu;
