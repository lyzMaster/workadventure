import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const area: DeepPartial<Translation["area"]> = {
    "noAccess": "Wodaj, nimaće přistup k tutej wokrjesu.",
    "blocked": {
        "locked": "Tutón wokrjes je zawrjeny. Njemóžeće woteńć.",
        "maxUsers": "Tutón wokrjes je połny. Njemóžeće woteńć.",
        "noAccess": "Wodaj, nimaće přistup k tutej wokrjesu.",
        "unlockWithTrigger": "{trigger} zo byš tutón wokrjes wotewrił."
    }
};

export default area;
