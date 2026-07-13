import { readable, writable, type Readable } from "svelte/store";
import { MapStore } from "@workadventure/store-utils";
import type { AvailabilityStatus } from "@workadventure/messages";

export type ChatUser = {
    chatId: string;
    uuid?: string;
    availabilityStatus: Readable<AvailabilityStatus>;
    username: string | undefined;
    pictureStore: unknown;
    roomName: string | undefined;
    playUri: string | undefined;
    isAdmin?: boolean;
    isMember?: boolean;
    visitCardUrl?: string;
    color: string | undefined;
    spaceUserId: string | undefined;
};

export type AdminUser = ChatUser & { uuid: string };
export type AnyKindOfUser = ChatUser | AdminUser;
export type ChatRoom = {
    id: string;
    name: Readable<string>;
    type: Readable<"direct" | "multiple">;
    isEncrypted?: Readable<boolean>;
    myMembership?: Readable<string>;
    leaveRoom: () => Promise<void>;
    setTimelineAsRead: () => void;
};
export type ChatConversation = ChatRoom;
export type RoomFolder = { id: string };
export type ConnectionStatus = "OFFLINE" | "ONLINE";
export type CreateRoomOptions = Record<string, unknown>;
export type ChatRoomMembershipManagement = Record<string, unknown>;
export type ChatRoomModeration = Record<string, unknown>;
export type ChatRoomNotificationControl = Record<string, unknown>;
export type ChatMessage = Record<string, unknown>;

export interface ChatConnectionInterface {
    directRoomsUsers: Readable<ChatUser[]>;
    connectionStatus: Readable<ConnectionStatus>;
    directRooms: Readable<ChatRoom[]>;
    rooms: Readable<ChatRoom[]>;
    invitations: Readable<ChatRoom[]>;
    roomFolders: MapStore<string, RoomFolder>;
    roomCreationInProgress: Readable<boolean>;
    isEncryptionRequiredAndNotSet: Readable<boolean>;
    isGuest: Readable<boolean>;
    hasUnreadMessages: Readable<boolean>;
    folders: Readable<RoomFolder[]>;
    shouldRetrySendingEvents: Readable<boolean>;
    nbUnreadRoomsMessages: Readable<number>;
    nbUnreadDirectRoomsMessages: Readable<number>;
    nbUnreadInvitationsMessages: Readable<number>;
    retrySendingEvents(): Promise<void>;
    createRoom(roomOptions: CreateRoomOptions): Promise<{ room_id: string }>;
    createFolder(roomOptions: CreateRoomOptions): Promise<{ room_id: string }>;
    createDirectRoom(userChatId: string): Promise<ChatRoom | undefined>;
    getDirectRoomFor(userChatId: string): ChatRoom | undefined;
    searchAccessibleRooms(searchText: string): Promise<{ id: string; name: string | undefined }[]>;
    joinRoom(roomId: string): Promise<ChatRoom | undefined>;
    getRoomByID(roomId: string): ChatRoom;
    searchChatUsers(searchText: string): Promise<{ id: string; name: string | undefined }[] | undefined>;
    initEndToEndEncryption(): Promise<void>;
    isUserExist(userId: string): Promise<boolean>;
    destroy(): Promise<void>;
    clearListener(): void;
}

export class VoidChatConnection implements ChatConnectionInterface {
    directRoomsUsers = readable<ChatUser[]>([]);
    connectionStatus = writable<ConnectionStatus>("OFFLINE");
    directRooms = writable<ChatRoom[]>([]);
    rooms = writable<ChatRoom[]>([]);
    invitations = writable<ChatRoom[]>([]);
    roomFolders = new MapStore<string, RoomFolder>();
    roomCreationInProgress = writable(false);
    isEncryptionRequiredAndNotSet = writable(false);
    isGuest = writable(false);
    hasUnreadMessages = writable(false);
    folders = writable<RoomFolder[]>([]);
    shouldRetrySendingEvents = writable(false);
    nbUnreadRoomsMessages = writable(0);
    nbUnreadDirectRoomsMessages = writable(0);
    nbUnreadInvitationsMessages = writable(0);
    retrySendingEvents = () => Promise.resolve();
    createRoom = () => Promise.resolve({ room_id: "" });
    createFolder = () => Promise.resolve({ room_id: "" });
    createDirectRoom = () => Promise.resolve(undefined);
    getDirectRoomFor = () => undefined;
    searchAccessibleRooms = () => Promise.resolve([]);
    joinRoom = () => Promise.resolve(undefined);
    getRoomByID = (roomId: string) => ({
        id: roomId,
        name: readable(""),
        type: readable<"direct" | "multiple">("multiple"),
        leaveRoom: () => Promise.resolve(),
        setTimelineAsRead: () => {},
    });
    searchChatUsers = () => Promise.resolve(undefined);
    initEndToEndEncryption = () => Promise.resolve();
    isUserExist = () => Promise.resolve(false);
    destroy = () => Promise.resolve();
    clearListener = () => {};
}

export function hasMatrixChatCapabilities(_connection: ChatConnectionInterface): false {
    return false;
}
