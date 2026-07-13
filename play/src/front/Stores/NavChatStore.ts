import { writable } from "svelte/store";
import type { WorkAdventureComponent, WorkAdventureComponentProps } from "../../types/component";

type NavChatTab =
    | {
          key: "chat";
      }
    | {
          key: "users";
      }
    | {
          key: "externalModule";
          component: WorkAdventureComponent;
          props?: WorkAdventureComponentProps;
      };

function createNavChatStore() {
    const { subscribe, set } = writable<NavChatTab>({ key: "users" });

    return {
        subscribe,
        switchToChat() {
            set({ key: "chat" });
        },
        switchToUserList() {
            set({ key: "users" });
        },
        switchToCustomComponent(component: WorkAdventureComponent, props?: WorkAdventureComponentProps) {
            set({ key: "externalModule", component, props });
        },
    };
}

export const navChat = createNavChatStore();
