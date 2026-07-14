import type {
    AgentCharacterDefinition,
    AgentCharacterSnapshot,
    CharacterAppearance,
    CharacterPosition,
    CharacterSnapshot,
} from "@workadventure/game-model";
import type {
    PersistedAgentState,
    PersistedCharacterAppearance,
    PersistedCharacterPosition,
    PersistedPlayerState,
} from "./PersistedCharacterState";
import {
    validatePersistedAgentState,
    validatePersistedCharacterAppearance,
    validatePersistedCharacterPosition,
    validatePersistedPlayerState,
} from "./Validation";

export function runtimePositionToPersisted(position: CharacterPosition): PersistedCharacterPosition {
    return validatePersistedCharacterPosition({
        x: position.x,
        y: position.y,
        direction: position.direction,
    });
}

export function persistedPositionToRuntime(position: PersistedCharacterPosition): CharacterPosition {
    const valid = validatePersistedCharacterPosition(position);
    return {
        x: valid.x,
        y: valid.y,
        direction: valid.direction,
        moving: false,
    };
}

export function runtimeAppearanceToPersisted(appearance: CharacterAppearance): PersistedCharacterAppearance {
    return validatePersistedCharacterAppearance({
        textures: appearance.textures.map((texture) => ({
            id: texture.id,
            assetPath: texture.url,
            layer: texture.layer,
        })),
    });
}

export function persistedAppearanceToRuntime(appearance: PersistedCharacterAppearance): CharacterAppearance {
    const valid = validatePersistedCharacterAppearance(appearance);
    return {
        textures: valid.textures.map((texture) => ({
            id: texture.id,
            url: texture.assetPath,
            layer: texture.layer,
        })),
    };
}

export function playerSnapshotToPersisted(snapshot: CharacterSnapshot, updatedAt: string): PersistedPlayerState {
    return validatePersistedPlayerState({
        position: runtimePositionToPersisted(snapshot.position),
        updatedAt,
    });
}

export function persistedPlayerToSnapshot(
    sceneId: string,
    playerId: string,
    playerName: string,
    state: PersistedPlayerState,
): CharacterSnapshot {
    const valid = validatePersistedPlayerState(state);
    return {
        id: playerId,
        name: playerName,
        sceneId,
        position: persistedPositionToRuntime(valid.position),
        motionState: "idle",
    };
}

export function agentSnapshotToPersisted(
    snapshot: AgentCharacterSnapshot & { appearance?: CharacterAppearance; movementConfig?: { walkingSpeed: number; runningMultiplier: number } },
    updatedAt: string,
): PersistedAgentState {
    if (!snapshot.appearance) {
        throw new Error(`Agent "${snapshot.id}" is missing appearance for persistence`);
    }
    return validatePersistedAgentState({
        characterId: snapshot.id,
        name: snapshot.name,
        sceneId: snapshot.sceneId,
        appearance: runtimeAppearanceToPersisted(snapshot.appearance),
        movementConfig: snapshot.movementConfig,
        position: runtimePositionToPersisted(snapshot.position),
        updatedAt,
    });
}

export function agentDefinitionToPersisted(definition: AgentCharacterDefinition, updatedAt: string): PersistedAgentState {
    return validatePersistedAgentState({
        characterId: definition.characterId,
        name: definition.name,
        sceneId: definition.sceneId,
        appearance: runtimeAppearanceToPersisted(definition.appearance),
        movementConfig: definition.movementConfig,
        position: runtimePositionToPersisted(definition.spawnPosition),
        updatedAt,
    });
}

export function persistedAgentToDefinition(state: PersistedAgentState): AgentCharacterDefinition {
    const valid = validatePersistedAgentState(state);
    return {
        characterId: valid.characterId,
        name: valid.name,
        sceneId: valid.sceneId,
        appearance: persistedAppearanceToRuntime(valid.appearance),
        movementConfig: valid.movementConfig,
        spawnPosition: persistedPositionToRuntime(valid.position),
    };
}
