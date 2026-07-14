import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const area: DeepPartial<Translation["area"]> = {
    "noAccess": "Sorry, je hebt geen toegang tot dit gebied.",
    "blocked": {
        "locked": "Dit gebied is vergrendeld. Je kunt niet binnenkomen.",
        "maxUsers": "Dit gebied is vol. Je kunt niet binnenkomen.",
        "noAccess": "Sorry, je hebt geen toegang tot dit gebied.",
        "unlockWithTrigger": "{trigger} om dit gebied te ontgrendelen."
    }
};

export default area;
