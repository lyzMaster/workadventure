import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const area: DeepPartial<Translation["area"]> = {
    "noAccess": "Spiacente, non hai accesso a quest'area.",
    "blocked": {
        "locked": "Questa area è bloccata. Non puoi entrare.",
        "maxUsers": "Questa area è piena. Non puoi entrare.",
        "noAccess": "Spiacente, non hai accesso a quest'area.",
        "unlockWithTrigger": "{trigger} per sbloccare quest'area."
    }
};

export default area;
