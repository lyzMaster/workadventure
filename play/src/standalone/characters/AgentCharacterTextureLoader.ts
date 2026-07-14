import type { CharacterAppearance, CharacterTexture } from "@workadventure/game-model";
import type { CharacterRuntimeHost } from "./CharacterRuntimeHost";

export interface AgentCharacterTextureLoader {
    load(appearance: CharacterAppearance): Promise<string[]>;
}

export class PhaserAgentCharacterTextureLoader implements AgentCharacterTextureLoader {
    public constructor(private readonly host: CharacterRuntimeHost) {}

    public async load(appearance: CharacterAppearance): Promise<string[]> {
        const textures = this.sortTextures(appearance.textures);
        if (textures.length < 1) {
            throw new Error("Agent appearance must contain at least one texture");
        }

        const textureKeys: string[] = [];
        for (const texture of textures) {
            const url = this.resolveLocalUrl(texture);
            if (!this.host.phaserScene.textures.exists(texture.id)) {
                await this.host.superLoad.spritesheet(texture.id, url.toString(), {
                    frameWidth: 32,
                    frameHeight: 32,
                });
            }
            textureKeys.push(texture.id);
        }
        return textureKeys;
    }

    private sortTextures(textures: CharacterTexture[]): CharacterTexture[] {
        return textures
            .map((texture, index) => ({ texture, index }))
            .sort((a, b) => (a.texture.layer ?? a.index) - (b.texture.layer ?? b.index) || a.index - b.index)
            .map(({ texture }) => texture);
    }

    private resolveLocalUrl(texture: CharacterTexture): URL {
        const base = window.location.href;
        const url = new URL(texture.url, base);
        if (url.origin !== new URL(base).origin) {
            throw new Error(`Refusing to load remote agent texture: ${texture.url}`);
        }
        return url;
    }
}
