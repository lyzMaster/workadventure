import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const menu: DeepPartial<Translation["menu"]> = {
    "shortcuts": {
        "moveUp": "horje",
        "moveDown": "dele",
        "moveLeft": "nalěwo",
        "moveRight": "naprawo",
        "speedUp": "běhać",
        "interact": "interagować",
        "follow": "sćěhować"
    }
};

export default menu;
