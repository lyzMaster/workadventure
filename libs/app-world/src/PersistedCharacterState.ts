import { z } from "zod";

function isPersistableAssetPath(value: string): boolean {
    const trimmed = value.trim();
    if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
        return false;
    }
    if (trimmed.includes("\\") || trimmed.includes("..")) {
        return false;
    }
    if (trimmed.includes("?") || trimmed.includes("#")) {
        return false;
    }
    const lowered = trimmed.toLowerCase();
    return !(
        lowered.startsWith("http:") ||
        lowered.startsWith("https:") ||
        lowered.startsWith("blob:") ||
        lowered.startsWith("data:") ||
        lowered.startsWith("javascript:")
    );
}

export const PersistedDirectionSchema = z.enum(["up", "right", "down", "left"]);
export type PersistedDirection = z.infer<typeof PersistedDirectionSchema>;

export const PersistedCharacterPositionSchema = z
    .object({
        x: z.number().finite(),
        y: z.number().finite(),
        direction: PersistedDirectionSchema,
    })
    .strict();
export type PersistedCharacterPosition = z.infer<typeof PersistedCharacterPositionSchema>;

export const PersistedCharacterTextureSchema = z
    .object({
        id: z.string().trim().min(1),
        assetPath: z
            .string()
            .trim()
            .min(1)
            .refine(isPersistableAssetPath, "Character assetPath must be a root-relative local path"),
        layer: z.number().int().nonnegative().optional(),
    })
    .strict();
export type PersistedCharacterTexture = z.infer<typeof PersistedCharacterTextureSchema>;

export const PersistedCharacterAppearanceSchema = z
    .object({
        textures: z.array(PersistedCharacterTextureSchema).min(1),
    })
    .strict();
export type PersistedCharacterAppearance = z.infer<typeof PersistedCharacterAppearanceSchema>;

export const CharacterMovementConfigSchema = z
    .object({
        walkingSpeed: z.number().positive().finite(),
        runningMultiplier: z.number().positive().finite(),
    })
    .strict();
export type CharacterMovementConfig = z.infer<typeof CharacterMovementConfigSchema>;

export const PersistedPlayerStateSchema = z
    .object({
        position: PersistedCharacterPositionSchema,
        updatedAt: z.string().datetime(),
    })
    .strict();
export type PersistedPlayerState = z.infer<typeof PersistedPlayerStateSchema>;

export const PersistedAgentStateSchema = z
    .object({
        characterId: z.string().trim().min(1),
        name: z.string().trim().min(1),
        sceneId: z.string().trim().min(1),
        appearance: PersistedCharacterAppearanceSchema,
        movementConfig: CharacterMovementConfigSchema.optional(),
        position: PersistedCharacterPositionSchema,
        updatedAt: z.string().datetime(),
    })
    .strict();
export type PersistedAgentState = z.infer<typeof PersistedAgentStateSchema>;
