import { describe, expect, it } from "vitest";
import { Direction, type CharacterSnapshot } from "@workadventure/game-model";
import { PathTileType } from "../../../src/front/Utils/PathTileType";
import { directionToAnimationKey } from "../../../src/standalone/characters/CharacterAnimation";
import {
    computeManualMovementStep,
    getManualMovementSpeed,
    hasManualMovementInput,
} from "../../../src/standalone/characters/CharacterMotionController";
import { CharacterPathfinder } from "../../../src/standalone/pathfinding/CharacterPathfinder";

const movementConfig = {
    walkingSpeed: 9,
    runningMultiplier: 2.5,
};

function openGrid(width = 6, height = 6): number[][] {
    return Array.from({ length: height }, () => Array.from({ length: width }, () => PathTileType.Walkable));
}

function pathfinder(grid: number[][]): CharacterPathfinder {
    return new CharacterPathfinder({
        getCollisionGrid: () => grid,
        getTileDimensions: () => ({ width: 32, height: 32 }),
    });
}

describe("Standalone character runtime", () => {
    it("maps directions to animation keys", () => {
        expect(directionToAnimationKey(Direction.UP)).toBe("up");
        expect(directionToAnimationKey(Direction.DOWN)).toBe("down");
        expect(directionToAnimationKey(Direction.LEFT)).toBe("left");
        expect(directionToAnimationKey(Direction.RIGHT)).toBe("right");
    });

    it("computes local player direction from manual input", () => {
        expect(
            computeManualMovementStep(
                { up: false, down: false, left: true, right: false, speedUp: false, joystickMove: false },
                Direction.DOWN,
                movementConfig,
            ).direction,
        ).toBe(Direction.LEFT);
        expect(
            computeManualMovementStep(
                { up: true, down: false, left: false, right: false, speedUp: false, joystickMove: false },
                Direction.DOWN,
                movementConfig,
            ).direction,
        ).toBe(Direction.UP);
    });

    it("computes walking and running speed explicitly from config", () => {
        expect(getManualMovementSpeed(movementConfig, false)).toBe(9);
        expect(getManualMovementSpeed(movementConfig, true)).toBe(22.5);
    });

    it("detects manual input that cancels automatic path following", () => {
        expect(
            hasManualMovementInput({
                up: false,
                down: false,
                left: false,
                right: false,
                speedUp: true,
                joystickMove: false,
            }),
        ).toBe(false);
        expect(
            hasManualMovementInput({
                up: false,
                down: true,
                left: false,
                right: false,
                speedUp: false,
                joystickMove: false,
            }),
        ).toBe(true);
    });

    it("cancels the previous path for the same character", async () => {
        const service = pathfinder(openGrid());
        const first = service.findPathForCharacter("local", { x: 32, y: 32 }, { x: 160, y: 160 });
        const second = service.findPathForCharacter("local", { x: 32, y: 32 }, { x: 64, y: 64 });

        await expect(first).resolves.toMatchObject({ ok: false, code: "cancelled" });
        await expect(second).resolves.toMatchObject({ ok: true });
    });

    it("does not cancel sessions for different characters", async () => {
        const service = pathfinder(openGrid());
        const first = service.findPathForCharacter("local-a", { x: 32, y: 32 }, { x: 160, y: 160 });
        const second = service.findPathForCharacter("local-b", { x: 32, y: 32 }, { x: 64, y: 64 });

        await expect(first).resolves.toMatchObject({ ok: true });
        await expect(second).resolves.toMatchObject({ ok: true });
    });

    it("returns path_not_found for blocked targets", async () => {
        const grid = openGrid();
        grid[2][2] = PathTileType.Collider;
        await expect(pathfinder(grid).findPathForCharacter("local", { x: 32, y: 32 }, { x: 80, y: 80 })).resolves.toMatchObject({
            ok: false,
            code: "path_not_found",
        });
    });

    it("returns timeout when a session exceeds its calculation budget", async () => {
        await expect(
            pathfinder(openGrid()).findPathForCharacter("local", { x: 32, y: 32 }, { x: 160, y: 160 }, {
                maxCalculations: -1,
            }),
        ).resolves.toMatchObject({ ok: false, code: "timeout" });
    });

    it("returns invalid_target when the target is outside the map", async () => {
        await expect(
            pathfinder(openGrid()).findPathForCharacter("local", { x: 32, y: 32 }, { x: -1, y: -1 }),
        ).resolves.toMatchObject({ ok: false, code: "invalid_target" });
    });

    it("cancels one character without cancelling another", async () => {
        const service = pathfinder(openGrid());
        const first = service.findPathForCharacter("local-a", { x: 32, y: 32 }, { x: 160, y: 160 });
        const second = service.findPathForCharacter("local-b", { x: 32, y: 32 }, { x: 64, y: 64 });

        service.cancelCharacter("local-a");

        await expect(first).resolves.toMatchObject({ ok: false, code: "cancelled" });
        await expect(second).resolves.toMatchObject({ ok: true });
    });

    it("cancels all sessions on scene destroy", async () => {
        const service = pathfinder(openGrid());
        const first = service.findPathForCharacter("local-a", { x: 32, y: 32 }, { x: 160, y: 160 });
        const second = service.findPathForCharacter("local-b", { x: 32, y: 32 }, { x: 64, y: 64 });

        service.destroy();

        await expect(first).resolves.toMatchObject({ ok: false, code: "cancelled" });
        await expect(second).resolves.toMatchObject({ ok: false, code: "cancelled" });
    });

    it("keeps character snapshots JSON-serializable and free of runtime objects", () => {
        const snapshot: CharacterSnapshot = {
            id: "local",
            name: "Player",
            sceneId: "home",
            position: { x: 1, y: 2, direction: Direction.DOWN, moving: false },
            motionState: "idle",
        };

        expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
        expect(snapshot).not.toBeInstanceOf(Map);
        expect(snapshot).not.toBeInstanceOf(Set);
        expect(Object.values(snapshot).some((value) => value instanceof Element)).toBe(false);
    });
});
