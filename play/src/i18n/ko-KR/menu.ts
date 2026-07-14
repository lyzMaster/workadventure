import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const menu: DeepPartial<Translation["menu"]> = {
    "shortcuts": {
        "moveUp": "위로 이동",
        "moveDown": "아래로 이동",
        "moveLeft": "왼쪽으로 이동",
        "moveRight": "오른쪽으로 이동",
        "speedUp": "달리기",
        "interact": "상호작용",
        "follow": "따라가기"
    }
};

export default menu;
