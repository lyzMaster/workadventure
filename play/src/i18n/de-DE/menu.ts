import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const menu: DeepPartial<Translation["menu"]> = {
    "shortcuts": {
        "moveUp": "Nach oben",
        "moveDown": "Nach unten",
        "moveLeft": "Nach links",
        "moveRight": "Nach rechts",
        "speedUp": "Laufen",
        "interact": "Interagieren",
        "follow": "Folgen"
    }
};

export default menu;
