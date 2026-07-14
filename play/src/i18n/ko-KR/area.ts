import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const area: DeepPartial<Translation["area"]> = {
    "noAccess": "죄송하지만 이 영역에 접근할 수 없습니다.",
    "blocked": {
        "locked": "이 영역이 잠겨 있습니다. 들어갈 수 없습니다.",
        "maxUsers": "이 영역이 가득 찼습니다. 들어갈 수 없습니다.",
        "noAccess": "죄송하지만 이 영역에 접근할 수 없습니다.",
        "unlockWithTrigger": "{trigger}로 이 영역의 잠금을 해제하세요."
    }
};

export default area;
