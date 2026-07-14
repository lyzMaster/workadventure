import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const menu: DeepPartial<Translation["menu"]> = {
    "shortcuts": {
        "moveUp": "Mover arriba",
        "moveDown": "Mover abajo",
        "moveLeft": "Mover a la izquierda",
        "moveRight": "Mover a la derecha",
        "speedUp": "Correr",
        "interact": "Interactuar",
        "follow": "Seguir"
    }
};

export default menu;
