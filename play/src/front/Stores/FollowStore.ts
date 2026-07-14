import { derived } from "svelte/store";
import { getColorRgbFromHue } from "../WebRtc/ColorGenerator";
import { gameManager } from "../Phaser/Game/GameManager";
import PopUpFollow from "../Components/PopUp/PopUpFollow.svelte";
import { popupStore } from "./PopupStore";
export { followRoleStore, followStateStore, followUsersStore } from "./FollowStateStore";
import { followRoleStore, followStateStore, followUsersStore } from "./FollowStateStore";

/**
 * This store contains the color of the follow group. It is derived from the ID of the leader.
 */
export const followUsersColorStore = derived(
    [followStateStore, followRoleStore, followUsersStore],
    ([$followStateStore, $followRoleStore, $followUsersStore]) => {
        if ($followStateStore !== "active") {
            return undefined;
        }

        if ($followUsersStore.length === 0) {
            return undefined;
        }

        let leaderId: number;
        if ($followRoleStore === "leader") {
            // Let's get my ID by a quite complicated way....
            leaderId = gameManager.getCurrentGameScene().connection?.getUserId() ?? 0;
        } else {
            leaderId = $followUsersStore[0];
        }

        // Let's compute a random hue between 0 and 1 that varies enough to be interesting
        const hue = ((leaderId * 197) % 255) / 255;

        let { r, g, b } = getColorRgbFromHue(hue);
        if ($followRoleStore === "follower") {
            // Let's make the followers very slightly darker
            r *= 0.9;
            g *= 0.9;
            b *= 0.9;
        }
        return (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
    },
);

export const suscriptionFollowStore = followStateStore.subscribe((followState) => {
    if (followState === "requesting" || followState === "active") {
        popupStore.addPopup(PopUpFollow, {}, "popupFollow");
    } else {
        popupStore.removePopup("popupFollow");
    }
});
