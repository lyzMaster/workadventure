export {};

if (typeof window !== "undefined" && typeof window.matchMedia === "undefined") {
    Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: (query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: () => undefined,
            removeListener: () => undefined,
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
            dispatchEvent: () => false,
        }),
    });
}

// jsdom does not implement CanvasRenderingContext2D; Phaser expects it during import.
// Provide a minimal stub so canvas feature detection does not crash in tests.
const createStubContext = () => {
    const data = new Uint8ClampedArray([0, 0, 0, 255]);
    return {
        fillStyle: "",
        globalCompositeOperation: "source-over",
        drawImage: () => undefined,
        fillRect: () => undefined,
        getImageData: () => ({ data }),
        putImageData: () => undefined,
    } as unknown as CanvasRenderingContext2D;
};

// @ts-ignore Override getContext to return our stub instead of throwing "not implemented".
HTMLCanvasElement.prototype.getContext = function getContext() {
    return createStubContext();
};

const PhaserModule = await import("phaser");
(globalThis as typeof globalThis & { Phaser: unknown }).Phaser = PhaserModule.default ?? PhaserModule;
