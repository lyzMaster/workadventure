import type { EntityDimensions, WAMEntityData } from "../../types";

export type EntityCommandDto =
    | CreateEntityCommandDto
    | UpdateEntityCommandDto
    | DeleteEntityCommandDto
    | UploadEntityCommandDto
    | ModifyCustomEntityCommandDto
    | DeleteCustomEntityCommandDto;

export interface EntityCommandBaseDto {
    commandId: string;
    sceneId: string;
}

export interface CreateEntityCommandDto extends EntityCommandBaseDto {
    type: "entity.create";
    entityId: string;
    entity: WAMEntityData;
    dimensions?: EntityDimensions;
}

export interface UpdateEntityCommandDto extends EntityCommandBaseDto {
    type: "entity.update";
    entityId: string;
    patch: Partial<WAMEntityData>;
    dimensions?: EntityDimensions;
}

export interface DeleteEntityCommandDto extends EntityCommandBaseDto {
    type: "entity.delete";
    entityId: string;
    entity?: WAMEntityData;
    dimensions?: EntityDimensions;
}

export type CustomEntityDirection = "up" | "right" | "down" | "left";

export interface UploadEntityCommandDto extends EntityCommandBaseDto {
    type: "entity.upload";
    id: string;
    file?: Uint8Array;
    name: string;
    imagePath: string;
    direction: CustomEntityDirection;
    tags: string[];
    collectionName?: string;
    collisionGrid?: number[][];
    depthOffset?: number;
    color?: string;
}

export interface ModifyCustomEntityCommandDto extends EntityCommandBaseDto {
    type: "entity.custom.modify";
    id: string;
    name?: string;
    tags?: string[];
    depthOffset?: number;
    collisionGrid?: number[][];
}

export interface DeleteCustomEntityCommandDto extends EntityCommandBaseDto {
    type: "entity.custom.delete";
    id: string;
}
