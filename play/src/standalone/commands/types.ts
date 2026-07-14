import type {
    AgentActionResult,
    AgentCharacterDefinition,
    AgentCharacterSnapshot,
    CharacterSnapshot,
    CharacterSayType,
    Direction,
} from "@workadventure/game-model";
import type { WorldCommand, WorldCommandResult, WorldCommandType } from "@workadventure/world-command";
import type { StandaloneSceneDefinition, StandaloneSceneId } from "../StandaloneSceneDefinition";

export interface FurniturePrefabSnapshot {
    collectionName: string;
    prefabId: string;
    name: string;
    color: string;
    direction: string;
    hasCollisionGrid: boolean;
}

export interface FurnitureEntitySnapshot {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    prefab: FurniturePrefabSnapshot;
    propertiesCount: number;
}

export type FurnitureActionErrorCode =
    | "entity_not_found"
    | "character_not_found"
    | "prefab_not_found"
    | "invalid_target"
    | "collision_blocked"
    | "persistence_failed"
    | "command_failed";

export type FurnitureActionResult<T> =
    | {
          ok: true;
          value: T;
      }
    | {
          ok: false;
          code: FurnitureActionErrorCode;
          message: string;
          cause?: unknown;
      };

export interface HistoryStateSnapshot {
    canUndo: boolean;
    canRedo: boolean;
}

export type HistoryActionResult =
    | {
          ok: true;
          value: HistoryStateSnapshot;
      }
    | {
          ok: false;
          code: "command_failed" | "persistence_failed";
          message: string;
          cause?: unknown;
      };

export interface SceneFurnitureSummary {
    count: number;
    entities: FurnitureEntitySnapshot[];
    canUndo: boolean;
    canRedo: boolean;
}

export interface WorldPersistenceSnapshot {
    loaded: boolean;
    restoring: boolean;
    dirty: boolean;
    revision: number;
    lastSavedAt?: string;
    lastError?: {
        code: string;
        message: string;
    };
    restoreDiagnosticCount: number;
}

export interface WorldSceneStateSnapshot {
    activeSceneId: StandaloneSceneId | null;
    loading: boolean;
    availableScenes: Pick<StandaloneSceneDefinition, "sceneId" | "displayName">[];
    player: CharacterSnapshot | null;
    agents: AgentCharacterSnapshot[];
    furniture: SceneFurnitureSummary;
    persistence: WorldPersistenceSnapshot;
}

export interface SceneRuntimeSnapshot {
    activeSceneId: StandaloneSceneId | null;
    hasRuntime: boolean;
    loading: boolean;
}

export interface ActiveCommandSnapshot {
    commandId: string;
    type: WorldCommandType;
    sceneId?: string;
    startedAt: string;
}

export interface AgentCommandAdapter {
    spawn(
        definition: AgentCharacterDefinition,
        options?: { signal?: AbortSignal },
    ): Promise<AgentActionResult<AgentCharacterSnapshot>>;
    list(): AgentActionResult<AgentCharacterSnapshot[]>;
    getState(characterId: string): AgentActionResult<AgentCharacterSnapshot>;
    moveTo(
        characterId: string,
        target: { x: number; y: number },
        options?: {
            tryFindingNearestAvailable?: boolean;
            timeoutMs?: number;
            maxCalculations?: number;
            speed?: number;
        },
    ): Promise<AgentActionResult<AgentCharacterSnapshot>>;
    stop(characterId: string): AgentActionResult<AgentCharacterSnapshot>;
    face(characterId: string, direction: Direction): AgentActionResult<AgentCharacterSnapshot>;
    speak(characterId: string, text: string, type?: CharacterSayType): AgentActionResult<AgentCharacterSnapshot>;
    clearSpeech(characterId: string): AgentActionResult<AgentCharacterSnapshot>;
    remove(characterId: string): AgentActionResult<AgentCharacterSnapshot>;
    cancelMove(characterId: string): void;
}

export interface FurnitureCommandController {
    listCatalog(): Promise<FurniturePrefabSnapshot[]>;
    list(): FurnitureEntitySnapshot[];
    getState(entityId: string): FurnitureEntitySnapshot | undefined;
    place(input: {
        entityId: string;
        prefab: { collectionName: string; prefabId: string };
        position: { x: number; y: number };
    }): Promise<FurnitureActionResult<FurnitureEntitySnapshot>>;
    move(
        entityId: string,
        position: { x: number; y: number },
    ): Promise<FurnitureActionResult<FurnitureEntitySnapshot>>;
    setVariant(
        entityId: string,
        prefab: { collectionName: string; prefabId: string },
    ): Promise<FurnitureActionResult<FurnitureEntitySnapshot>>;
    remove(entityId: string): Promise<FurnitureActionResult<FurnitureEntitySnapshot>>;
    undo(): Promise<HistoryActionResult>;
    redo(): Promise<HistoryActionResult>;
    getHistoryState(): HistoryStateSnapshot;
    flush(): Promise<void>;
}

export interface WorldSceneRuntime {
    sceneId: string;
    agentCommands: AgentCommandAdapter;
    furnitureCommands: FurnitureCommandController;
    historyCommands: Pick<FurnitureCommandController, "undo" | "redo" | "getHistoryState">;
    flush(): Promise<unknown>;
}

export interface ActiveSceneRuntimeProvider {
    getActiveSceneId(): string | null;
    getActiveRuntime(): WorldSceneRuntime | null;
    switchScene(sceneId: StandaloneSceneId): Promise<void>;
    subscribe(listener: (snapshot: SceneRuntimeSnapshot) => void): () => void;
    getSceneStateSnapshot(): WorldSceneStateSnapshot;
    isTransitionInProgress(): boolean;
    afterCommand?(
        command: WorldCommand,
        result: WorldCommandResult,
    ): Promise<void | WorldCommandResult> | void | WorldCommandResult;
}
