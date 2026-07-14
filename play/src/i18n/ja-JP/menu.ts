import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const menu: DeepPartial<Translation["menu"]> = {
    "shortcuts": {
        "moveUp": "上に移動",
        "moveDown": "下に移動",
        "moveLeft": "左に移動",
        "moveRight": "右に移動",
        "speedUp": "走る",
        "interact": "相互作用",
        "follow": "フォロー"
    }
};

export default menu;
