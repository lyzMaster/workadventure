import type { CharacterPosition } from "@workadventure/game-model";
import type { PlayerInterface } from "./PlayerInterface";

export interface AddPlayerInterface extends PlayerInterface {
    position: CharacterPosition;
}
