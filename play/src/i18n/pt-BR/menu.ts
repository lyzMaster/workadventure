import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const menu: DeepPartial<Translation["menu"]> = {
    "shortcuts": {
        "moveUp": "Mover para Cima",
        "moveDown": "Mover para Baixo",
        "moveLeft": "Mover para Esquerda",
        "moveRight": "Mover para Direita",
        "speedUp": "Correr",
        "interact": "Interagir",
        "follow": "Seguir"
    }
};

export default menu;
