import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const menu: DeepPartial<Translation["menu"]> = {
    "shortcuts": {
        "moveUp": "Aller en haut",
        "moveDown": "Aller en bas",
        "moveLeft": "Aller à gauche",
        "moveRight": "Aller à droite",
        "speedUp": "Courir",
        "interact": "Interagir",
        "follow": "Suivre"
    }
};

export default menu;
