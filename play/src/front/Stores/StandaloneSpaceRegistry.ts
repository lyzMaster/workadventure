import { readable, writable, type Readable } from "svelte/store";

type StandaloneSpaceOptions = {
    canRecord?: boolean;
    metadata?: Map<string, unknown>;
};

export class StandaloneSpace {
    public readonly users = readable([]);
    public readonly userCount = readable(0);
    public readonly metadata = writable<Map<string, unknown>>(new Map());
    public readonly canRecord = writable(false);

    public constructor(
        public readonly name: string,
        options?: StandaloneSpaceOptions,
    ) {
        this.metadata.set(options?.metadata ?? new Map());
        this.canRecord.set(options?.canRecord ?? false);
    }

    public getName(): string {
        return this.name;
    }

    public setCanRecord(canRecord: boolean): void {
        this.canRecord.set(canRecord);
    }
}

export class StandaloneSpaceRegistry {
    public readonly videoStreamStore = writable(undefined);
    public readonly screenShareStreamStore = writable(undefined);
    public readonly isLiveStreamingStore = writable(false);
    public readonly shouldPublishScreenShareStore = writable(false);

    public joinSpace(
        spaceName: string,
        _filterType?: unknown,
        _propertiesToSync?: string[],
        _signal?: AbortSignal,
        options?: StandaloneSpaceOptions,
    ): Promise<StandaloneSpace> {
        return Promise.resolve(new StandaloneSpace(spaceName, options));
    }

    public leaveSpace(_space: StandaloneSpace): Promise<void> {
        return Promise.resolve();
    }

    public destroy(): Promise<void> {
        return Promise.resolve();
    }
}

export class StandaloneSpaceScriptingBridgeService {
    public constructor(..._unused: unknown[]) {}
}

export type StandaloneSpaceRegistryInterface = StandaloneSpaceRegistry;
export type StandaloneSpaceInterface = StandaloneSpace;
export type StandaloneReadable<T> = Readable<T>;
