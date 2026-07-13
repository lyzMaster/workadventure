export const mediaManager = {
    setUserInputManager(_manager: unknown): void {},
    disableMyCamera(): void {},
    disableMyMicrophone(): void {},
    enableMyCamera(): void {},
    enableMyMicrophone(): void {},
    disableProximityMeeting(): void {},
    enableProximityMeeting(): void {},
};

export const iceServersManager = {
    init(..._unused: unknown[]): void {},
    finalize(): void {},
    getIceServersConfig(): Promise<[]> {
        return Promise.resolve([]);
    },
};

export const audioContextManager = {
    getContext(_sampleRate?: number): AudioContext {
        return new AudioContext();
    },
};

export function checkCoturnServer(): Promise<void> {
    return Promise.resolve();
}
