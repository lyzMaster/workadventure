import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const area: DeepPartial<Translation["area"]> = {
    "noAccess": "Entschuldigung, Sie haben keinen Zugang zu diesem Bereich.",
    "blocked": {
        "locked": "Dieser Bereich ist gesperrt. Sie können nicht eintreten.",
        "maxUsers": "Dieser Bereich ist voll. Sie können nicht eintreten.",
        "noAccess": "Entschuldigung, Sie haben keinen Zugang zu diesem Bereich.",
        "unlockWithTrigger": "{trigger} um diesen Bereich zu entsperren."
    }
};

export default area;
