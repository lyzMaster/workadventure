import { z } from "zod";
import { CommandIdSchema, StandaloneSceneIdSchema, WORLD_COMMAND_SCHEMA_VERSION, type WorldCommandEnvelope } from "../command";

const EmptyPayloadSchema = z.object({}).strict();
const PositionSchema = z
    .object({
        x: z.number().finite(),
        y: z.number().finite(),
    })
    .strict();

export const FurniturePrefabRefSchema = z
    .object({
        collectionName: z.string().trim().min(1).max(128),
        prefabId: z.string().trim().min(1).max(128),
    })
    .strict();

export const FurnitureListCatalogPayloadSchema = EmptyPayloadSchema;
export const FurnitureListPayloadSchema = EmptyPayloadSchema;

export const FurnitureGetStatePayloadSchema = z
    .object({
        entityId: z.string().trim().min(1).max(128),
    })
    .strict();

export const FurniturePlacePayloadSchema = z
    .object({
        entityId: z.string().trim().min(1).max(128).optional(),
        prefab: FurniturePrefabRefSchema,
        position: PositionSchema,
    })
    .strict();

export const FurnitureMovePayloadSchema = z
    .object({
        entityId: z.string().trim().min(1).max(128),
        position: PositionSchema,
    })
    .strict();

export const FurnitureSetVariantPayloadSchema = z
    .object({
        entityId: z.string().trim().min(1).max(128),
        prefab: FurniturePrefabRefSchema,
    })
    .strict();

export const FurnitureRemovePayloadSchema = FurnitureGetStatePayloadSchema;

export const FurnitureListCatalogCommandSchema = z
    .object({
        schemaVersion: z.literal(WORLD_COMMAND_SCHEMA_VERSION),
        commandId: CommandIdSchema,
        type: z.literal("furniture.listCatalog"),
        sceneId: StandaloneSceneIdSchema.optional(),
        payload: FurnitureListCatalogPayloadSchema,
    })
    .strict();

export const FurnitureListCommandSchema = z
    .object({
        schemaVersion: z.literal(WORLD_COMMAND_SCHEMA_VERSION),
        commandId: CommandIdSchema,
        type: z.literal("furniture.list"),
        sceneId: StandaloneSceneIdSchema.optional(),
        payload: FurnitureListPayloadSchema,
    })
    .strict();

export const FurnitureGetStateCommandSchema = z
    .object({
        schemaVersion: z.literal(WORLD_COMMAND_SCHEMA_VERSION),
        commandId: CommandIdSchema,
        type: z.literal("furniture.getState"),
        sceneId: StandaloneSceneIdSchema.optional(),
        payload: FurnitureGetStatePayloadSchema,
    })
    .strict();

export const FurniturePlaceCommandSchema = z
    .object({
        schemaVersion: z.literal(WORLD_COMMAND_SCHEMA_VERSION),
        commandId: CommandIdSchema,
        type: z.literal("furniture.place"),
        sceneId: StandaloneSceneIdSchema.optional(),
        payload: FurniturePlacePayloadSchema,
    })
    .strict();

export const FurnitureMoveCommandSchema = z
    .object({
        schemaVersion: z.literal(WORLD_COMMAND_SCHEMA_VERSION),
        commandId: CommandIdSchema,
        type: z.literal("furniture.move"),
        sceneId: StandaloneSceneIdSchema.optional(),
        payload: FurnitureMovePayloadSchema,
    })
    .strict();

export const FurnitureSetVariantCommandSchema = z
    .object({
        schemaVersion: z.literal(WORLD_COMMAND_SCHEMA_VERSION),
        commandId: CommandIdSchema,
        type: z.literal("furniture.setVariant"),
        sceneId: StandaloneSceneIdSchema.optional(),
        payload: FurnitureSetVariantPayloadSchema,
    })
    .strict();

export const FurnitureRemoveCommandSchema = z
    .object({
        schemaVersion: z.literal(WORLD_COMMAND_SCHEMA_VERSION),
        commandId: CommandIdSchema,
        type: z.literal("furniture.remove"),
        sceneId: StandaloneSceneIdSchema.optional(),
        payload: FurnitureRemovePayloadSchema,
    })
    .strict();

export const FurnitureCommandSchema = z.discriminatedUnion("type", [
    FurnitureListCatalogCommandSchema,
    FurnitureListCommandSchema,
    FurnitureGetStateCommandSchema,
    FurniturePlaceCommandSchema,
    FurnitureMoveCommandSchema,
    FurnitureSetVariantCommandSchema,
    FurnitureRemoveCommandSchema,
]);

export type FurnitureListCatalogCommand = WorldCommandEnvelope<
    "furniture.listCatalog",
    z.infer<typeof FurnitureListCatalogPayloadSchema>
>;
export type FurnitureListCommand = WorldCommandEnvelope<"furniture.list", z.infer<typeof FurnitureListPayloadSchema>>;
export type FurnitureGetStateCommand = WorldCommandEnvelope<
    "furniture.getState",
    z.infer<typeof FurnitureGetStatePayloadSchema>
>;
export type FurniturePlaceCommand = WorldCommandEnvelope<"furniture.place", z.infer<typeof FurniturePlacePayloadSchema>>;
export type FurnitureMoveCommand = WorldCommandEnvelope<"furniture.move", z.infer<typeof FurnitureMovePayloadSchema>>;
export type FurnitureSetVariantCommand = WorldCommandEnvelope<
    "furniture.setVariant",
    z.infer<typeof FurnitureSetVariantPayloadSchema>
>;
export type FurnitureRemoveCommand = WorldCommandEnvelope<
    "furniture.remove",
    z.infer<typeof FurnitureRemovePayloadSchema>
>;
export type FurnitureCommand = z.infer<typeof FurnitureCommandSchema>;
