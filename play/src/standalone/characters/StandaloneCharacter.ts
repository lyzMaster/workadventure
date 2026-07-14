import * as Phaser from "phaser";
import {
    CharacterSayType,
    Direction,
    type CharacterId,
    type CharacterMotionState,
    type CharacterMoveResult,
    type CharacterMovementConfig,
    type CharacterSnapshot,
    type Direction as DirectionType,
} from "@workadventure/game-model";
import { TexturesHelper } from "../../front/Phaser/Helpers/TexturesHelper";
import {
    DEFAULT_CHARACTER_BODY_METRICS,
    type CharacterBodyMetrics,
} from "./CharacterBodyMetrics";
import {
    CharacterAnimationType,
    directionToAnimationKey,
    getStandaloneCharacterAnimations,
} from "./CharacterAnimation";
import type { CharacterRuntimeHost } from "./CharacterRuntimeHost";
import { CharacterBubblePresentation } from "./CharacterPresentation";
import { characterMovedEventName, type CharacterMovedEvent } from "./CharacterEvents";

import Body = Phaser.Physics.Arcade.Body;
import Sprite = Phaser.GameObjects.Sprite;

type CancelableTexturePromise = PromiseLike<string[]> & { cancel?: () => void };

type PathFollowResolver = (result: CharacterMoveResult) => void;

export interface StandaloneCharacterOptions {
    id: CharacterId;
    name: string;
    x: number;
    y: number;
    direction: DirectionType;
    texturesPromise: CancelableTexturePromise;
    movementConfig: CharacterMovementConfig;
    bodyMetrics?: CharacterBodyMetrics;
}

export class StandaloneCharacter extends Phaser.GameObjects.Container {
    public readonly id: CharacterId;
    public readonly playerName: string;
    public readonly movementConfig: CharacterMovementConfig;
    public readonly bodyMetrics: CharacterBodyMetrics;
    public sprites = new Map<string, Sprite>();

    protected lastDirectionValue: DirectionType;
    protected motionState: CharacterMotionState = "idle";
    protected pathToFollow: { x: number; y: number }[] | undefined;
    protected pathWalkingSpeed: number | undefined;

    private readonly bubblePresentation: CharacterBubblePresentation;
    private readonly syncDisplayPositionWithPhysics = (): void => {
        this.setDepthIfNeeded(this.y + 16);
        this.nameDisplay?.setPosition(this.x, this.y);
    };
    private readonly nameDisplay;
    private texturePromise: CancelableTexturePromise | undefined;
    private destroyed = false;
    private invisible = true;
    private currentPathSegmentDistanceFromStart = 0;
    private pathFollowingResolve: PathFollowResolver | undefined;
    private lastRenderedSprite: string | undefined;

    public constructor(protected readonly host: CharacterRuntimeHost, options: StandaloneCharacterOptions) {
        super(host.phaserScene, options.x, options.y);
        this.id = options.id;
        this.playerName = options.name;
        this.lastDirectionValue = options.direction;
        this.movementConfig = options.movementConfig;
        this.bodyMetrics = options.bodyMetrics ?? DEFAULT_CHARACTER_BODY_METRICS;
        this.bubblePresentation = new CharacterBubblePresentation(host.phaserScene, this);
        this.nameDisplay = host.usernameLayer.createName(options.name, options.x, options.y);

        host.phaserScene.add.existing(this);
        host.phaserScene.physics.world.enableBody(this);
        const body = this.getBody();
        body.setImmovable(true);
        body.setCollideWorldBounds(true);
        this.setSize(this.bodyMetrics.width, this.bodyMetrics.height);
        body.setSize(this.bodyMetrics.width, this.bodyMetrics.height);
        body.setOffset(this.bodyMetrics.offsetX, this.bodyMetrics.offsetY);
        host.phaserScene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.syncDisplayPositionWithPhysics);
        this.setDepthIfNeeded(this.y + 16);

        this.texturePromise = options.texturesPromise;
        void Promise.resolve(options.texturesPromise)
            .then((textures) => {
                if (this.destroyed) {
                    return;
                }
                this.addTextures(textures);
                this.invisible = false;
                this.playAnimation(this.lastDirectionValue, false);
            })
            .finally(() => {
                this.texturePromise = undefined;
            });
    }

    public get lastDirection(): DirectionType {
        return this.lastDirectionValue;
    }

    public getPosition(): { x: number; y: number } {
        return { x: this.x, y: this.y };
    }

    public getBody(): Body {
        const body = this.body;
        if (!(body instanceof Body)) {
            throw new Error("Standalone character does not have an arcade body");
        }
        return body;
    }

    public setPosition(x: number, y: number): this {
        super.setPosition(Math.round(x), Math.round(y));
        this.setDepthIfNeeded(this.y + 16);
        this.nameDisplay?.setPosition(this.x, this.y);
        return this;
    }

    public stop(): void {
        this.getBody().setVelocity(0, 0);
        this.motionState = "idle";
        this.playAnimation(this.lastDirectionValue, false);
    }

    public cancelMove(): void {
        this.finishFollowingPath("cancelled", "Path following was cancelled");
    }

    public setPathToFollow(path: { x: number; y: number }[], speed?: number): Promise<CharacterMoveResult> {
        const previousResolve = this.pathFollowingResolve;
        previousResolve?.({
            ok: false,
            code: "cancelled",
            message: "Path was superseded by a newer character move request",
        });

        this.pathToFollow = this.adjustPathToColliderBounds(path);
        this.pathToFollow.unshift({ x: this.x, y: this.y });
        this.pathWalkingSpeed = speed;
        this.currentPathSegmentDistanceFromStart = 0;
        this.motionState = "walking";

        return new Promise((resolve) => {
            this.pathFollowingResolve = resolve;
        });
    }

    public updatePath(delta: number): void {
        this.followPath(delta);
    }

    public say(text: string, type: CharacterSayType = CharacterSayType.SpeechBubble): void {
        this.motionState = type === CharacterSayType.ThinkingCloud ? "thinking" : "speaking";
        this.bubblePresentation.say(text, type);
        this.host.markDirty();
    }

    public clearBubble(): void {
        this.bubblePresentation.clear();
        this.motionState = this.pathToFollow ? "walking" : "idle";
        this.host.markDirty();
    }

    public async getSnapshotImage(): Promise<string> {
        if (this.lastRenderedSprite) {
            return this.lastRenderedSprite;
        }
        const sprites = Array.from(this.sprites.values()).map((sprite) => ({ sprite, frame: 1 }));
        this.lastRenderedSprite = await TexturesHelper.getSnapshot(this.host.phaserScene, ...sprites);
        return this.lastRenderedSprite;
    }

    public getSnapshot(): CharacterSnapshot {
        return {
            id: this.id,
            name: this.playerName,
            sceneId: this.host.sceneId,
            position: {
                x: this.x,
                y: this.y,
                direction: this.lastDirectionValue,
                moving: this.motionState === "walking",
            },
            motionState: this.motionState,
        };
    }

    public destroy(fromScene?: boolean): void {
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;
        this.finishFollowingPath("destroyed", "Character was destroyed");
        this.bubblePresentation.destroy();
        this.nameDisplay?.destroy();
        this.host.phaserScene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.syncDisplayPositionWithPhysics);
        for (const sprite of this.sprites.values()) {
            this.host.phaserScene.sys.updateList.remove(sprite);
        }
        this.texturePromise?.cancel?.();
        super.destroy(fromScene);
    }

    protected moveToPathPosition(x: number, y: number): void {
        const oldX = this.x;
        const oldY = this.y;
        this.setPosition(x, y);

        if (Math.abs(x - oldX) > Math.abs((y - oldY) * 1.5)) {
            this.lastDirectionValue = x < oldX ? Direction.LEFT : Direction.RIGHT;
        } else if (y !== oldY) {
            this.lastDirectionValue = y < oldY ? Direction.UP : Direction.DOWN;
        }

        this.playAnimation(this.lastDirectionValue, true);
        this.emitMoved(true);
    }

    protected emitMoved(moving: boolean): void {
        const event: CharacterMovedEvent = {
            moving,
            direction: this.lastDirectionValue,
            x: this.x,
            y: this.y,
        };
        this.emit(characterMovedEventName, event);
    }

    private addTextures(textures: string[]): void {
        if (textures.length < 1) {
            throw new Error("No standalone character texture provided");
        }
        for (const texture of textures) {
            if (!this.host.phaserScene.textures.exists(texture)) {
                throw new Error(`Standalone character texture "${texture}" not found`);
            }
            const sprite = new Sprite(this.host.phaserScene, 0, 0, texture, 1);
            this.add(sprite);
            getStandaloneCharacterAnimations(texture).forEach((animation) => {
                if (!this.host.phaserScene.anims.exists(animation.key)) {
                    this.host.phaserScene.anims.create({
                        key: animation.key,
                        frames: this.host.phaserScene.anims.generateFrameNumbers(animation.frameModel, {
                            frames: animation.frames,
                        }),
                        frameRate: animation.frameRate,
                        repeat: animation.repeat,
                    });
                }
            });
            this.host.phaserScene.sys.updateList.add(sprite);
            this.sprites.set(texture, sprite);
        }
    }

    protected playAnimation(direction: DirectionType, moving: boolean): void {
        if (this.invisible) {
            return;
        }
        const directionKey = directionToAnimationKey(direction);
        for (const [texture, sprite] of this.sprites.entries()) {
            const type = moving ? CharacterAnimationType.Walk : CharacterAnimationType.Idle;
            sprite.anims.play(`${texture}-${directionKey}-${type}`, true);
        }
    }

    private adjustPathToColliderBounds(path: { x: number; y: number }[]): { x: number; y: number }[] {
        const body = this.getBody();
        return path.map((step) => ({
            x: step.x,
            y: step.y - body.height / 2 - body.offset.y,
        }));
    }

    private followPath(delta: number): void {
        if (this.pathToFollow !== undefined && this.pathToFollow.length === 1) {
            this.finishFollowingPath();
            return;
        }
        if (!this.pathToFollow) {
            return;
        }

        let segmentStartPos = this.pathToFollow[0];
        let segmentEndPos = this.pathToFollow[1];
        let xDistance = segmentEndPos.x - segmentStartPos.x;
        let yDistance = segmentEndPos.y - segmentStartPos.y;
        let pathSegmentLength = Math.sqrt(xDistance * xDistance + yDistance * yDistance);

        this.currentPathSegmentDistanceFromStart += (this.getPathWalkingSpeed() * delta * 20) / 1000;

        while (this.currentPathSegmentDistanceFromStart >= pathSegmentLength) {
            this.currentPathSegmentDistanceFromStart -= pathSegmentLength;
            this.pathToFollow.shift();

            if (this.pathToFollow.length === 1) {
                this.setPosition(this.pathToFollow[0].x, this.pathToFollow[0].y);
                this.finishFollowingPath();
                return;
            }

            segmentStartPos = this.pathToFollow[0];
            segmentEndPos = this.pathToFollow[1];
            xDistance = segmentEndPos.x - segmentStartPos.x;
            yDistance = segmentEndPos.y - segmentStartPos.y;
            pathSegmentLength = Math.sqrt(xDistance * xDistance + yDistance * yDistance);
        }

        const newX =
            segmentStartPos.x +
            (this.currentPathSegmentDistanceFromStart / pathSegmentLength) * (segmentEndPos.x - segmentStartPos.x);
        const newY =
            segmentStartPos.y +
            (this.currentPathSegmentDistanceFromStart / pathSegmentLength) * (segmentEndPos.y - segmentStartPos.y);

        this.moveToPathPosition(newX, newY);
        this.host.markDirty();
    }

    private finishFollowingPath(code?: "cancelled" | "destroyed", message?: string): void {
        const wasFollowing = this.pathToFollow !== undefined || this.pathFollowingResolve !== undefined;
        this.pathToFollow = undefined;
        this.pathWalkingSpeed = undefined;
        this.currentPathSegmentDistanceFromStart = 0;
        this.stop();

        const resolve = this.pathFollowingResolve;
        this.pathFollowingResolve = undefined;
        if (!resolve) {
            return;
        }
        if (code) {
            resolve({ ok: false, code, message: message ?? "Character move did not complete" });
            return;
        }
        resolve({ ok: true, character: this.getSnapshot() });
        if (wasFollowing) {
            this.emitMoved(false);
        }
    }

    private getPathWalkingSpeed(): number {
        return this.pathWalkingSpeed ?? this.movementConfig.walkingSpeed;
    }

    private setDepthIfNeeded(depth: number): void {
        if (this.depth !== depth) {
            this.setDepth(depth);
            this.nameDisplay?.setDepth(depth);
        }
    }
}
