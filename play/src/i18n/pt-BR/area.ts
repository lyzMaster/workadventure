import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const area: DeepPartial<Translation["area"]> = {
    "noAccess": "Desculpe, você não tem acesso a esta área.",
    "blocked": {
        "locked": "Esta área está bloqueada. Você não pode entrar.",
        "maxUsers": "Esta área está cheia. Você não pode entrar.",
        "noAccess": "Desculpe, você não tem acesso a esta área.",
        "unlockWithTrigger": "{trigger} para desbloquear esta área."
    }
};

export default area;
