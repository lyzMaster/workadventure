import type { AreaCommandDto } from "./AreaCommandDto";
import type { EntityCommandDto } from "./EntityCommandDto";
import type { UploadFileCommandDto } from "./FileCommandDto";
import type { WamCommandDto } from "./WamCommandDto";

export type LocalMapEditorCommand = AreaCommandDto | EntityCommandDto | UploadFileCommandDto | WamCommandDto;

export * from "./AreaCommandDto";
export * from "./EntityCommandDto";
export * from "./FileCommandDto";
export * from "./WamCommandDto";
