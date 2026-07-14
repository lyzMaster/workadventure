import { z } from "zod";

export const UnsupportedWamFeatureDiagnostic = z.object({
    path: z.string(),
    feature: z.string(),
    reason: z.enum(["unsupported_property", "unsupported_setting", "invalid_property", "unknown_property"]),
});

export type UnsupportedWamFeatureDiagnostic = z.infer<typeof UnsupportedWamFeatureDiagnostic>;
