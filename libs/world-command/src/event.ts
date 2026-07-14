import { z } from "zod";
import { WORLD_COMMAND_SCHEMA_VERSION } from "./command";

export const WorldEventTypeSchema = z.enum([
    "command.accepted",
    "command.started",
    "command.succeeded",
    "command.failed",
    "command.cancelled",
    "scene.changed",
    "agent.spawned",
    "agent.moved",
    "agent.stopped",
    "agent.faced",
    "agent.spoke",
    "agent.removed",
    "furniture.placed",
    "furniture.moved",
    "furniture.updated",
    "furniture.removed",
]);
export type WorldEventType = z.infer<typeof WorldEventTypeSchema>;

const BaseWorldEventSchema = z
    .object({
        schemaVersion: z.literal(WORLD_COMMAND_SCHEMA_VERSION),
        eventId: z.string().min(1),
        type: WorldEventTypeSchema,
        timestamp: z.string().datetime(),
        commandId: z.string().min(1),
        sceneId: z.string().min(1),
    })
    .strict();

const CommandAcceptedEventSchema = BaseWorldEventSchema.extend({
    type: z.literal("command.accepted"),
}).strict();

const CommandStartedEventSchema = BaseWorldEventSchema.extend({
    type: z.literal("command.started"),
}).strict();

const CommandSucceededEventSchema = BaseWorldEventSchema.extend({
    type: z.literal("command.succeeded"),
    data: z.unknown().optional(),
}).strict();

const CommandFailedEventSchema = BaseWorldEventSchema.extend({
    type: z.literal("command.failed"),
    data: z
        .object({
            code: z.string(),
            message: z.string(),
        })
        .strict(),
}).strict();

const CommandCancelledEventSchema = BaseWorldEventSchema.extend({
    type: z.literal("command.cancelled"),
    data: z
        .object({
            reason: z.enum(["cancelled", "timeout", "gateway_destroyed"]),
        })
        .strict(),
}).strict();

const SceneChangedEventSchema = BaseWorldEventSchema.extend({
    type: z.literal("scene.changed"),
    data: z
        .object({
            previousSceneId: z.string().nullable(),
            nextSceneId: z.string(),
        })
        .strict(),
}).strict();

const AgentCharacterEventDataSchema = z
    .object({
        characterId: z.string(),
        motionState: z.string().optional(),
        position: z
            .object({
                x: z.number(),
                y: z.number(),
                direction: z.enum(["up", "right", "down", "left"]),
                moving: z.boolean(),
            })
            .strict()
            .optional(),
        text: z.string().optional(),
        sayType: z.enum(["speech", "thinking"]).optional(),
    })
    .strict();

const FurnitureEventDataSchema = z
    .object({
        entityId: z.string(),
        prefabId: z.string().optional(),
        collectionName: z.string().optional(),
        position: z
            .object({
                x: z.number(),
                y: z.number(),
            })
            .strict()
            .optional(),
    })
    .strict();

const AgentSpawnedEventSchema = BaseWorldEventSchema.extend({
    type: z.literal("agent.spawned"),
    data: AgentCharacterEventDataSchema,
}).strict();

const AgentMovedEventSchema = BaseWorldEventSchema.extend({
    type: z.literal("agent.moved"),
    data: AgentCharacterEventDataSchema,
}).strict();

const AgentStoppedEventSchema = BaseWorldEventSchema.extend({
    type: z.literal("agent.stopped"),
    data: AgentCharacterEventDataSchema,
}).strict();

const AgentFacedEventSchema = BaseWorldEventSchema.extend({
    type: z.literal("agent.faced"),
    data: AgentCharacterEventDataSchema,
}).strict();

const AgentSpokeEventSchema = BaseWorldEventSchema.extend({
    type: z.literal("agent.spoke"),
    data: AgentCharacterEventDataSchema,
}).strict();

const AgentRemovedEventSchema = BaseWorldEventSchema.extend({
    type: z.literal("agent.removed"),
    data: AgentCharacterEventDataSchema,
}).strict();

const FurniturePlacedEventSchema = BaseWorldEventSchema.extend({
    type: z.literal("furniture.placed"),
    data: FurnitureEventDataSchema,
}).strict();

const FurnitureMovedEventSchema = BaseWorldEventSchema.extend({
    type: z.literal("furniture.moved"),
    data: FurnitureEventDataSchema,
}).strict();

const FurnitureUpdatedEventSchema = BaseWorldEventSchema.extend({
    type: z.literal("furniture.updated"),
    data: FurnitureEventDataSchema,
}).strict();

const FurnitureRemovedEventSchema = BaseWorldEventSchema.extend({
    type: z.literal("furniture.removed"),
    data: FurnitureEventDataSchema,
}).strict();

export const WorldEventSchema = z.discriminatedUnion("type", [
    CommandAcceptedEventSchema,
    CommandStartedEventSchema,
    CommandSucceededEventSchema,
    CommandFailedEventSchema,
    CommandCancelledEventSchema,
    SceneChangedEventSchema,
    AgentSpawnedEventSchema,
    AgentMovedEventSchema,
    AgentStoppedEventSchema,
    AgentFacedEventSchema,
    AgentSpokeEventSchema,
    AgentRemovedEventSchema,
    FurniturePlacedEventSchema,
    FurnitureMovedEventSchema,
    FurnitureUpdatedEventSchema,
    FurnitureRemovedEventSchema,
]);

export type WorldEvent = z.infer<typeof WorldEventSchema>;
