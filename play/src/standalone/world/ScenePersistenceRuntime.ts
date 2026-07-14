import type {
    PersistedAgentState,
    PersistedPlayerState,
} from "@workadventure/app-world";
import type {
    AgentCharacterSnapshot,
    CharacterSnapshot,
} from "@workadventure/game-model";

export interface RestoreResult {
    applied: boolean;
    code: string;
    message: string;
    position?: {
        x: number;
        y: number;
        direction: "up" | "right" | "down" | "left";
    };
}

export interface RestoreDiagnostic {
    code: string;
    message: string;
    characterId?: string;
    applied?: boolean;
    position?: {
        x: number;
        y: number;
        direction: "up" | "right" | "down" | "left";
    };
}

export interface ScenePersistenceRuntime {
    readonly sceneId: string;

    getPlayerSnapshot(): CharacterSnapshot | null;
    listAgentSnapshots(): AgentCharacterSnapshot[];

    restorePlayer(state: PersistedPlayerState): Promise<RestoreResult>;
    restoreAgents(states: readonly PersistedAgentState[]): Promise<RestoreDiagnostic[]>;

    flushSceneOverlay(): Promise<void>;
}
