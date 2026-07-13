import { DefaultStandaloneSceneController } from "./StandaloneSceneController";

export class StandaloneBootstrap {
    public constructor(private readonly sceneController = new DefaultStandaloneSceneController()) {}

    public start(): void {
        this.sceneController.start().catch((error) => {
            console.error("[Standalone] scene_load_failed: unable to start standalone scene", error);
        });
    }
}
