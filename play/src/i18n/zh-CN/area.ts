import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const area: DeepPartial<Translation["area"]> = {
    "noAccess": "抱歉，您无权访问此区域。",
    "blocked": {
        "locked": "此区域已锁定。您无法进入。",
        "maxUsers": "此区域已满。您无法进入。",
        "noAccess": "抱歉，您无权访问此区域。",
        "unlockWithTrigger": "{trigger}以解锁该区域。"
    }
};

export default area;
