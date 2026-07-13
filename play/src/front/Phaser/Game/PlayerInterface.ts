import type { AvailabilityStatus, CharacterSayType } from "@workadventure/game-model";
import type { CompanionTextureDescriptionInterface } from "../Companion/CompanionTextures";
import type { WokaTextureDescriptionInterface } from "../Entity/PlayerTextures";

export interface PlayerInterface {
    //jid: any;
    userId: number;
    name: string;
    characterTextures: WokaTextureDescriptionInterface[];
    visitCardUrl: string | null;
    companionTexture?: CompanionTextureDescriptionInterface;
    userUuid: string;
    availabilityStatus: AvailabilityStatus;
    color?: string | null;
    outlineColor?: number;
    isLogged?: boolean;
    chatID?: string;
    sayMessage?: { message: string; type: CharacterSayType };
    //chat interface
    //companion: string | null;
    //wokaSrc?: string;
}
