import type * as Phaser from "phaser";

export type ResizableSceneLike = Phaser.Scene & {
    onResize(): void;
};

export function isResizableSceneLike(scene: Phaser.Scene): scene is ResizableSceneLike {
    return typeof (scene as Partial<ResizableSceneLike>).onResize === "function";
}
