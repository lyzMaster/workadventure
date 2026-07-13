export class CustomLogger {
    public constructor(private readonly namespace: string) {}
    public debug(...args: unknown[]): void {
        console.debug(this.namespace, ...args);
    }
    public info(...args: unknown[]): void {
        console.info(this.namespace, ...args);
    }
    public warn(...args: unknown[]): void {
        console.warn(this.namespace, ...args);
    }
    public error(...args: unknown[]): void {
        console.error(this.namespace, ...args);
    }
}

export const customMatrixLogger = new CustomLogger("matrix");
