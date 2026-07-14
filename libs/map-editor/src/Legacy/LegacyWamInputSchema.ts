import { z } from "zod";
import { CollectionUrl, EntityPrefabRef, WAMMetadata, WAMVendor } from "../types";

const LegacyPropertyInputSchema = z
    .object({
        type: z.string(),
        id: z.string().optional(),
    })
    .passthrough();

export const LegacyAreaInputSchema = z
    .object({
        id: z.string(),
        x: z.number(),
        y: z.number(),
        width: z.number(),
        height: z.number(),
        visible: z.boolean(),
        name: z.string(),
        properties: z.array(LegacyPropertyInputSchema).default([]),
    })
    .passthrough();

export const LegacyEntityInputSchema = z
    .object({
        x: z.number(),
        y: z.number(),
        name: z.string().optional(),
        properties: z.array(LegacyPropertyInputSchema).optional(),
        prefabRef: EntityPrefabRef,
    })
    .passthrough();

export const LegacyWamInputSchema = z
    .object({
        version: z.string().optional(),
        mapUrl: z.string(),
        entities: z.record(z.string(), LegacyEntityInputSchema).default({}),
        areas: z.array(LegacyAreaInputSchema).default([]),
        entityCollections: z.array(CollectionUrl).default([]),
        lastCommandId: z.string().optional(),
        settings: z.unknown().optional(),
        metadata: WAMMetadata.optional(),
        vendor: WAMVendor.optional(),
    })
    .passthrough();

export type LegacyPropertyInput = z.infer<typeof LegacyPropertyInputSchema>;
export type LegacyAreaInput = z.infer<typeof LegacyAreaInputSchema>;
export type LegacyEntityInput = z.infer<typeof LegacyEntityInputSchema>;
export type LegacyWamInput = z.infer<typeof LegacyWamInputSchema>;
