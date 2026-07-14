import { z } from "zod";
import {
    AreaDescriptionPropertyData,
    ExitPropertyData,
    FocusablePropertyData,
    HighlightPropertyData,
    LockableAreaPropertyData,
    MaxUsersInAreaPropertyData,
    OpenFilePropertyData,
    OpenWebsitePropertyData,
    PersonalAreaPropertyData,
    PlayAudioPropertyData,
    RestrictedRightsPropertyData,
    SilentPropertyData,
    StartPropertyData,
    TooltipPropertyData,
} from "../types";

export const StandaloneAreaProperty = z.discriminatedUnion("type", [
    StartPropertyData,
    ExitPropertyData,
    FocusablePropertyData,
    HighlightPropertyData,
    SilentPropertyData,
    PlayAudioPropertyData,
    OpenWebsitePropertyData,
    OpenFilePropertyData,
    AreaDescriptionPropertyData,
    RestrictedRightsPropertyData,
    PersonalAreaPropertyData,
    TooltipPropertyData,
    MaxUsersInAreaPropertyData,
    LockableAreaPropertyData,
]);

export const StandaloneAreaProperties = z.array(StandaloneAreaProperty);

export type StandaloneAreaProperty = z.infer<typeof StandaloneAreaProperty>;
export type StandaloneAreaProperties = z.infer<typeof StandaloneAreaProperties>;
