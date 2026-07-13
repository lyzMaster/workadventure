import { writable } from "svelte/store";
import type { ChatRoom } from "../Chat/Connection/ChatConnection";

export const selectedRoomStore = writable<ChatRoom | undefined>(undefined);
