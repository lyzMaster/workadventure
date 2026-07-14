import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const area: DeepPartial<Translation["area"]> = {
    "noAccess": "عذرًا، ليس لديك إذن للوصول إلى هذه المنطقة.",
    "blocked": {
        "locked": "هذه المنطقة مقفلة. لا يمكنك الدخول.",
        "maxUsers": "هذه المنطقة ممتلئة. لا يمكنك الدخول.",
        "noAccess": "عذرًا، ليس لديك إذن للوصول إلى هذه المنطقة.",
        "unlockWithTrigger": "{trigger} لفتح هذه المنطقة."
    }
};

export default area;
