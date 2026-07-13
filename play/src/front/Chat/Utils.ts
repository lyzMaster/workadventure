import {
    closeCoWebsite,
    getCoWebSite,
    openCoWebSite,
    openCoWebSiteWithoutSource,
    type OpenCoWebsiteObject,
} from "../Stores/CoWebsiteUtils";

export { closeCoWebsite, getCoWebSite, openCoWebSite, openCoWebSiteWithoutSource };
export type { OpenCoWebsiteObject };

export const openDirectChatRoom = async (_chatID: string): Promise<void> => {};
export const openChatRoom = async (_roomId: string): Promise<void> => {};
export const sendRedirectPricing = (): void => {};
export const sendLogin = (): void => {};
export const openTab = (url: string): void => {
    window.open(url, "_blank");
};
export function getMatrixClientForChatTint(): undefined {
    return undefined;
}
