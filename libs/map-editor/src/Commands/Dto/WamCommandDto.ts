import type { WAMSettings } from "../../types";

export type WamCommandDto = UpdateWamSettingsCommandDto | UpdateWamMetadataCommandDto;

export interface WamCommandBaseDto {
    commandId: string;
    sceneId: string;
}

export interface UpdateWamSettingsCommandDto extends WamCommandBaseDto {
    type: "wam.settings.update";
    message: Partial<WAMSettings>;
}

export interface UpdateWamMetadataCommandDto extends WamCommandBaseDto {
    type: "wam.metadata.update";
    name?: string;
    description?: string;
    copyright?: string;
    thumbnail?: string;
    tags?: string;
}
