export interface GameplayConfig {
    readonly matchDurationSeconds: number;
    readonly enemySpawnIntervalSeconds: number;
    readonly playerMoveSpeed: number;
    readonly playerRotationSpeed: number;
    readonly arenaWidth: number;
    readonly arenaHeight: number;
    readonly playerCollisionRadius: number;
}

export const defaultGameplayConfig = Object.freeze({
    matchDurationSeconds: 90,
    enemySpawnIntervalSeconds: 5,
    playerMoveSpeed: 180,
    playerRotationSpeed: Math.PI,
    arenaWidth: 1280,
    arenaHeight: 720,
    playerCollisionRadius: 32,
}) satisfies GameplayConfig;
