export interface GameplayConfig {
    readonly matchDurationSeconds: number;
    readonly enemySpawnIntervalSeconds: number;
    readonly playerMoveSpeed: number;
    readonly playerRotationSpeed: number;
    readonly arenaWidth: number;
    readonly arenaHeight: number;
    readonly playerCollisionRadius: number;

    readonly projectileSpeed: number;
    readonly projectileDamage: number;
    readonly projectileLifetimeSeconds: number;

    readonly frontFireCooldownSeconds: number;
    readonly broadsideCooldownSeconds: number;

    readonly broadsideProjectileCount: number;
    readonly broadsideProjectileSpacing: number;

    readonly islandX: number;
    readonly islandY: number;
    readonly islandCollisionRadius: number;

    readonly enemyCollisionRadius: number;
    readonly enemySpawnSafeDistance: number;
    readonly enemyRotationSpeed: number;
    readonly chaserMoveSpeed: number;
    readonly shooterMoveSpeed: number;
    readonly shooterAttackRange: number;
    readonly shooterFireCooldownSeconds: number;
}

export const defaultGameplayConfig = Object.freeze({
    matchDurationSeconds: 90,
    enemySpawnIntervalSeconds: 5,
    playerMoveSpeed: 180,
    playerRotationSpeed: Math.PI,
    arenaWidth: 1280,
    arenaHeight: 720,
    playerCollisionRadius: 32,

    projectileSpeed: 520,
    projectileDamage: 25,
    projectileLifetimeSeconds: 1.5,

    frontFireCooldownSeconds: 0.4,
    broadsideCooldownSeconds: 1.2,

    broadsideProjectileCount: 3,
    broadsideProjectileSpacing: 28,

    islandX: 640,
    islandY: 360,
    islandCollisionRadius: 96,

    enemyCollisionRadius: 28,
    enemySpawnSafeDistance: 120,
    enemyRotationSpeed: Math.PI,
    chaserMoveSpeed: 110,
    shooterMoveSpeed: 85,
    shooterAttackRange: 260,
    shooterFireCooldownSeconds: 1.5,
}) satisfies GameplayConfig;
