import type { WorldEvent } from "@workadventure/world-command";
import type { WorldCommandGateway } from "../commands/WorldCommandGateway";

type WorldCommandDebugApi = {
    execute(command: unknown, options?: { timeoutMs?: number }): Promise<unknown>;
    cancel(commandId: string): boolean;
    listActiveCommands(): unknown[];
    getEvents(): WorldEvent[];
};

declare global {
    interface Window {
        worldCommandDebug?: WorldCommandDebugApi;
    }
}

const debugEventsBuffer: WorldEvent[] = [];
const MAX_DEBUG_EVENT_BUFFER = 500;
let subscribedDebugGateway: unknown;
let unsubscribeDebugGateway: (() => void) | undefined;

export function installWorldCommandDebugBridge(gateway: WorldCommandGateway): { destroy(): void } {
    ensureDebugEventSubscription(gateway);

    window.worldCommandDebug = {
        execute: (command, options) => gateway.execute(command, options),
        cancel: (commandId) => gateway.cancel(commandId),
        listActiveCommands: () => toJson(gateway.listActiveCommands()),
        getEvents: () => toJson(debugEventsBuffer),
    };

    return {
        destroy() {
            delete window.worldCommandDebug;
        },
    };
}

function ensureDebugEventSubscription(gateway: WorldCommandGateway): void {
    if (subscribedDebugGateway === gateway) {
        return;
    }
    unsubscribeDebugGateway?.();
    subscribedDebugGateway = gateway;
    unsubscribeDebugGateway = gateway.subscribe((event) => {
        debugEventsBuffer.push(toJson(event));
        if (debugEventsBuffer.length > MAX_DEBUG_EVENT_BUFFER) {
            debugEventsBuffer.shift();
        }
    });
}

function toJson<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}
