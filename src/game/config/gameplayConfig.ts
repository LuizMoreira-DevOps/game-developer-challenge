export interface GameplayConfig {
    readonly matchDurationSeconds: number;
    readonly enemySpawnIntervalSeconds: number;
}

export const defaultGameplayConfig = Object.freeze({
    matchDurationSeconds: 90,
    enemySpawnIntervalSeconds: 5,
}) satisfies GameplayConfig;
