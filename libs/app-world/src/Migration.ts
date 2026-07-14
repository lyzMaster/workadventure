import {
    APP_WORLD_SCHEMA_VERSION,
    AppWorldSnapshotSchema,
    type AppWorldSnapshot,
} from "./AppWorldSnapshot";
import { type PersistedAgentState, type PersistedPlayerState } from "./PersistedCharacterState";
import { PersistedSceneStateSchema, type PersistedSceneState } from "./PersistedSceneState";
import {
    safeValidateAppWorldSnapshot,
    validatePersistedAgentState,
    validatePersistedPlayerState,
    validatePersistedSceneState,
} from "./Validation";

export interface MigrationDiagnostic {
    code:
        | "unsupported_schema_version"
        | "invalid_snapshot"
        | "scene_dropped"
        | "player_dropped"
        | "agent_dropped";
    message: string;
    sceneId?: string;
    characterId?: string;
}

export type MigrationResult =
    | {
          ok: true;
          snapshot: AppWorldSnapshot;
          diagnostics: MigrationDiagnostic[];
      }
    | {
          ok: false;
          snapshot: null;
          diagnostics: MigrationDiagnostic[];
      };

export function migrateAppWorldSnapshot(input: unknown): MigrationResult {
    if (input === null || input === undefined) {
        return { ok: false, snapshot: null, diagnostics: [] };
    }

    const direct = safeValidateAppWorldSnapshot(input);
    if (direct.ok) {
        return { ok: true, snapshot: direct.value, diagnostics: [] };
    }

    if (typeof input !== "object" || input === null) {
        return {
            ok: false,
            snapshot: null,
            diagnostics: [{ code: "invalid_snapshot", message: "AppWorldSnapshot must be a JSON object" }],
        };
    }

    const rawSchemaVersion = "schemaVersion" in input ? input.schemaVersion : undefined;
    if (rawSchemaVersion !== APP_WORLD_SCHEMA_VERSION) {
        return {
            ok: false,
            snapshot: null,
            diagnostics: [
                {
                    code: "unsupported_schema_version",
                    message: `Unsupported AppWorld schemaVersion: ${String(rawSchemaVersion)}`,
                },
            ],
        };
    }

    const diagnostics: MigrationDiagnostic[] = [];
    const raw = input as Record<string, unknown>;
    const scenes = sanitizeScenes(raw.scenes, diagnostics);
    const candidate = {
        schemaVersion: APP_WORLD_SCHEMA_VERSION,
        worldId: raw.worldId,
        revision: raw.revision,
        activeSceneId: raw.activeSceneId,
        scenes,
        updatedAt: raw.updatedAt,
    };
    const parsed = AppWorldSnapshotSchema.safeParse(candidate);
    if (!parsed.success) {
        return {
            ok: false,
            snapshot: null,
            diagnostics: [
                ...diagnostics,
                { code: "invalid_snapshot", message: parsed.error.issues.map((issue) => issue.message).join("; ") },
            ],
        };
    }
    return {
        ok: true,
        snapshot: parsed.data,
        diagnostics,
    };
}

function sanitizeScenes(input: unknown, diagnostics: MigrationDiagnostic[]): Record<string, PersistedSceneState> {
    if (!isRecord(input)) {
        return {};
    }

    const scenes: Record<string, PersistedSceneState> = {};
    for (const [sceneKey, rawScene] of Object.entries(input)) {
        const parsed = trySanitizeScene(sceneKey, rawScene, diagnostics);
        if (parsed) {
            scenes[sceneKey] = parsed;
        }
    }
    return scenes;
}

function trySanitizeScene(
    sceneKey: string,
    input: unknown,
    diagnostics: MigrationDiagnostic[],
): PersistedSceneState | null {
    try {
        return validatePersistedSceneState(input);
    } catch {
        if (!isRecord(input)) {
            diagnostics.push({
                code: "scene_dropped",
                sceneId: sceneKey,
                message: `Dropped scene "${sceneKey}" because it is not a JSON object`,
            });
            return null;
        }
    }

    const raw = input as Record<string, unknown>;
    const player = sanitizePlayer(sceneKey, raw.player, diagnostics);
    const agents = sanitizeAgents(sceneKey, raw.agents, diagnostics);
    const candidate = {
        sceneId: raw.sceneId,
        baseMapId: raw.baseMapId,
        baseMapRevision: raw.baseMapRevision,
        player,
        agents,
    };
    const parsed = PersistedSceneStateSchema.safeParse(candidate);
    if (!parsed.success) {
        diagnostics.push({
            code: "scene_dropped",
            sceneId: sceneKey,
            message: parsed.error.issues.map((issue) => issue.message).join("; "),
        });
        return null;
    }
    return parsed.data;
}

function sanitizePlayer(
    sceneId: string,
    input: unknown,
    diagnostics: MigrationDiagnostic[],
): PersistedPlayerState | undefined {
    if (input === undefined) {
        return undefined;
    }
    try {
        return validatePersistedPlayerState(input);
    } catch {
        diagnostics.push({
            code: "player_dropped",
            sceneId,
            message: `Dropped invalid player snapshot for scene "${sceneId}"`,
        });
        return undefined;
    }
}

function sanitizeAgents(
    sceneId: string,
    input: unknown,
    diagnostics: MigrationDiagnostic[],
): Record<string, PersistedAgentState> {
    if (!isRecord(input)) {
        return {};
    }
    const agents: Record<string, PersistedAgentState> = {};
    for (const [characterId, rawAgent] of Object.entries(input)) {
        try {
            agents[characterId] = validatePersistedAgentState(rawAgent);
        } catch {
            diagnostics.push({
                code: "agent_dropped",
                sceneId,
                characterId,
                message: `Dropped invalid agent "${characterId}" from scene "${sceneId}"`,
            });
        }
    }
    return agents;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
