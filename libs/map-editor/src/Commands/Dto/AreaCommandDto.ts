import type { AreaData, AtLeast } from "../../types";

export type AreaCommandDto = CreateAreaCommandDto | UpdateAreaCommandDto | DeleteAreaCommandDto;

export interface AreaCommandBaseDto {
    commandId: string;
    sceneId: string;
}

export interface CreateAreaCommandDto extends AreaCommandBaseDto {
    type: "area.create";
    area: AreaData;
}

export interface UpdateAreaCommandDto extends AreaCommandBaseDto {
    type: "area.update";
    areaId: string;
    patch: AtLeast<AreaData, "id">;
}

export interface DeleteAreaCommandDto extends AreaCommandBaseDto {
    type: "area.delete";
    areaId: string;
}
