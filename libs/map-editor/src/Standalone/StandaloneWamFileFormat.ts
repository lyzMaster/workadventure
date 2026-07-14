import { z } from "zod";
import { AreaCoordinates, CollectionUrl, EntityPrefabRef, WAMMetadata, WAMVendor } from "../types";
import { StandaloneAreaProperties } from "./StandaloneAreaProperty";
import { StandaloneEntityProperties } from "./StandaloneEntityProperty";

export const StandaloneAreaData = AreaCoordinates.extend({
    id: z.string(),
    visible: z.boolean(),
    name: z.string(),
    properties: StandaloneAreaProperties,
});

export const StandaloneWamEntityData = z.object({
    x: z.number(),
    y: z.number(),
    name: z.string().optional(),
    properties: StandaloneEntityProperties.optional(),
    prefabRef: EntityPrefabRef,
});

export const StandaloneWamFileFormat = z.object({
    version: z.literal("2.1.0"),
    mapUrl: z.string(),
    entities: z.record(z.string(), StandaloneWamEntityData),
    areas: z.array(StandaloneAreaData),
    entityCollections: z.array(CollectionUrl),
    lastCommandId: z.string().optional(),
    metadata: WAMMetadata.optional(),
    vendor: WAMVendor.optional(),
});

export type StandaloneAreaData = z.infer<typeof StandaloneAreaData>;
export type StandaloneWamEntityData = z.infer<typeof StandaloneWamEntityData>;
export type StandaloneWamFileFormat = z.infer<typeof StandaloneWamFileFormat>;
