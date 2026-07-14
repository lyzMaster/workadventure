import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const area: DeepPartial<Translation["area"]> = {
    "noAccess": "抱歉，您無權存取此區域。",
    "blocked": {
        "locked": "此區域已鎖定。您無法進入。",
        "maxUsers": "此區域已滿。您無法進入。",
        "noAccess": "抱歉，您無權存取此區域。",
        "unlockWithTrigger": "{trigger}以解鎖該區域。"
    }
};

export default area;
