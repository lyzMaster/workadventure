import { writable } from "svelte/store";
import type { SpaceInterface } from "../Space/SpaceInterface";

export const DEFAULT_PROXIMITY_SPACE_NAME = "proximity";

export type ProximityChatRoomKind = "default" | "proximity" | "meeting" | "listener" | "speaker" | "area";

type StandaloneSpace = {
    startStreaming(): void;
    stopStreaming(): void;
    startListenerStreaming(): void;
};

export class ProximityChatRoom {
    public readonly id: string;
    public readonly name = writable("");
    public readonly type = writable<"direct" | "multiple">("multiple");
    public readonly isJoined = writable(false);
    public readonly currentMeetingParticipantsStore = writable([]);
    public readonly kind = writable<ProximityChatRoomKind>("default");
    public readonly unreadMessagesCount = writable(0);
    public readonly unreadNotificationCount = writable(0);
    public readonly hasUnreadMessages = writable(false);
    private readonly space: StandaloneSpace = {
        startStreaming() {},
        stopStreaming() {},
        startListenerStreaming() {},
    };

    public constructor(spaceName: string, ..._unused: unknown[]) {
        this.id = spaceName;
    }

    public destroy(): void {}

    public dispatchSound(_soundUrl: string | URL): Promise<void> {
        return Promise.resolve();
    }

    public startScriptingAudioStream(_sampleRate: number): Promise<void> {
        return Promise.resolve();
    }

    public appendScriptingAudioData(_data: unknown): Promise<void> {
        return Promise.resolve();
    }

    public resetScriptingAudioBuffer(): Promise<void> {
        return Promise.resolve();
    }

    public stopScriptingAudioStream(): void {}

    public startListeningToScriptingAudioStream(..._unused: unknown[]): Promise<void> {
        return Promise.resolve();
    }

    public stopListeningToScriptingAudioStream(): void {}

    public addExternalMessage(..._unused: unknown[]): void {}

    public addExternalTypingUser(..._unused: unknown[]): void {}

    public removeExternalTypingUser(..._unused: unknown[]): void {}

    public startTyping(): Promise<object> {
        return Promise.resolve({});
    }

    public stopTyping(): Promise<object> {
        return Promise.resolve({});
    }

    public leaveRoom(): Promise<void> {
        return Promise.resolve();
    }

    public setTimelineAsRead(): void {}

    public getCurrentSpace(): SpaceInterface {
        return this.space as SpaceInterface;
    }
}

export class ProximityChatRoomManager {
    private readonly defaultRoom = new ProximityChatRoom(DEFAULT_PROXIMITY_SPACE_NAME);
    public readonly roomsStore = writable<ProximityChatRoom[]>([this.defaultRoom]);

    public constructor(
        private readonly factory: (
            spaceName: string,
            displayName: string,
            kind: ProximityChatRoomKind,
        ) => ProximityChatRoom = (spaceName) => new ProximityChatRoom(spaceName),
    ) {}

    public destroy(): void {
        this.defaultRoom.destroy();
    }

    public getOrCreateRoom(spaceName: string, displayName = spaceName, kind: ProximityChatRoomKind = "default") {
        if (spaceName === DEFAULT_PROXIMITY_SPACE_NAME) {
            return this.defaultRoom;
        }
        return this.factory(spaceName, displayName, kind);
    }

    public getDefaultRoom(): ProximityChatRoom {
        return this.defaultRoom;
    }

    public getRoomByMeetingId(meetingId: string): ProximityChatRoom | undefined {
        return meetingId ? new ProximityChatRoom(meetingId) : undefined;
    }

    public getRoomById(roomId: string): never {
        return (roomId === DEFAULT_PROXIMITY_SPACE_NAME ? this.defaultRoom : new ProximityChatRoom(roomId)) as never;
    }

    public joinSpace(..._unused: unknown[]): Promise<ProximityChatRoom> {
        return Promise.resolve(this.defaultRoom);
    }

    public leaveSpace(..._unused: unknown[]): Promise<void> {
        return Promise.resolve();
    }

    public joinDefaultSpace(..._unused: unknown[]): Promise<void> {
        return Promise.resolve();
    }

    public leaveDefaultSpace(..._unused: unknown[]): Promise<void> {
        return Promise.resolve();
    }

    public resolveTargetRoom(..._unused: unknown[]): ProximityChatRoom {
        return this.defaultRoom;
    }
}

export class ProximitySpaceManager {
    public constructor(..._unused: unknown[]) {}

    public destroy(): void {}
}
