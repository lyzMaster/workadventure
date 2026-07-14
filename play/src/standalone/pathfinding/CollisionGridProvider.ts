export interface TileDimensions {
    width: number;
    height: number;
}

export interface CollisionGridProvider {
    getCollisionGrid(): number[][];
    getTileDimensions(): TileDimensions;
}
