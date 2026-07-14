import type * as Phaser from "phaser";
import type { SuperLoaderPlugin } from "../../front/Phaser/Services/SuperLoaderPlugin";
import type { CharacterNameLayer } from "./CharacterNameLayer";

export interface CharacterRuntimeHost {
    readonly phaserScene: Phaser.Scene;
    readonly superLoad: SuperLoaderPlugin;
    readonly usernameLayer: CharacterNameLayer;
    readonly sceneId: string;

    markDirty(): void;
}
