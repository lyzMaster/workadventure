export interface UploadFileCommandDto {
    type: "file.upload";
    commandId: string;
    sceneId: string;
    name: string;
    file?: Uint8Array;
    url: string;
    mimeType?: string;
}
