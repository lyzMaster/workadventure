import {
    CharacterSayType,
    Direction,
    type AgentActionErrorCode,
    type AgentActionResult,
    type AgentCharacterDefinition,
    type AgentCharacterSnapshot,
    type CharacterId,
    type CharacterMovementConfig,
    type CharacterSayType as CharacterSayTypeValue,
    type Direction as DirectionType,
} from "@workadventure/game-model";
import { PathTileType } from "../../front/Utils/PathTileType";
import type { CharacterPathfinder, CharacterPathfindingOptions } from "../pathfinding/CharacterPathfinder";
import type { CollisionGridProvider } from "../pathfinding/CollisionGridProvider";
import { AgentCharacter } from "./AgentCharacter";
import type { AgentCharacterRepository } from "./AgentCharacterRepository";
import type { AgentCharacterTextureLoader } from "./AgentCharacterTextureLoader";
import type { CharacterRuntimeHost } from "./CharacterRuntimeHost";
import { StandaloneCharacterReadyError } from "./StandaloneCharacter";

export interface AgentMoveToOptions extends CharacterPathfindingOptions {
    speed?: number;
}

export interface AgentCharacterControllerOptions {
    host: CharacterRuntimeHost;
    repository: AgentCharacterRepository;
    pathfinder: CharacterPathfinder;
    collisionGridProvider: CollisionGridProvider;
    textureLoader: AgentCharacterTextureLoader;
    createMapCollisionForCharacter(character: AgentCharacter): void;
    createAgentCharacter?: (
        host: CharacterRuntimeHost,
        definition: AgentCharacterDefinition,
        textureKeysPromise: Promise<string[]>,
    ) => AgentCharacter;
}

const DEFAULT_AGENT_MOVEMENT: CharacterMovementConfig = {
    walkingSpeed: 9,
    runningMultiplier: 2.5,
};

export class AgentCharacterController {
    private readonly host: CharacterRuntimeHost;
    private readonly repository: AgentCharacterRepository;
    private readonly pathfinder: CharacterPathfinder;
    private readonly collisionGridProvider: CollisionGridProvider;
    private readonly textureLoader: AgentCharacterTextureLoader;
    private readonly createMapCollisionForCharacter: (character: AgentCharacter) => void;
    private readonly createAgentCharacter: (
        host: CharacterRuntimeHost,
        definition: AgentCharacterDefinition,
        textureKeysPromise: Promise<string[]>,
    ) => AgentCharacter;
    private destroyed = false;

    public constructor(options: AgentCharacterControllerOptions) {
        this.host = options.host;
        this.repository = options.repository;
        this.pathfinder = options.pathfinder;
        this.collisionGridProvider = options.collisionGridProvider;
        this.textureLoader = options.textureLoader;
        this.createMapCollisionForCharacter = options.createMapCollisionForCharacter;
        this.createAgentCharacter =
            options.createAgentCharacter ??
            ((host, definition, textureKeysPromise) =>
                new AgentCharacter(host, {
                    id: definition.characterId,
                    name: definition.name,
                    x: definition.spawnPosition.x,
                    y: definition.spawnPosition.y,
                    direction: definition.spawnPosition.direction,
                    texturesPromise: textureKeysPromise,
                    movementConfig: definition.movementConfig ?? DEFAULT_AGENT_MOVEMENT,
                }));
    }

    public async spawn(definition: AgentCharacterDefinition): Promise<AgentActionResult<AgentCharacterSnapshot>> {
        const actionId = this.createActionId();
        const preflight = this.validateSpawnDefinition(actionId, definition);
        if (preflight) {
            return preflight;
        }

        let character: AgentCharacter | undefined;
        try {
            const textureKeysPromise = this.textureLoader.load(definition.appearance);
            character = this.createAgentCharacter(this.host, definition, textureKeysPromise);
            this.createMapCollisionForCharacter(character);
            await character.ready();
            this.repository.add(character);
            this.host.markDirty();
            return this.ok(actionId, character.getAgentSnapshot());
        } catch (error) {
            character?.destroy();
            return this.fail(
                actionId,
                this.mapSpawnErrorCode(error),
                error instanceof Error ? error.message : String(error),
            );
        }
    }

    public list(): AgentActionResult<AgentCharacterSnapshot[]> {
        const actionId = this.createActionId();
        if (this.destroyed) {
            return this.fail(actionId, "destroyed", "Agent controller was destroyed");
        }
        return this.ok(actionId, this.repository.listSnapshots());
    }

    public getState(characterId: CharacterId): AgentActionResult<AgentCharacterSnapshot> {
        const actionId = this.createActionId();
        const character = this.getCharacter(actionId, characterId);
        if (!character.ok) {
            return character.result;
        }
        return this.ok(actionId, character.value.getAgentSnapshot());
    }

    public async moveTo(
        characterId: CharacterId,
        target: { x: number; y: number },
        options: AgentMoveToOptions = {},
    ): Promise<AgentActionResult<AgentCharacterSnapshot>> {
        const actionId = this.createActionId();
        const character = this.getCharacter(actionId, characterId);
        if (!character.ok) {
            return character.result;
        }
        if (character.value.getAgentSnapshot().sceneId !== this.host.sceneId) {
            return this.fail(actionId, "scene_mismatch", `Agent "${characterId}" does not belong to scene "${this.host.sceneId}"`);
        }
        if (!this.isPositionWithinMap(target)) {
            return this.fail(actionId, "invalid_target", "Move target is outside the map");
        }

        this.pathfinder.cancelCharacter(characterId);
        character.value.stopAction();

        const pathResult = await this.pathfinder.findPathForCharacter(characterId, character.value.getPosition(), target, {
            tryFindingNearestAvailable: options.tryFindingNearestAvailable,
            timeoutMs: options.timeoutMs,
            maxCalculations: options.maxCalculations,
        });
        if (!pathResult.ok) {
            return this.fail(actionId, pathResult.code, pathResult.message);
        }
        if (!this.repository.has(characterId)) {
            return this.fail(actionId, "character_not_found", `Agent "${characterId}" was removed`);
        }

        const body = character.value.getBody();
        body.setDirectControl(true);
        const moveResult = await character.value.setPathToFollow(pathResult.path, options.speed).finally(() => {
            body.setDirectControl(false);
        });
        if (!moveResult.ok) {
            return this.fail(actionId, moveResult.code, moveResult.message);
        }
        return this.ok(actionId, character.value.getAgentSnapshot());
    }

    public stop(characterId: CharacterId): AgentActionResult<AgentCharacterSnapshot> {
        const actionId = this.createActionId();
        const character = this.getCharacter(actionId, characterId);
        if (!character.ok) {
            return character.result;
        }
        this.pathfinder.cancelCharacter(characterId);
        return this.ok(actionId, character.value.stopAction());
    }

    public face(characterId: CharacterId, direction: DirectionType): AgentActionResult<AgentCharacterSnapshot> {
        const actionId = this.createActionId();
        const character = this.getCharacter(actionId, characterId);
        if (!character.ok) {
            return character.result;
        }
        if (!this.isDirection(direction)) {
            return this.fail(actionId, "invalid_target", `Invalid direction: ${String(direction)}`);
        }
        this.pathfinder.cancelCharacter(characterId);
        return this.ok(actionId, character.value.face(direction));
    }

    public speak(
        characterId: CharacterId,
        text: string,
        type: CharacterSayTypeValue = CharacterSayType.SpeechBubble,
    ): AgentActionResult<AgentCharacterSnapshot> {
        const actionId = this.createActionId();
        const character = this.getCharacter(actionId, characterId);
        if (!character.ok) {
            return character.result;
        }
        return this.ok(actionId, character.value.speak(text, type));
    }

    public clearSpeech(characterId: CharacterId): AgentActionResult<AgentCharacterSnapshot> {
        const actionId = this.createActionId();
        const character = this.getCharacter(actionId, characterId);
        if (!character.ok) {
            return character.result;
        }
        return this.ok(actionId, character.value.clearSpeech());
    }

    public remove(characterId: CharacterId): AgentActionResult<AgentCharacterSnapshot> {
        const actionId = this.createActionId();
        const character = this.getCharacter(actionId, characterId);
        if (!character.ok) {
            return character.result;
        }
        this.pathfinder.cancelCharacter(characterId);
        const snapshot = character.value.stopAction();
        this.repository.remove(characterId);
        this.host.markDirty();
        return this.ok(actionId, snapshot);
    }

    public destroy(): void {
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;
        this.pathfinder.cancelAll();
        for (const snapshot of this.repository.listSnapshots()) {
            this.repository.get(snapshot.id)?.stopAction();
        }
        this.repository.clear();
        this.host.markDirty();
    }

    private validateSpawnDefinition(
        actionId: string,
        definition: AgentCharacterDefinition,
    ): AgentActionResult<AgentCharacterSnapshot> | undefined {
        if (this.destroyed) {
            return this.fail(actionId, "destroyed", "Agent controller was destroyed");
        }
        if (definition.sceneId !== this.host.sceneId) {
            return this.fail(
                actionId,
                "scene_mismatch",
                `Agent scene "${definition.sceneId}" does not match active scene "${this.host.sceneId}"`,
            );
        }
        if (!definition.characterId.trim()) {
            return this.fail(actionId, "invalid_target", "Agent characterId must be non-empty");
        }
        if (this.repository.has(definition.characterId)) {
            return this.fail(actionId, "character_already_exists", `Agent "${definition.characterId}" already exists`);
        }
        if (!this.isPositionWithinMap(definition.spawnPosition)) {
            return this.fail(actionId, "invalid_target", "Agent spawn position is outside the map");
        }
        if (!this.isPositionWalkable(definition.spawnPosition)) {
            return this.fail(actionId, "spawn_blocked", "Agent spawn position is blocked");
        }
        return undefined;
    }

    private getCharacter(
        actionId: string,
        characterId: CharacterId,
    ):
        | { ok: true; value: AgentCharacter }
        | { ok: false; result: AgentActionResult<AgentCharacterSnapshot> } {
        if (this.destroyed) {
            return { ok: false, result: this.fail(actionId, "destroyed", "Agent controller was destroyed") };
        }
        const character = this.repository.get(characterId);
        if (!character) {
            return {
                ok: false,
                result: this.fail(actionId, "character_not_found", `Agent "${characterId}" was not found`),
            };
        }
        return { ok: true, value: character };
    }

    private isPositionWithinMap(position: { x: number; y: number }): boolean {
        const grid = this.collisionGridProvider.getCollisionGrid();
        const tileDimensions = this.collisionGridProvider.getTileDimensions();
        const tile = {
            x: Math.floor(position.x / tileDimensions.width),
            y: Math.floor(position.y / tileDimensions.height),
        };
        return tile.y >= 0 && tile.y < grid.length && tile.x >= 0 && tile.x < (grid[0]?.length ?? 0);
    }

    private isPositionWalkable(position: { x: number; y: number }): boolean {
        const grid = this.collisionGridProvider.getCollisionGrid();
        const tileDimensions = this.collisionGridProvider.getTileDimensions();
        const tile = {
            x: Math.floor(position.x / tileDimensions.width),
            y: Math.floor(position.y / tileDimensions.height),
        };
        const value = grid[tile.y]?.[tile.x];
        return (
            value === PathTileType.Walkable ||
            value === PathTileType.Exit ||
            value === PathTileType.Start ||
            value === PathTileType.MeetingRoom ||
            value === PathTileType.PersonalDesk
        );
    }

    private isDirection(direction: DirectionType): boolean {
        return (
            direction === Direction.UP ||
            direction === Direction.RIGHT ||
            direction === Direction.DOWN ||
            direction === Direction.LEFT
        );
    }

    private mapSpawnErrorCode(error: unknown): AgentActionErrorCode {
        if (error instanceof StandaloneCharacterReadyError) {
            return error.code;
        }
        return "texture_load_failed";
    }

    private ok<T>(actionId: string, value: T): AgentActionResult<T> {
        return { ok: true, actionId, value };
    }

    private fail<T>(actionId: string, code: AgentActionErrorCode, message: string): AgentActionResult<T> {
        return { ok: false, actionId, code, message };
    }

    private createActionId(): string {
        return globalThis.crypto?.randomUUID?.() ?? `agent-action-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
}
