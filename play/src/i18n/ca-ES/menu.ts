import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const menu: DeepPartial<Translation["menu"]> = {
    "shortcuts": {
        "moveUp": "Moure amunt",
        "moveDown": "Moure avall",
        "moveLeft": "Moure a l'esquerra",
        "moveRight": "Moure a la dreta",
        "speedUp": "Córrer",
        "interact": "Interactuar",
        "follow": "Seguir"
    }
};

export default menu;
