export type ApplicationDefinition = {
    name: string;
    description?: string;
    image?: string;
    default: boolean;
    enabled: boolean;
    forceNewTab: boolean;
    allowAPI: boolean;
    script?: string;
    doc?: string;
    regexUrl?: string;
    targetUrl?: string;
    policy?: string;
};

export class ApplicationManager {
    public readonly klaxoonToolClientId = undefined;
    public readonly excalidrawToolDomains: string[] = [];
    public readonly klaxoonToolActivated = false;
    public readonly youtubeToolActivated = false;
    public readonly googleDriveToolActivated = false;
    public readonly googleDocsToolActivated = false;
    public readonly googleSheetsToolActivated = false;
    public readonly googleSlidesToolActivated = false;
    public readonly eraserToolActivated = false;
    public readonly excalidrawToolActivated = false;
    public readonly cardsToolActivated = false;
    public readonly tldrawToolActivated = false;

    public constructor(public readonly applications: ApplicationDefinition[] = []) {}
}
