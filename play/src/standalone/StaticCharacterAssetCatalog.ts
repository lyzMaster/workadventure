import type { WokaTextureDescriptionInterface } from "../front/Phaser/Entity/PlayerTextures";

export class StaticCharacterAssetCatalog {
    private readonly assets: ReadonlyMap<string, WokaTextureDescriptionInterface> = new Map([
        [
            "standalone-player",
            {
                id: "standalone-player",
                url: "/resources/characters/pipoya/Male%2001-1.png",
            },
        ],
    ]);

    public resolve(textureIds: string[]): WokaTextureDescriptionInterface[] {
        return textureIds.map((textureId) => {
            const asset = this.assets.get(textureId);
            if (!asset) {
                throw new Error(`Unknown standalone character texture: ${textureId}`);
            }
            return asset;
        });
    }
}
