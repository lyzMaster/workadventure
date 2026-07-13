export type StandaloneSceneId = "home" | "office";

export interface StandaloneSceneSpawn {
    x: number;
    y: number;
    direction?: "up" | "right" | "down" | "left";
}

export interface StandaloneSceneDefinition {
    sceneId: StandaloneSceneId;
    displayName: string;
    baseMapId: string;
    baseMapRevision: number;
    wamUrl: string;
    defaultSpawn?: StandaloneSceneSpawn;
}
