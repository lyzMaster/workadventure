export interface ActivatableInterface {
    readonly activationRadius: number;
    isActivatable: () => boolean;
    activate: () => void;
    deactivate: () => void;
    getPosition: () => { x: number; y: number };
    playText(id: string, text: string, duration?: number, callback?: () => void): void;
    destroyText(id: string): void;
}

export function isActivatable(object: unknown): object is ActivatableInterface {
    return (
        typeof object === "object" &&
        object !== null &&
        "isActivatable" in object &&
        typeof object.isActivatable === "function" &&
        object.isActivatable()
    );
}
