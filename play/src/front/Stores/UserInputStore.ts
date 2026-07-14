import { derived } from "svelte/store";
import { emoteMenuStore } from "./EmoteStore";
import {
    baseEnableUserInputsStore,
    inputFormFocusStore,
    mapExplorerSearchinputFocusStore,
} from "./UserInputBaseStore";

export { inputFormFocusStore, mapExplorerSearchinputFocusStore };

//derived from the focus on Menu, ConsoleGlobal, Chat and ...
export const enableUserInputsStore = derived(
    [baseEnableUserInputsStore, emoteMenuStore],
    ([$baseEnableUserInputsStore, $emoteMenuStore]) => $baseEnableUserInputsStore && !$emoteMenuStore,
);
