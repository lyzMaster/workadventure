import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const area: DeepPartial<Translation["area"]> = {
    "noAccess": "Désolé, vous n'avez pas accès à cette zone.",
    "blocked": {
        "locked": "Cette zone est verrouillée. Vous ne pouvez pas entrer.",
        "maxUsers": "Cette zone est pleine. Vous ne pouvez pas entrer.",
        "noAccess": "Désolé, vous n'avez pas accès à cette zone.",
        "unlockWithTrigger": "{trigger} pour déverrouiller cette zone."
    }
};

export default area;
