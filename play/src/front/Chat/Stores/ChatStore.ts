export { navChat } from "../../Stores/NavChatStore";

export function initializeChatVisibilitySubscription(): () => void {
    return () => {};
}

export const isAChatRoomIsVisible = () => false;
export const shouldRestoreChatStateStore = { subscribe: () => () => {} };
export const isChatIdSentToPusher = { subscribe: () => () => {} };
