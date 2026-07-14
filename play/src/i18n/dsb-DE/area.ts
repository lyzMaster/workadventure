import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const area: DeepPartial<Translation["area"]> = {
    "noAccess": "Wódaj, njamatej pśistup k toś tomu wobcerjeju.",
    "blocked": {
        "locked": "Toś to wobcerje jo zawěšćone. Njamóžośo woglědaś.",
        "maxUsers": "Toś to wobcerje jo połne. Njamóžośo woglědaś.",
        "noAccess": "Wódaj, njamatej pśistup k toś tomu wobcerjeju.",
        "unlockWithTrigger": "{trigger} aby toś to wobcerje wótcyniś."
    }
};

export default area;
