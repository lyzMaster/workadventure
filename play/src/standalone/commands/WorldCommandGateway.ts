import {
    WORLD_COMMAND_SCHEMA_VERSION,
    WorldCommandResultSchema,
    WorldCommandSchema,
    WorldCommandTypeSchema,
    type WorldCommand,
    type WorldCommandError,
    type WorldCommandErrorCode,
    type WorldCommandResult,
    type WorldCommandStatus,
    type WorldCommandType,
    type WorldEvent,
} from "@workadventure/world-command";
import type { AgentActionErrorCode, AgentActionResult, AgentCharacterSnapshot } from "@workadventure/game-model";
import type { ZodIssue } from "zod";
import type { ActiveCommandSnapshot, ActiveSceneRuntimeProvider, WorldSceneRuntime } from "./types";

export interface WorldCommandGatewayOptions {
    resultCacheLimit?: number;
    now?: () => Date;
    createId?: () => string;
}

export interface WorldCommandGateway {
    execute(input: unknown, options?: { signal?: AbortSignal; timeoutMs?: number }): Promise<WorldCommandResult>;
    cancel(commandId: string): boolean;
    subscribe(listener: (event: WorldEvent) => void): () => void;
    listActiveCommands(): ActiveCommandSnapshot[];
    destroy(): void;
}

interface ActiveCommandRecord {
    command: WorldCommand;
    fingerprint: string;
    startedAt: string;
    controller: AbortController;
    promise: Promise<WorldCommandResult>;
    cancelHandlers: Set<() => void>;
    sceneScoped: boolean;
    abortReason?: "cancelled" | "timeout" | "gateway_destroyed";
}

interface CompletedCommandRecord {
    fingerprint: string;
    result: WorldCommandResult;
}

type LaneKey = string;

const DEFAULT_RESULT_CACHE_LIMIT = 200;

export class DefaultWorldCommandGateway implements WorldCommandGateway {
    private readonly resultCacheLimit: number;
    private readonly now: () => Date;
    private readonly createId: () => string;
    private readonly listeners = new Set<(event: WorldEvent) => void>();
    private readonly activeCommands = new Map<string, ActiveCommandRecord>();
    private readonly completedCommands = new Map<string, CompletedCommandRecord>();
    private readonly lanes = new Map<LaneKey, Promise<unknown>>();
    private destroyed = false;
    private sceneSwitchInProgress = false;

    public constructor(
        private readonly runtimeProvider: ActiveSceneRuntimeProvider,
        options: WorldCommandGatewayOptions = {},
    ) {
        this.resultCacheLimit = options.resultCacheLimit ?? DEFAULT_RESULT_CACHE_LIMIT;
        this.now = options.now ?? (() => new Date());
        this.createId =
            options.createId ??
            (() => globalThis.crypto?.randomUUID?.() ?? `world-event-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    }

    public execute(input: unknown, options: { signal?: AbortSignal; timeoutMs?: number } = {}): Promise<WorldCommandResult> {
        const parsed = WorldCommandSchema.safeParse(input);
        if (!parsed.success) {
            const commandId = this.extractCommandId(input);
            const type = this.extractCommandType(input);
            const startedAt = this.timestamp();
            return Promise.resolve(
                this.makeResult({
                    commandId,
                    type,
                    sceneId: this.extractSceneId(input),
                    startedAt,
                    status: "failed",
                    error: {
                        code: "invalid_command",
                        message: parsed.error.issues.map((issue: ZodIssue) => issue.message).join("; "),
                    },
                }),
            );
        }

        const command = parsed.data;
        const fingerprint = stableJson(command);
        const active = this.activeCommands.get(command.commandId);
        if (active) {
            if (active.fingerprint !== fingerprint) {
                return Promise.resolve(this.duplicateConflict(command));
            }
            return active.promise;
        }
        const completed = this.completedCommands.get(command.commandId);
        if (completed) {
            if (completed.fingerprint !== fingerprint) {
                return Promise.resolve(this.duplicateConflict(command));
            }
            return Promise.resolve(completed.result);
        }

        if (this.destroyed) {
            return Promise.resolve(
                this.makeFailedResult(command, "gateway_destroyed", "World command gateway was destroyed"),
            );
        }

        const startedAt = this.timestamp();
        const controller = new AbortController();
        const cancelHandlers = new Set<() => void>();
        const sceneScoped = command.type !== "scene.switch";
        const record: ActiveCommandRecord = {
            command,
            fingerprint,
            startedAt,
            controller,
            cancelHandlers,
            sceneScoped,
            abortReason: undefined,
            promise: Promise.resolve(undefined as never),
        };

        this.publish("command.accepted", command, command.sceneId ?? this.runtimeProvider.getActiveSceneId() ?? "unknown");
        record.promise = this.runCommand(record, options)
            .then((result) => this.cacheTerminalResult(command.commandId, fingerprint, result))
            .finally(() => {
                this.activeCommands.delete(command.commandId);
            });
        this.activeCommands.set(command.commandId, record);
        return record.promise;
    }

    public cancel(commandId: string): boolean {
        const active = this.activeCommands.get(commandId);
        if (!active) {
            return false;
        }
        active.abortReason = "cancelled";
        active.controller.abort();
        for (const handler of active.cancelHandlers) {
            handler();
        }
        return true;
    }

    public subscribe(listener: (event: WorldEvent) => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    public listActiveCommands(): ActiveCommandSnapshot[] {
        return [...this.activeCommands.values()].map((record) => ({
            commandId: record.command.commandId,
            type: record.command.type,
            sceneId: record.command.sceneId,
            startedAt: record.startedAt,
        }));
    }

    public destroy(): void {
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;
        for (const record of this.activeCommands.values()) {
            record.abortReason = "gateway_destroyed";
            record.controller.abort();
            for (const handler of record.cancelHandlers) {
                handler();
            }
        }
        this.listeners.clear();
    }

    private async runCommand(
        record: ActiveCommandRecord,
        options: { signal?: AbortSignal; timeoutMs?: number },
    ): Promise<WorldCommandResult> {
        const command = record.command;
        const runtimeSceneId = command.type === "scene.switch" ? this.runtimeProvider.getActiveSceneId() : undefined;
        const sceneId = command.sceneId ?? runtimeSceneId ?? this.runtimeProvider.getActiveSceneId() ?? undefined;

        const cleanupSignal = this.bindExternalSignal(record, options.signal);
        const cleanupTimeout = this.bindTimeout(record, options.timeoutMs);
        try {
            if (record.controller.signal.aborted) {
                return this.makeAbortedResult(command, record.startedAt, sceneId, record.abortReason ?? "cancelled");
            }
            this.publish("command.started", command, sceneId ?? "unknown");
            const result = await this.executeCommand(record);
            const parsed = WorldCommandResultSchema.parse(result);
            this.publishTerminalEvent(command, parsed);
            return parsed;
        } catch (error) {
            if (record.controller.signal.aborted) {
                const result = this.makeAbortedResult(
                    command,
                    record.startedAt,
                    sceneId,
                    record.abortReason ?? "cancelled",
                );
                this.publishTerminalEvent(command, result);
                return result;
            }
            const result = this.makeResult({
                commandId: command.commandId,
                type: command.type,
                sceneId,
                startedAt: record.startedAt,
                status: "failed",
                error: this.normalizeError(error),
            });
            this.publishTerminalEvent(command, result);
            console.error("[Standalone] world_command_failed", { commandId: command.commandId, type: command.type, error });
            return result;
        } finally {
            cleanupTimeout();
            cleanupSignal();
        }
    }

    private async executeCommand(record: ActiveCommandRecord): Promise<WorldCommandResult> {
        const command = record.command;
        if (command.type === "scene.getState") {
            return this.success(command, record.startedAt, this.runtimeProvider.getSceneStateSnapshot());
        }
        if (command.type === "scene.switch") {
            return this.runSceneSwitch(record);
        }
        if (this.sceneSwitchInProgress || this.runtimeProvider.isTransitionInProgress()) {
            return this.makeFailedResult(command, "transition_in_progress", "A scene transition is in progress", record.startedAt);
        }

        const runtime = this.resolveRuntime(command);
        if (!runtime.ok) {
            return runtime.result(record.startedAt);
        }

        const lane = this.resolveLane(command);
        const operation = () => this.executeAgainstRuntime(record, runtime.runtime);
        return lane ? this.enqueueLane(lane, operation) : operation();
    }

    private async executeAgainstRuntime(
        record: ActiveCommandRecord,
        runtime: WorldSceneRuntime,
    ): Promise<WorldCommandResult> {
        const command = record.command;
        switch (command.type) {
            case "agent.spawn":
                record.cancelHandlers.add(() => undefined);
                return this.fromAgentResult(
                    command,
                    record.startedAt,
                    await runtime.agentCommands.spawn(command.payload, { signal: record.controller.signal }),
                    record,
                    "agent.spawned",
                );
            case "agent.list":
                return this.fromAgentResult(command, record.startedAt, runtime.agentCommands.list(), record);
            case "agent.getState":
                return this.fromAgentResult(
                    command,
                    record.startedAt,
                    runtime.agentCommands.getState(command.payload.characterId),
                    record,
                );
            case "agent.moveTo":
                record.cancelHandlers.add(() => runtime.agentCommands.cancelMove(command.payload.characterId));
                return this.fromAgentResult(
                    command,
                    record.startedAt,
                    await runtime.agentCommands.moveTo(command.payload.characterId, command.payload.target, command.payload.options),
                    record,
                    "agent.moved",
                );
            case "agent.stop":
                return this.fromAgentResult(
                    command,
                    record.startedAt,
                    runtime.agentCommands.stop(command.payload.characterId),
                    record,
                    "agent.stopped",
                );
            case "agent.face":
                return this.fromAgentResult(
                    command,
                    record.startedAt,
                    runtime.agentCommands.face(command.payload.characterId, command.payload.direction),
                    record,
                    "agent.faced",
                );
            case "agent.speak":
                return this.fromAgentResult(
                    command,
                    record.startedAt,
                    runtime.agentCommands.speak(command.payload.characterId, command.payload.text, command.payload.type),
                    record,
                    "agent.spoke",
                    { text: command.payload.text, sayType: command.payload.type },
                );
            case "agent.clearSpeech":
                return this.fromAgentResult(
                    command,
                    record.startedAt,
                    runtime.agentCommands.clearSpeech(command.payload.characterId),
                    record,
                    "agent.spoke",
                );
            case "agent.remove":
                return this.fromAgentResult(
                    command,
                    record.startedAt,
                    runtime.agentCommands.remove(command.payload.characterId),
                    record,
                    "agent.removed",
                );
            case "furniture.listCatalog":
                return this.success(command, record.startedAt, await runtime.furnitureCommands.listCatalog());
            case "furniture.list":
                return this.success(command, record.startedAt, runtime.furnitureCommands.list());
            case "furniture.getState": {
                const entity = runtime.furnitureCommands.getState(command.payload.entityId);
                return entity
                    ? this.success(command, record.startedAt, entity)
                    : this.makeFailedResult(command, "entity_not_found", `Entity "${command.payload.entityId}" was not found`, record.startedAt);
            }
            case "furniture.place":
                return this.fromFurnitureResult(
                    command,
                    record.startedAt,
                    await runtime.furnitureCommands.place({
                        ...command.payload,
                        entityId: command.payload.entityId ?? stableEntityId(command.commandId),
                    }),
                    "furniture.placed",
                );
            case "furniture.move":
                return this.fromFurnitureResult(
                    command,
                    record.startedAt,
                    await runtime.furnitureCommands.move(command.payload.entityId, command.payload.position),
                    "furniture.moved",
                );
            case "furniture.setVariant":
                return this.fromFurnitureResult(
                    command,
                    record.startedAt,
                    await runtime.furnitureCommands.setVariant(command.payload.entityId, command.payload.prefab),
                    "furniture.updated",
                );
            case "furniture.remove":
                return this.fromFurnitureResult(
                    command,
                    record.startedAt,
                    await runtime.furnitureCommands.remove(command.payload.entityId),
                    "furniture.removed",
                );
            case "history.undo":
                return this.fromHistoryResult(command, record.startedAt, await runtime.historyCommands.undo());
            case "history.redo":
                return this.fromHistoryResult(command, record.startedAt, await runtime.historyCommands.redo());
            case "world.flush":
                await runtime.flush();
                return this.success(command, record.startedAt, { flushed: true });
            default:
                return this.makeFailedResult(command, "unsupported_command", `Unsupported command ${command.type}`, record.startedAt);
        }
    }

    private async runSceneSwitch(record: ActiveCommandRecord): Promise<WorldCommandResult> {
        const command = record.command as Extract<WorldCommand, { type: "scene.switch" }>;
        if (this.sceneSwitchInProgress) {
            return this.makeFailedResult(command, "transition_in_progress", "A scene transition is in progress", record.startedAt);
        }
        const previousSceneId = this.runtimeProvider.getActiveSceneId();
        if (previousSceneId === command.payload.sceneId) {
            return this.success(command, record.startedAt, this.runtimeProvider.getSceneStateSnapshot(), previousSceneId ?? undefined);
        }

        this.sceneSwitchInProgress = true;
        try {
            this.cancelSceneScopedCommands(command.commandId);
            await this.runtimeProvider.getActiveRuntime()?.flush();
            await this.runtimeProvider.switchScene(command.payload.sceneId);
            const nextSceneId = this.runtimeProvider.getActiveSceneId() ?? command.payload.sceneId;
            this.publish("scene.changed", command, nextSceneId, {
                previousSceneId,
                nextSceneId,
            });
            return this.success(command, record.startedAt, this.runtimeProvider.getSceneStateSnapshot(), nextSceneId);
        } finally {
            this.sceneSwitchInProgress = false;
        }
    }

    private resolveRuntime(command: WorldCommand):
        | { ok: true; runtime: WorldSceneRuntime }
        | { ok: false; result: (startedAt: string) => WorldCommandResult } {
        const runtime = this.runtimeProvider.getActiveRuntime();
        if (!runtime) {
            return {
                ok: false,
                result: (startedAt) =>
                    this.makeFailedResult(command, "scene_not_loaded", "No active scene runtime is loaded", startedAt),
            };
        }
        if (command.sceneId && command.sceneId !== runtime.sceneId) {
            return {
                ok: false,
                result: (startedAt) =>
                    this.makeFailedResult(
                        command,
                        "scene_mismatch",
                        `Command targets scene "${command.sceneId}" but active scene is "${runtime.sceneId}"`,
                        startedAt,
                    ),
            };
        }
        return { ok: true, runtime };
    }

    private resolveLane(command: WorldCommand): LaneKey | undefined {
        if (command.type.startsWith("furniture.") || command.type.startsWith("history.") || command.type === "world.flush") {
            return `scene:${command.sceneId ?? this.runtimeProvider.getActiveSceneId() ?? "unknown"}:furniture`;
        }
        return undefined;
    }

    private async enqueueLane<T>(lane: LaneKey, operation: () => Promise<T>): Promise<T> {
        const previous = this.lanes.get(lane) ?? Promise.resolve();
        const next = previous.then(operation, operation);
        this.lanes.set(
            lane,
            next.finally(() => {
                if (this.lanes.get(lane) === next) {
                    this.lanes.delete(lane);
                }
            }),
        );
        return next;
    }

    private fromAgentResult(
        command: WorldCommand,
        startedAt: string,
        result: AgentActionResult<unknown>,
        record: ActiveCommandRecord,
        eventType?: WorldEvent["type"],
        eventExtra?: Record<string, unknown>,
    ): WorldCommandResult {
        if (record.controller.signal.aborted) {
            return this.makeAbortedResult(
                command,
                startedAt,
                command.sceneId ?? this.runtimeProvider.getActiveSceneId() ?? undefined,
                record.abortReason ?? "cancelled",
            );
        }
        if (!result.ok) {
            const status = result.code === "cancelled" ? "cancelled" : result.code === "timeout" ? "timed_out" : "failed";
            return this.makeResult({
                commandId: command.commandId,
                type: command.type,
                sceneId: command.sceneId ?? this.runtimeProvider.getActiveSceneId() ?? undefined,
                startedAt,
                status,
                error: { code: this.mapAgentError(result.code), message: result.message },
            });
        }
        if (eventType) {
            this.publish(eventType, command, command.sceneId ?? this.runtimeProvider.getActiveSceneId() ?? "unknown", {
                ...this.agentEventData(result.value),
                ...eventExtra,
            });
        }
        return this.success(command, startedAt, result.value);
    }

    private fromFurnitureResult(
        command: WorldCommand,
        startedAt: string,
        result: { ok: true; value: unknown } | { ok: false; code: WorldCommandErrorCode; message: string },
        eventType: WorldEvent["type"],
    ): WorldCommandResult {
        if (!result.ok) {
            return this.makeResult({
                commandId: command.commandId,
                type: command.type,
                sceneId: command.sceneId ?? this.runtimeProvider.getActiveSceneId() ?? undefined,
                startedAt,
                status: "failed",
                error: { code: result.code, message: result.message },
            });
        }
        const value = result.value as { id?: string; x?: number; y?: number; prefab?: { prefabId: string; collectionName: string } };
        this.publish(eventType, command, command.sceneId ?? this.runtimeProvider.getActiveSceneId() ?? "unknown", {
            entityId: value.id ?? "",
            prefabId: value.prefab?.prefabId,
            collectionName: value.prefab?.collectionName,
            position: typeof value.x === "number" && typeof value.y === "number" ? { x: value.x, y: value.y } : undefined,
        });
        return this.success(command, startedAt, result.value);
    }

    private fromHistoryResult(
        command: WorldCommand,
        startedAt: string,
        result: { ok: true; value: unknown } | { ok: false; code: WorldCommandErrorCode; message: string },
    ): WorldCommandResult {
        return result.ok
            ? this.success(command, startedAt, result.value)
            : this.makeResult({
                  commandId: command.commandId,
                  type: command.type,
                  sceneId: command.sceneId ?? this.runtimeProvider.getActiveSceneId() ?? undefined,
                  startedAt,
                  status: "failed",
                  error: { code: result.code, message: result.message },
              });
    }

    private success(command: WorldCommand, startedAt: string, data: unknown, sceneId?: string): WorldCommandResult {
        return this.makeResult({
            commandId: command.commandId,
            type: command.type,
            sceneId: sceneId ?? command.sceneId ?? this.runtimeProvider.getActiveSceneId() ?? undefined,
            startedAt,
            status: "succeeded",
            data,
        });
    }

    private makeFailedResult(
        command: WorldCommand,
        code: WorldCommandErrorCode,
        message: string,
        startedAt = this.timestamp(),
    ): WorldCommandResult {
        return this.makeResult({
            commandId: command.commandId,
            type: command.type,
            sceneId: command.sceneId ?? this.runtimeProvider.getActiveSceneId() ?? undefined,
            startedAt,
            status: "failed",
            error: { code, message },
        });
    }

    private duplicateConflict(command: WorldCommand): WorldCommandResult {
        return this.makeFailedResult(
            command,
            "duplicate_command_conflict",
            `CommandId "${command.commandId}" was already used for a different command`,
        );
    }

    private makeAbortedResult(
        command: WorldCommand,
        startedAt: string,
        sceneId: string | undefined,
        reason: "cancelled" | "timeout" | "gateway_destroyed",
    ): WorldCommandResult {
        return this.makeResult({
            commandId: command.commandId,
            type: command.type,
            sceneId,
            startedAt,
            status: reason === "timeout" ? "timed_out" : "cancelled",
            error: {
                code: reason,
                message:
                    reason === "timeout"
                        ? "World command timed out"
                        : reason === "gateway_destroyed"
                          ? "World command gateway was destroyed"
                          : "World command was cancelled",
            },
        });
    }

    private makeResult(input: {
        commandId: string;
        type: WorldCommandType;
        sceneId?: string;
        startedAt: string;
        status: WorldCommandStatus;
        data?: unknown;
        error?: WorldCommandError;
    }): WorldCommandResult {
        const result: WorldCommandResult = {
            schemaVersion: WORLD_COMMAND_SCHEMA_VERSION,
            commandId: input.commandId,
            type: input.type,
            status: input.status,
            sceneId: input.sceneId,
            startedAt: input.startedAt,
            finishedAt: this.timestamp(),
            data: sanitizeJson(input.data),
            error: input.error ? sanitizeJson(input.error) : undefined,
        };
        return sanitizeJson(result);
    }

    private cacheTerminalResult(commandId: string, fingerprint: string, result: WorldCommandResult): WorldCommandResult {
        this.completedCommands.set(commandId, { fingerprint, result });
        while (this.completedCommands.size > this.resultCacheLimit) {
            const first = this.completedCommands.keys().next().value as string | undefined;
            if (!first) {
                break;
            }
            this.completedCommands.delete(first);
        }
        return result;
    }

    private cancelSceneScopedCommands(exceptCommandId: string): void {
        for (const record of this.activeCommands.values()) {
            if (record.command.commandId === exceptCommandId || !record.sceneScoped) {
                continue;
            }
            record.abortReason = "cancelled";
            record.controller.abort();
            for (const handler of record.cancelHandlers) {
                handler();
            }
        }
    }

    private bindExternalSignal(record: ActiveCommandRecord, signal?: AbortSignal): () => void {
        if (!signal) {
            return () => undefined;
        }
        const abort = () => {
            record.abortReason ??= "cancelled";
            record.controller.abort();
            for (const handler of record.cancelHandlers) {
                handler();
            }
        };
        signal.addEventListener("abort", abort, { once: true });
        if (signal.aborted) {
            abort();
        }
        return () => signal.removeEventListener("abort", abort);
    }

    private bindTimeout(record: ActiveCommandRecord, timeoutMs?: number): () => void {
        if (!timeoutMs) {
            return () => undefined;
        }
        const handle = setTimeout(() => {
            record.abortReason = "timeout";
            record.controller.abort();
            for (const handler of record.cancelHandlers) {
                handler();
            }
        }, timeoutMs);
        return () => clearTimeout(handle);
    }

    private publishTerminalEvent(command: WorldCommand, result: WorldCommandResult): void {
        if (result.status === "succeeded") {
            this.publish("command.succeeded", command, result.sceneId ?? "unknown", result.data);
            return;
        }
        if (result.status === "cancelled" || result.status === "timed_out") {
            this.publish("command.cancelled", command, result.sceneId ?? "unknown", {
                reason:
                    result.error?.code === "gateway_destroyed"
                        ? "gateway_destroyed"
                        : result.status === "timed_out"
                          ? "timeout"
                          : "cancelled",
            });
            return;
        }
        this.publish("command.failed", command, result.sceneId ?? "unknown", {
            code: result.error?.code ?? "command_failed",
            message: result.error?.message ?? "Command failed",
        });
    }

    private publish(type: WorldEvent["type"], command: WorldCommand, sceneId: string, data?: unknown): void {
        const event = sanitizeJson({
            schemaVersion: WORLD_COMMAND_SCHEMA_VERSION,
            eventId: this.createId(),
            type,
            timestamp: this.timestamp(),
            commandId: command.commandId,
            sceneId,
            data,
        }) as WorldEvent;
        for (const listener of this.listeners) {
            listener(event);
        }
    }

    private agentEventData(value: unknown): Record<string, unknown> {
        const snapshot = value as AgentCharacterSnapshot;
        return {
            characterId: snapshot.id,
            motionState: snapshot.motionState,
            position: snapshot.position,
        };
    }

    private mapAgentError(code: AgentActionErrorCode): WorldCommandErrorCode {
        if (code === "destroyed") {
            return "gateway_destroyed";
        }
        return code;
    }

    private normalizeError(error: unknown): WorldCommandError {
        if (error instanceof Error) {
            return { code: "command_failed", message: error.message };
        }
        return { code: "command_failed", message: String(error) };
    }

    private extractCommandId(input: unknown): string {
        return typeof input === "object" && input !== null && "commandId" in input && typeof input.commandId === "string"
            ? input.commandId
            : "invalid-command";
    }

    private extractCommandType(input: unknown): WorldCommandType {
        return typeof input === "object" &&
            input !== null &&
            "type" in input &&
            typeof input.type === "string" &&
            WorldCommandTypeSchema.safeParse(input.type).success
            ? (input.type as WorldCommandType)
            : "scene.getState";
    }

    private extractSceneId(input: unknown): string | undefined {
        return typeof input === "object" && input !== null && "sceneId" in input && typeof input.sceneId === "string"
            ? input.sceneId
            : undefined;
    }

    private timestamp(): string {
        return this.now().toISOString();
    }
}

function sanitizeJson<T>(value: T): T {
    if (value === undefined) {
        return value;
    }
    return JSON.parse(JSON.stringify(value)) as T;
}

function stableJson(value: unknown): string {
    return JSON.stringify(sortJson(value));
}

function sortJson(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(sortJson);
    }
    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([key, inner]) => [key, sortJson(inner)]),
        );
    }
    return value;
}

function stableEntityId(commandId: string): string {
    return `entity-${commandId.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 96)}`;
}
