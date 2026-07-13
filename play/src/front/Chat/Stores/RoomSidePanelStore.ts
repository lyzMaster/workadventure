import { writable } from "svelte/store";

export type RoomSidePanelSection = "home" | "participants" | "polls" | "settings" | "thread" | "questions";

const store = writable<RoomSidePanelSection | undefined>(undefined);

export const roomSidePanelStore = {
    subscribe: store.subscribe,
    set(_section: RoomSidePanelSection): void {},
    reset(): void {
        store.set(undefined);
    },
    setActiveSection(section: RoomSidePanelSection): void {
        store.set(section);
    },
    focusTimelineEvent(_eventId: string, _section?: string): void {},
};
