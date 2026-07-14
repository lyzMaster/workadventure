import { z } from "zod";
import { EntityDescriptionPropertyData, OpenFilePropertyData, OpenWebsitePropertyData, PlayAudioPropertyData } from "../types";

export const StandaloneEntityProperty = z.discriminatedUnion("type", [
    PlayAudioPropertyData,
    OpenWebsitePropertyData,
    OpenFilePropertyData,
    EntityDescriptionPropertyData,
]);

export const StandaloneEntityProperties = z.array(StandaloneEntityProperty);

export type StandaloneEntityProperty = z.infer<typeof StandaloneEntityProperty>;
export type StandaloneEntityProperties = z.infer<typeof StandaloneEntityProperties>;
