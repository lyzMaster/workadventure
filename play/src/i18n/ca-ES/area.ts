import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const area: DeepPartial<Translation["area"]> = {
    "noAccess": "Ho sentim, no tens accés a aquesta àrea.",
    "blocked": {
        "locked": "Aquesta àrea està bloquejada. No pots entrar.",
        "maxUsers": "Aquesta àrea està plena. No pots entrar.",
        "noAccess": "Ho sentim, no tens accés a aquesta àrea.",
        "unlockWithTrigger": "{trigger} per desbloquejar aquesta àrea."
    }
};

export default area;
