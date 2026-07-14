import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const menu: DeepPartial<Translation["menu"]> = {
    "shortcuts": {
        "moveUp": "向上移动",
        "moveDown": "向下移动",
        "moveLeft": "向左移动",
        "moveRight": "向右移动",
        "speedUp": "跑步",
        "interact": "交互",
        "follow": "跟随"
    }
};

export default menu;
