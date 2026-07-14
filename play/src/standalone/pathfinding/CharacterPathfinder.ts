import type { CharacterId } from "@workadventure/game-model";
import type { CollisionGridProvider } from "./CollisionGridProvider";
import { PathfindingSession } from "./PathfindingSession";
import type { PathfindingResult } from "./PathfindingResult";

export interface CharacterPathfindingOptions {
    tryFindingNearestAvailable?: boolean;
    timeoutMs?: number;
    maxCalculations?: number;
}

type ActiveSession = {
    abortController: AbortController;
    session: PathfindingSession;
};

export class CharacterPathfinder {
    private readonly sessionsByCharacter = new Map<CharacterId, ActiveSession>();

    public constructor(private readonly collisionGridProvider: CollisionGridProvider) {}

    public async findPathForCharacter(
        characterId: CharacterId,
        start: { x: number; y: number },
        end: { x: number; y: number },
        options: CharacterPathfindingOptions = {},
    ): Promise<PathfindingResult> {
        this.cancelCharacter(characterId);
        const abortController = new AbortController();
        const session = new PathfindingSession({
            grid: this.collisionGridProvider.getCollisionGrid().map((row) => [...row]),
            tileDimensions: this.collisionGridProvider.getTileDimensions(),
            start,
            end,
            tryFindingNearestAvailable: options.tryFindingNearestAvailable,
            timeoutMs: options.timeoutMs,
            maxCalculations: options.maxCalculations,
            signal: abortController.signal,
        });
        this.sessionsByCharacter.set(characterId, { abortController, session });
        try {
            return await session.start();
        } finally {
            if (this.sessionsByCharacter.get(characterId)?.session === session) {
                this.sessionsByCharacter.delete(characterId);
            }
        }
    }

    public cancelCharacter(characterId: CharacterId): void {
        const activeSession = this.sessionsByCharacter.get(characterId);
        if (!activeSession) {
            return;
        }
        activeSession.abortController.abort();
        activeSession.session.cancel();
        this.sessionsByCharacter.delete(characterId);
    }

    public cancelAll(): void {
        for (const characterId of this.sessionsByCharacter.keys()) {
            this.cancelCharacter(characterId);
        }
    }

    public destroy(): void {
        this.cancelAll();
    }
}
