import type { BaseTranslation } from "../i18n-types";

const area: BaseTranslation["area"] = {
    "noAccess": "Sorry, you don't have access to this area.",
    "blocked": {
        "locked": "This area is locked. You cannot enter.",
        "maxUsers": "This area is full. You cannot enter.",
        "noAccess": "Sorry, you don't have access to this area.",
        "unlockWithTrigger": "{trigger} to unlock this area."
    }
};

export default area;
