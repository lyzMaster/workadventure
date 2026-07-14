import {
    Direction,
    rotateDirectionClockwise,
    type CharacterMoveResult,
    type Direction as DirectionType,
} from "@workadventure/game-model";
import type { ActiveEventList } from "../../front/Phaser/UserInput/UserInputManager";
import type { CharacterPathfinder } from "../pathfinding/CharacterPathfinder";
import {
    activeEventsToManualMovementInput,
    computeManualMovementStep,
    hasManualMovementInput,
} from "./CharacterMotionController";
import type { CharacterRuntimeHost } from "./CharacterRuntimeHost";
import { characterMovedEventName, characterStartMovingEventName } from "./CharacterEvents";
import { StandaloneCharacter, type StandaloneCharacterOptions } from "./StandaloneCharacter";

export type LocalPlayerOptions = StandaloneCharacterOptions;

export class LocalPlayer extends StandaloneCharacter {
    private isMoving = false;

    public constructor(
        host: CharacterRuntimeHost,
        options: LocalPlayerOptions,
        private readonly pathfinder: CharacterPathfinder,
    ) {
        super(host, options);
        this.getBody().setImmovable(false);
        document.addEventListener("visibilitychange", this.handleVisibilityChange);
    }

    public moveUser(delta: number, activeUserInputEvents: ActiveEventList): void {
        const input = activeEventsToManualMovementInput(activeUserInputEvents);
        if (this.pathToFollow && hasManualMovementInput(input)) {
            this.cancelMove();
            this.pathfinder.cancelCharacter(this.id);
        }
        if (this.pathToFollow) {
            this.updatePath(delta);
            return;
        }

        const step = computeManualMovementStep(input, this.lastDirection, this.movementConfig);
        if (step.moving) {
            if (!this.isMoving) {
                this.isMoving = true;
                this.emit(characterStartMovingEventName, {
                    direction: step.direction,
                    x: this.x,
                    y: this.y,
                });
            }
            this.getBody().setVelocity(step.velocityX, step.velocityY);
            this.lastDirectionValue = step.direction;
            this.playManualAnimation(true);
            this.emit(characterMovedEventName, {
                moving: true,
                direction: this.lastDirectionValue,
                x: this.x,
                y: this.y,
            });
            return;
        }

        if (this.isMoving) {
            this.isMoving = false;
            this.stop();
            this.emit(characterMovedEventName, {
                moving: false,
                direction: this.lastDirectionValue,
                x: this.x,
                y: this.y,
            });
        }
    }

    public async moveToPosition(
        position: { x: number; y: number },
        tryFindingNearestAvailable = false,
    ): Promise<CharacterMoveResult> {
        const pathResult = await this.pathfinder.findPathForCharacter(this.id, this.getPosition(), position, {
            tryFindingNearestAvailable,
        });
        if (!pathResult.ok) {
            return pathResult;
        }
        this.getBody().setDirectControl(true);
        return this.setPathToFollow(pathResult.path).finally(() => {
            this.getBody().setDirectControl(false);
            this.isMoving = false;
        });
    }

    public rotate(): void {
        const direction = rotateDirectionClockwise(this.lastDirectionValue);
        this.lastDirectionValue = direction;
        this.stop();
        this.emit(characterMovedEventName, {
            moving: false,
            direction,
            x: this.x,
            y: this.y,
        });
        this.host.markDirty();
    }

    public teleportTo(x: number, y: number, direction: DirectionType = this.lastDirectionValue): void {
        this.pathfinder.cancelCharacter(this.id);
        this.cancelMove();
        this.lastDirectionValue = direction;
        this.setPosition(x, y);
        this.stop();
        this.emit(characterMovedEventName, {
            moving: false,
            direction,
            x: this.x,
            y: this.y,
        });
        this.host.markDirty();
    }

    public destroy(fromScene?: boolean): void {
        document.removeEventListener("visibilitychange", this.handleVisibilityChange);
        this.pathfinder.cancelCharacter(this.id);
        super.destroy(fromScene);
    }

    private readonly handleVisibilityChange = (): void => {
        if (!document.hidden) {
            return;
        }
        this.pathfinder.cancelCharacter(this.id);
        this.cancelMove();
        this.stop();
    };

    private playManualAnimation(moving: boolean): void {
        if (!moving) {
            this.stop();
            return;
        }
        this.motionState = "walking";
        this.playAnimation(this.lastDirectionValue, true);
    }
}

export const DEFAULT_LOCAL_PLAYER_MOVEMENT = {
    walkingSpeed: 9,
    runningMultiplier: 2.5,
} as const;

export const DEFAULT_LOCAL_PLAYER_DIRECTION = Direction.DOWN;
