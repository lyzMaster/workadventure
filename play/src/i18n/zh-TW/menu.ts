import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const menu: DeepPartial<Translation["menu"]> = {
    "shortcuts": {
        "moveUp": "向上移動",
        "moveDown": "向下移動",
        "moveLeft": "向左移動",
        "moveRight": "向右移動",
        "speedUp": "跑步",
        "interact": "互動",
        "follow": "跟隨"
    }
};

export default menu;
