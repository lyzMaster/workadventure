import { derived, writable } from "svelte/store";
import { menuInputFocusStore } from "./MenuInputFocusStore";
import { showReportScreenStore, userReportEmpty } from "./ShowReportScreenStore";
import { refreshPromptStore } from "./RefreshPromptStore";
import { mapDeletedPromptStore } from "./MapDeletedPromptStore";

export const inputFormFocusStore = writable(false);

export const mapExplorerSearchinputFocusStore = writable(false);

export const baseEnableUserInputsStore = derived(
    [
        menuInputFocusStore,
        showReportScreenStore,
        inputFormFocusStore,
        mapExplorerSearchinputFocusStore,
        refreshPromptStore,
        mapDeletedPromptStore,
    ],
    ([
        $menuInputFocusStore,
        $showReportScreenStore,
        $inputFormFocusStore,
        $mapExplorerSearchinputFocusStore,
        $refreshPromptStore,
        $mapDeletedPromptStore,
    ]) => {
        return (
            !$menuInputFocusStore &&
            !($showReportScreenStore !== userReportEmpty) &&
            !$inputFormFocusStore &&
            !$mapExplorerSearchinputFocusStore &&
            !$refreshPromptStore &&
            !$mapDeletedPromptStore
        );
    },
);
