import { js as EasyStar } from "easystarjs";
import { PathTileType } from "../../front/Utils/PathTileType";
import {
    CHARACTER_BODY_HEIGHT,
    CHARACTER_BODY_OFFSET_X,
    CHARACTER_BODY_OFFSET_Y,
} from "../characters/CharacterBodyMetrics";
import type { PathfindingResult } from "./PathfindingResult";
import type { TileDimensions } from "./CollisionGridProvider";

export interface PathfindingSessionOptions {
    grid: number[][];
    tileDimensions: TileDimensions;
    start: { x: number; y: number };
    end: { x: number; y: number };
    tryFindingNearestAvailable?: boolean;
    timeoutMs?: number;
    maxCalculations?: number;
    signal?: AbortSignal;
}

export class PathfindingSession {
    private readonly easyStar = new EasyStar();
    private timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    private pathfindingInstanceId: number | undefined;
    private cancelled = false;

    public constructor(private readonly options: PathfindingSessionOptions) {
        this.easyStar.enableDiagonals();
        this.easyStar.disableCornerCutting();
        this.easyStar.setTileCost(PathTileType.Exit, 100);
        this.easyStar.setTileCost(PathTileType.MeetingRoom, 50);
        this.easyStar.setTileCost(PathTileType.PersonalDesk, 50);
        this.easyStar.setIterationsPerCalculation(1000);
        this.easyStar.setGrid(options.grid);
        this.easyStar.setAcceptableTiles([
            PathTileType.Walkable,
            PathTileType.Exit,
            PathTileType.Start,
            PathTileType.MeetingRoom,
            PathTileType.PersonalDesk,
        ]);
    }

    public start(): Promise<PathfindingResult> {
        if (this.options.signal?.aborted) {
            return Promise.resolve({ ok: false, code: "cancelled", message: "Pathfinding session was cancelled" });
        }
        const startTile = this.mapPixelsToTileUnits(this.options.start);
        const endTile = this.mapPixelsToTileUnits(this.options.end);
        if (!this.isTileWithinMap(startTile) || !this.isTileWithinMap(endTile)) {
            return Promise.resolve({ ok: false, code: "invalid_target", message: "Path target is outside the map" });
        }
        if (!this.isTileWalkable(endTile) && !this.options.tryFindingNearestAvailable) {
            return Promise.resolve({ ok: false, code: "path_not_found", message: "Path target is not walkable" });
        }

        return new Promise((resolve) => {
            const abortListener = (): void => {
                this.cancel();
                resolve({ ok: false, code: "cancelled", message: "Pathfinding session was cancelled" });
            };
            this.options.signal?.addEventListener("abort", abortListener, { once: true });

            this.findPath(startTile, endTile)
                .then((result) => {
                    this.options.signal?.removeEventListener("abort", abortListener);
                    resolve(result);
                })
                .catch((error: unknown) => {
                    this.options.signal?.removeEventListener("abort", abortListener);
                    resolve({
                        ok: false,
                        code: "path_not_found",
                        message: error instanceof Error ? error.message : String(error),
                    });
                });
        });
    }

    public cancel(): void {
        if (this.pathfindingInstanceId !== undefined) {
            this.easyStar.cancelPath(this.pathfindingInstanceId);
            this.pathfindingInstanceId = undefined;
        }
        this.clearTimeout();
        this.cancelled = true;
    }

    private async findPath(
        start: { x: number; y: number },
        end: { x: number; y: number },
    ): Promise<PathfindingResult> {
        let isExactTarget = true;
        let endPoints: { x: number; y: number }[] = [end];
        if (this.options.tryFindingNearestAvailable) {
            endPoints = [
                end,
                ...this.getNeighbouringTiles(end).sort(
                    (a, b) => this.distanceBetween(a, start) - this.distanceBetween(b, start),
                ),
            ];
        }

        for (const endPoint of endPoints) {
            if (!this.isTileWalkable(endPoint)) {
                isExactTarget = false;
                continue;
            }
            const result = await this.getPath(start, endPoint);
            if (!result.ok) {
                if (result.code === "cancelled" || result.code === "timeout") {
                    return result;
                }
                isExactTarget = false;
                continue;
            }
            return {
                ok: true,
                path: this.preparePixelPath(result.path, isExactTarget),
            };
        }
        return { ok: false, code: "path_not_found", message: "No walkable path found" };
    }

    private getPath(start: { x: number; y: number }, end: { x: number; y: number }): Promise<PathfindingResult> {
        return new Promise((resolve) => {
            let settled = false;
            let calculationCount = 0;
            const startedAt = Date.now();
            const timeoutMs = this.options.timeoutMs ?? 3000;
            const maxCalculations = this.options.maxCalculations ?? 50;

            const settle = (result: PathfindingResult): void => {
                if (settled || this.cancelled) {
                    return;
                }
                settled = true;
                this.clearTimeout();
                this.pathfindingInstanceId = undefined;
                resolve(result);
            };

            this.pathfindingInstanceId = this.easyStar.findPath(start.x, start.y, end.x, end.y, (path) => {
                settle(
                    path === null
                        ? { ok: false, code: "path_not_found", message: "No path found" }
                        : { ok: true, path },
                );
            });

            const performCalculation = (): void => {
                if (settled || this.cancelled) {
                    return;
                }
                if (this.options.signal?.aborted) {
                    this.cancel();
                    resolve({ ok: false, code: "cancelled", message: "Pathfinding session was cancelled" });
                    return;
                }
                if (Date.now() - startedAt > timeoutMs || calculationCount > maxCalculations) {
                    this.cancel();
                    resolve({ ok: false, code: "timeout", message: "Pathfinding session timed out" });
                    return;
                }
                calculationCount += 1;
                this.easyStar.calculate();
                this.timeoutHandle = setTimeout(performCalculation, 10);
            };

            performCalculation();
        });
    }

    private preparePixelPath(path: { x: number; y: number }[], isExactTarget: boolean): { x: number; y: number }[] {
        const pixelPath = path.map((step) => this.mapTileUnitToPixels(step));
        if (pixelPath.length > 1) {
            pixelPath[0] = {
                x: this.options.start.x,
                y: this.options.start.y + this.options.tileDimensions.height * 0.5,
            };
            if (isExactTarget) {
                pixelPath[pixelPath.length - 1] = this.fitBodyWithinTile(this.options.end.x, this.options.end.y);
            }
        }
        return pixelPath;
    }

    private fitBodyWithinTile(x: number, y: number): { x: number; y: number } {
        const xMod = x % this.options.tileDimensions.width;
        const yMod = y % this.options.tileDimensions.height;

        if (yMod < CHARACTER_BODY_HEIGHT / 2 + CHARACTER_BODY_OFFSET_Y) {
            y = y - yMod + CHARACTER_BODY_HEIGHT / 2 + CHARACTER_BODY_OFFSET_Y;
        }
        if (xMod < CHARACTER_BODY_HEIGHT / 2 + CHARACTER_BODY_OFFSET_X) {
            x = x - xMod + CHARACTER_BODY_HEIGHT / 2 + CHARACTER_BODY_OFFSET_X;
        }
        if (yMod > this.options.tileDimensions.height - CHARACTER_BODY_HEIGHT / 2 + CHARACTER_BODY_OFFSET_Y) {
            y = y - yMod + this.options.tileDimensions.height - CHARACTER_BODY_HEIGHT / 2 + CHARACTER_BODY_OFFSET_Y;
        }
        if (xMod > this.options.tileDimensions.width - CHARACTER_BODY_HEIGHT / 2 + CHARACTER_BODY_OFFSET_X) {
            x = x - xMod + this.options.tileDimensions.width - CHARACTER_BODY_HEIGHT / 2 + CHARACTER_BODY_OFFSET_X;
        }

        return { x, y };
    }

    private mapTileUnitToPixels(tilePosition: { x: number; y: number }): { x: number; y: number } {
        return {
            x: tilePosition.x * this.options.tileDimensions.width + this.options.tileDimensions.width * 0.5,
            y: tilePosition.y * this.options.tileDimensions.height + this.options.tileDimensions.height * 0.5,
        };
    }

    private mapPixelsToTileUnits(position: { x: number; y: number }): { x: number; y: number } {
        return {
            x: Math.floor(position.x / this.options.tileDimensions.width),
            y: Math.floor(position.y / this.options.tileDimensions.height),
        };
    }

    private getNeighbouringTiles(tile: { x: number; y: number }): { x: number; y: number }[] {
        const xOffsets = [-1, 0, 1, 1, 1, 0, -1, -1];
        const yOffsets = [-1, -1, -1, 0, 1, 1, 1, 0];
        const neighbours: { x: number; y: number }[] = [];
        for (let i = 0; i < 8; i += 1) {
            const tileToCheck = { x: tile.x + xOffsets[i], y: tile.y + yOffsets[i] };
            if (this.isTileWithinMap(tileToCheck)) {
                neighbours.push(tileToCheck);
            }
        }
        return neighbours;
    }

    private isTileWithinMap(tile: { x: number; y: number }): boolean {
        return tile.y >= 0 && tile.y < this.options.grid.length && tile.x >= 0 && tile.x < (this.options.grid[0]?.length ?? 0);
    }

    private isTileWalkable(tile: { x: number; y: number }): boolean {
        const value = this.options.grid[tile.y]?.[tile.x];
        return (
            value === PathTileType.Walkable ||
            value === PathTileType.Exit ||
            value === PathTileType.Start ||
            value === PathTileType.MeetingRoom ||
            value === PathTileType.PersonalDesk
        );
    }

    private distanceBetween(a: { x: number; y: number }, b: { x: number; y: number }): number {
        const x = a.x - b.x;
        const y = a.y - b.y;
        return Math.sqrt(x * x + y * y);
    }

    private clearTimeout(): void {
        if (this.timeoutHandle !== undefined) {
            clearTimeout(this.timeoutHandle);
            this.timeoutHandle = undefined;
        }
    }
}
