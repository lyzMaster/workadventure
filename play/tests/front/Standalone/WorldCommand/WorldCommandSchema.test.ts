import { describe, expect, it } from "vitest";
import {
    AgentCommandSchema,
    WorldCommandResultSchema,
    WorldEventSchema,
    parseWorldCommand,
} from "@workadventure/world-command";

describe("WorldCommand schema", () => {
    it("accepts a valid agent spawn command", () => {
        const command = parseWorldCommand({
            schemaVersion: 1,
            commandId: "cmd-agent-spawn-1",
            type: "agent.spawn",
            sceneId: "home",
            payload: {
                characterId: "agent-a",
                name: "Agent A",
                sceneId: "home",
                appearance: {
                    textures: [{ id: "tex-1", url: "/resources/characters/a.png", layer: 0 }],
                },
                spawnPosition: { x: 32, y: 64, direction: "down", moving: false },
            },
        });

        expect(command.type).toBe("agent.spawn");
    });

    it("rejects an unknown command type", () => {
        expect(() =>
            parseWorldCommand({
                schemaVersion: 1,
                commandId: "cmd-unknown",
                type: "agent.dance",
                payload: {},
            }),
        ).toThrow();
    });

    it("rejects missing commandId", () => {
        expect(() =>
            parseWorldCommand({
                schemaVersion: 1,
                type: "agent.list",
                payload: {},
            }),
        ).toThrow();
    });

    it("rejects an empty commandId", () => {
        expect(() =>
            parseWorldCommand({
                schemaVersion: 1,
                commandId: "   ",
                type: "agent.list",
                payload: {},
            }),
        ).toThrow();
    });

    it("rejects an invalid direction", () => {
        expect(() =>
            AgentCommandSchema.parse({
                schemaVersion: 1,
                commandId: "cmd-face-invalid",
                type: "agent.face",
                payload: {
                    characterId: "agent-a",
                    direction: "north",
                },
            }),
        ).toThrow();
    });

    it("rejects invalid coordinates", () => {
        expect(() =>
            parseWorldCommand({
                schemaVersion: 1,
                commandId: "cmd-bad-coords",
                type: "agent.moveTo",
                payload: {
                    characterId: "agent-a",
                    target: { x: Number.NaN, y: 10 },
                },
            }),
        ).toThrow();
    });

    it("rejects extra fields with strict schemas", () => {
        expect(() =>
            parseWorldCommand({
                schemaVersion: 1,
                commandId: "cmd-extra-field",
                type: "history.undo",
                payload: {
                    extra: true,
                },
            }),
        ).toThrow();
    });

    it("round-trips results as JSON", () => {
        const result = WorldCommandResultSchema.parse({
            schemaVersion: 1,
            commandId: "cmd-result",
            type: "scene.getState",
            status: "succeeded",
            sceneId: "home",
            startedAt: "2026-07-14T00:00:00.000Z",
            finishedAt: "2026-07-14T00:00:00.100Z",
            data: {
                activeSceneId: "home",
                loading: false,
            },
        });

        expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    });

    it("round-trips events as JSON", () => {
        const event = WorldEventSchema.parse({
            schemaVersion: 1,
            eventId: "evt-1",
            type: "agent.moved",
            timestamp: "2026-07-14T00:00:00.000Z",
            commandId: "cmd-move",
            sceneId: "home",
            data: {
                characterId: "agent-a",
                motionState: "idle",
                position: { x: 64, y: 96, direction: "left", moving: false },
            },
        });

        expect(JSON.parse(JSON.stringify(event))).toEqual(event);
    });
});
