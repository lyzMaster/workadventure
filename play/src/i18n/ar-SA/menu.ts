import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const menu: DeepPartial<Translation["menu"]> = {
    "shortcuts": {
        "moveUp": "تحرك للأعلى",
        "moveDown": "تحرك للأسفل",
        "moveLeft": "تحرك لليسار",
        "moveRight": "تحرك لليمين",
        "speedUp": "الركض",
        "interact": "تفاعل",
        "follow": "اتبع"
    }
};

export default menu;
