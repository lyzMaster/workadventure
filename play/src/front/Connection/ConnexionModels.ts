import type { SignalData } from "@workadventure/simple-peer";
import type { AvailabilityStatus, CharacterPosition, CharacterSayType } from "@workadventure/game-model";
import type { LocalMapEditorCommand } from "@workadventure/map-editor";
import type { WokaTextureDescriptionInterface } from "../Phaser/Entity/PlayerTextures";
import type { CompanionTextureDescriptionInterface } from "../Phaser/Companion/CompanionTextures";
import type { RoomConnection } from "./RoomConnection";

export type ApplicationDefinitionInterface = Record<string, unknown>;
export type RoomConnectedMessage = Record<string, unknown>;

export interface MessageUserMovedInterface {
    userId: number;
    position: CharacterPosition;
}

export interface MessageUserJoined {
    userId: number;
    name: string;
    characterTextures: WokaTextureDescriptionInterface[];
    position: CharacterPosition;
    availabilityStatus: AvailabilityStatus;
    visitCardUrl: string | null;
    companionTexture: CompanionTextureDescriptionInterface | undefined;
    userUuid: string;
    outlineColor: number | undefined;
    variables: Map<string, unknown>;
    chatID?: string;
    sayMessage?: { message: string; type: CharacterSayType };
    activate?: () => void;
}

export interface PositionInterface {
    x: number;
    y: number;
}

export interface GroupCreatedUpdatedMessageInterface {
    position: PositionInterface;
    groupId: number;
    groupSize?: number;
    locked?: boolean;
    userIds: number[];
}

export interface GroupUsersUpdateMessageInterface {
    groupId: number;
    userIds: number[];
}

export interface WebRtcDisconnectMessageInterface {
    userId: number;
}

export interface WebRtcSignalReceivedMessageInterface {
    userId: string;
    signal: SignalData;
}

export interface ViewportInterface {
    left: number;
    top: number;
    right: number;
    bottom: number;
}

export interface ItemEventMessageInterface {
    itemId: number;
    event: string;
    state: unknown;
    parameters: unknown;
}

export interface AreaPropertyVariable {
    areaId: string;
    propertyId: string;
    key: string;
    value: unknown;
}

export interface RoomJoinedMessageInterface {
    items: { [itemId: number]: unknown };
    variables: Map<string, unknown>;
    playerVariables: Map<string, unknown>;
    areaPropertyVariables: AreaPropertyVariable[];
    characterTextures: WokaTextureDescriptionInterface[];
    companionTexture?: CompanionTextureDescriptionInterface;
    commandsToApply?: LocalMapEditorCommand[];
    applications: ApplicationDefinitionInterface[];
}

export interface PlayGlobalMessageInterface {
    type: string;
    content: string;
    broadcastToWorld: boolean;
}

export interface OnConnectInterface {
    connection: RoomConnection;
    roomConnectedMessage: RoomConnectedMessage;
}
