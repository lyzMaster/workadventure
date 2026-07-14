import { writable } from "svelte/store";

export type FollowState = "off" | "requesting" | "active" | "ending";
export type FollowRole = "leader" | "follower";

export const followStateStore = writable<FollowState>("off");
export const followRoleStore = writable<FollowRole>("leader");

function createFollowUsersStore() {
    const { subscribe, update, set } = writable<number[]>([]);

    return {
        subscribe,
        addFollowRequest(leader: number): void {
            followStateStore.set("requesting");
            followRoleStore.set("follower");
            set([leader]);
        },
        addFollower(user: number): void {
            followStateStore.set("active");
            followRoleStore.set("leader");
            update((followers) => {
                followers.push(user);
                return followers;
            });
        },
        removeFollower(user: number): void {
            update((followers) => {
                followers = followers.filter((id) => id !== user);

                if (followers.length === 0) {
                    followStateStore.set("off");
                    followRoleStore.set("leader");
                }

                return followers;
            });
        },
        stopFollowing(): void {
            set([]);
            followStateStore.set("off");
            followRoleStore.set("leader");
        },
    };
}

export const followUsersStore = createFollowUsersStore();
