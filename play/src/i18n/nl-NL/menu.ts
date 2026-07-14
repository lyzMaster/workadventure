import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const menu: DeepPartial<Translation["menu"]> = {
    "shortcuts": {
        "moveUp": "Omhoog bewegen",
        "moveDown": "Omlaag bewegen",
        "moveLeft": "Naar links bewegen",
        "moveRight": "Naar rechts bewegen",
        "speedUp": "Rennen",
        "interact": "Interacteren",
        "follow": "Volgen"
    }
};

export default menu;
