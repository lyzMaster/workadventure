import { type ZodIssue, z } from "zod";
import { AppWorldSnapshotSchema, type AppWorldSnapshot } from "./AppWorldSnapshot";
import {
    PersistedAgentStateSchema,
    PersistedCharacterAppearanceSchema,
    PersistedCharacterPositionSchema,
    PersistedCharacterTextureSchema,
    PersistedPlayerStateSchema,
    type PersistedAgentState,
    type PersistedCharacterAppearance,
    type PersistedCharacterPosition,
    type PersistedCharacterTexture,
    type PersistedPlayerState,
} from "./PersistedCharacterState";
import { PersistedSceneStateSchema, type PersistedSceneState } from "./PersistedSceneState";

export interface ValidationFailure {
    code: "validation_failed";
    message: string;
    issues: ZodIssue[];
}

export function validateAppWorldSnapshot(input: unknown): AppWorldSnapshot {
    return AppWorldSnapshotSchema.parse(input);
}

export function safeValidateAppWorldSnapshot(
    input: unknown,
): { ok: true; value: AppWorldSnapshot } | { ok: false; error: ValidationFailure } {
    return safeParse(AppWorldSnapshotSchema, input, "Invalid AppWorldSnapshot");
}

export function validatePersistedSceneState(input: unknown): PersistedSceneState {
    return PersistedSceneStateSchema.parse(input);
}

export function validatePersistedPlayerState(input: unknown): PersistedPlayerState {
    return PersistedPlayerStateSchema.parse(input);
}

export function validatePersistedAgentState(input: unknown): PersistedAgentState {
    return PersistedAgentStateSchema.parse(input);
}

export function validatePersistedCharacterPosition(input: unknown): PersistedCharacterPosition {
    return PersistedCharacterPositionSchema.parse(input);
}

export function validatePersistedCharacterAppearance(input: unknown): PersistedCharacterAppearance {
    return PersistedCharacterAppearanceSchema.parse(input);
}

export function validatePersistedCharacterTexture(input: unknown): PersistedCharacterTexture {
    return PersistedCharacterTextureSchema.parse(input);
}

function safeParse<T>(
    schema: z.ZodSchema<T>,
    input: unknown,
    message: string,
): { ok: true; value: T } | { ok: false; error: ValidationFailure } {
    const parsed = schema.safeParse(input);
    if (parsed.success) {
        return { ok: true, value: parsed.data };
    }
    return {
        ok: false,
        error: {
            code: "validation_failed",
            message,
            issues: parsed.error.issues,
        },
    };
}
