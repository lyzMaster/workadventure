import type { WamFile } from "@workadventure/map-editor";
import type { FrontCommand } from "../front/Phaser/Game/MapEditor/Commands/FrontCommand";
import type { MapEditResult, MapEditTransport } from "../front/Phaser/Game/MapEditor/MapEditTransport";
import { createSceneOverlay } from "./SceneOverlay";
import type { SceneStorage } from "./SceneStorage";
import type { StandaloneSceneDefinition } from "./StandaloneSceneDefinition";

export class LocalMapEditTransport implements MapEditTransport {
    public readonly acknowledgement = "local" as const;
    private persistenceQueue: Promise<void> = Promise.resolve();

    public constructor(
        private readonly definition: StandaloneSceneDefinition,
        private readonly storage: SceneStorage,
        private readonly getWamFile: () => WamFile | undefined,
        private readonly baseEntityIds: readonly string[],
    ) {}

    public async submit(command: FrontCommand): Promise<MapEditResult> {
        const wamFile = this.getWamFile();
        if (!wamFile) {
            return {
                ok: false,
                commandId: command.commandId,
                code: "scene_not_loaded",
                message: "The standalone WAM is not loaded",
            };
        }
        try {
            command.toDto(this.definition.sceneId);
            const overlay = createSceneOverlay(this.definition, this.baseEntityIds, wamFile.getWam());
            if (overlay.sceneId !== this.definition.sceneId) {
                throw new Error(
                    `Overlay sceneId "${overlay.sceneId}" does not match active scene "${this.definition.sceneId}"`,
                );
            }
            await this.enqueuePersistence(() => this.storage.saveOverlay(this.definition.sceneId, overlay));
            return { ok: true, commandId: command.commandId };
        } catch (error) {
            return {
                ok: false,
                commandId: command.commandId,
                code: error instanceof Error && error.name === "ZodError" ? "validation_failed" : "persistence_failed",
                message: error instanceof Error ? error.message : String(error),
            };
        }
    }

    public async flush(): Promise<void> {
        await this.persistenceQueue;
    }

    private enqueuePersistence(operation: () => Promise<void>): Promise<void> {
        const next = this.persistenceQueue.then(operation, operation);
        this.persistenceQueue = next.catch(() => undefined);
        return next;
    }
}
