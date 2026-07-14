import type { WAMFileFormat } from "../types";
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
    EntityDescriptionPropertyData,
    WAMFileFormat as WAMStorageDtoSchema,
} from "../types";
import { LegacyWamInputSchema, type LegacyAreaInput, type LegacyEntityInput, type LegacyPropertyInput } from "../Legacy/LegacyWamInputSchema";
import { StandaloneWamFileFormat, type StandaloneAreaData, type StandaloneWamEntityData, type StandaloneWamFileFormat as StandaloneWamFileFormatType } from "./StandaloneWamFileFormat";
import type { UnsupportedWamFeatureDiagnostic } from "./UnsupportedWamFeatureDiagnostic";

type NormalizeResult = {
    wam: StandaloneWamFileFormatType;
    diagnostics: UnsupportedWamFeatureDiagnostic[];
};

const standaloneAreaPropertyParsers = {
    start: StartPropertyData,
    exit: ExitPropertyData,
    focusable: FocusablePropertyData,
    highlight: HighlightPropertyData,
    silent: SilentPropertyData,
    playAudio: PlayAudioPropertyData,
    openWebsite: OpenWebsitePropertyData,
    openFile: OpenFilePropertyData,
    areaDescriptionProperties: AreaDescriptionPropertyData,
    restrictedRightsPropertyData: RestrictedRightsPropertyData,
    personalAreaPropertyData: PersonalAreaPropertyData,
    tooltipPropertyData: TooltipPropertyData,
    maxUsersInAreaPropertyData: MaxUsersInAreaPropertyData,
    lockableAreaPropertyData: LockableAreaPropertyData,
} as const;

const standaloneEntityPropertyParsers = {
    playAudio: PlayAudioPropertyData,
    openWebsite: OpenWebsitePropertyData,
    openFile: OpenFilePropertyData,
    entityDescriptionProperties: EntityDescriptionPropertyData,
} as const;

const unsupportedPropertyTypes = new Set([
    "jitsiRoomProperty",
    "livekitRoomProperty",
    "matrixRoomPropertyData",
    "speakerMegaphone",
    "listenerMegaphone",
    "extensionModule",
]);

function createDiagnostic(
    path: string,
    feature: string,
    reason: UnsupportedWamFeatureDiagnostic["reason"],
): UnsupportedWamFeatureDiagnostic {
    return { path, feature, reason };
}

function normalizeAreaProperties(
    properties: readonly LegacyPropertyInput[],
    pathPrefix: string,
    diagnostics: UnsupportedWamFeatureDiagnostic[],
): StandaloneAreaData["properties"] {
    const normalized: StandaloneAreaData["properties"] = [];

    properties.forEach((property, index) => {
        const path = `${pathPrefix}.properties[${index}]`;
        if (property.type in standaloneAreaPropertyParsers) {
            const parser =
                standaloneAreaPropertyParsers[property.type as keyof typeof standaloneAreaPropertyParsers];
            const parsed = parser.safeParse(property);
            if (parsed.success) {
                normalized.push(parsed.data);
            } else {
                diagnostics.push(createDiagnostic(path, property.type, "invalid_property"));
            }
            return;
        }

        if (unsupportedPropertyTypes.has(property.type)) {
            diagnostics.push(createDiagnostic(path, property.type, "unsupported_property"));
            return;
        }

        diagnostics.push(createDiagnostic(path, property.type, "unknown_property"));
    });

    return normalized;
}

function normalizeEntityProperties(
    properties: readonly LegacyPropertyInput[],
    pathPrefix: string,
    diagnostics: UnsupportedWamFeatureDiagnostic[],
): StandaloneWamEntityData["properties"] {
    const normalized: NonNullable<StandaloneWamEntityData["properties"]> = [];

    properties.forEach((property, index) => {
        const path = `${pathPrefix}.properties[${index}]`;
        if (property.type in standaloneEntityPropertyParsers) {
            const parser =
                standaloneEntityPropertyParsers[property.type as keyof typeof standaloneEntityPropertyParsers];
            const parsed = parser.safeParse(property);
            if (parsed.success) {
                normalized.push(parsed.data);
            } else {
                diagnostics.push(createDiagnostic(path, property.type, "invalid_property"));
            }
            return;
        }

        if (unsupportedPropertyTypes.has(property.type)) {
            diagnostics.push(createDiagnostic(path, property.type, "unsupported_property"));
            return;
        }

        diagnostics.push(createDiagnostic(path, property.type, "unknown_property"));
    });

    return normalized.length > 0 ? normalized : undefined;
}

function normalizeArea(
    area: LegacyAreaInput,
    index: number,
    diagnostics: UnsupportedWamFeatureDiagnostic[],
): StandaloneAreaData {
    return {
        id: area.id,
        x: area.x,
        y: area.y,
        width: area.width,
        height: area.height,
        visible: area.visible,
        name: area.name,
        properties: normalizeAreaProperties(area.properties, `areas[${index}]`, diagnostics),
    };
}

function normalizeEntity(
    entity: LegacyEntityInput,
    entityId: string,
    diagnostics: UnsupportedWamFeatureDiagnostic[],
): StandaloneWamEntityData {
    return {
        x: entity.x,
        y: entity.y,
        name: entity.name,
        properties: normalizeEntityProperties(entity.properties ?? [], `entities.${entityId}`, diagnostics),
        prefabRef: entity.prefabRef,
    };
}

function collectUnsupportedSettings(
    settings: unknown,
    diagnostics: UnsupportedWamFeatureDiagnostic[],
): void {
    if (!settings || typeof settings !== "object") {
        return;
    }

    for (const key of Object.keys(settings as Record<string, unknown>)) {
        diagnostics.push(createDiagnostic(`settings.${key}`, key, "unsupported_setting"));
    }
}

export function normalizeStandaloneWam(input: unknown): NormalizeResult {
    const parsed = LegacyWamInputSchema.parse(input);
    const diagnostics: UnsupportedWamFeatureDiagnostic[] = [];

    const areas = parsed.areas.map((area, index) => normalizeArea(area, index, diagnostics));
    const entities = Object.fromEntries(
        Object.entries(parsed.entities).map(([entityId, entity]) => [entityId, normalizeEntity(entity, entityId, diagnostics)]),
    );

    collectUnsupportedSettings(parsed.settings, diagnostics);

    return {
        wam: StandaloneWamFileFormat.parse({
            version: "2.1.0",
            mapUrl: parsed.mapUrl,
            entities,
            areas,
            entityCollections: parsed.entityCollections,
            lastCommandId: parsed.lastCommandId,
            metadata: parsed.metadata,
            vendor: parsed.vendor,
        }),
        diagnostics,
    };
}

export function storageDtoToStandaloneWam(input: WAMFileFormat): NormalizeResult {
    return normalizeStandaloneWam(input);
}

export function standaloneWamToStorageDto(wam: StandaloneWamFileFormatType): WAMFileFormat {
    return WAMStorageDtoSchema.parse(structuredClone(wam));
}
