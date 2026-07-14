export class Deferred<T> {
    public readonly promise: Promise<T>;
    private resolveCallback!: (value: T | PromiseLike<T>) => void;
    private rejectCallback!: (reason?: unknown) => void;

    public constructor() {
        this.promise = new Promise<T>((resolve, reject) => {
            this.resolveCallback = resolve;
            this.rejectCallback = reject;
        });
    }

    public resolve(value: T): void {
        this.resolveCallback(value);
    }

    public reject(reason?: unknown): void {
        this.rejectCallback(reason);
    }
}
