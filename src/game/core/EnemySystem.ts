import type { GameplayConfig } from "../config/gameplayConfig";
import { resolveCircleOverlap } from "./collision/resolveCircleOverlap";
import type { EnemyState, EnemyType } from "./EnemyState";
import type { IslandState } from "./IslandState";
import type { PlayerState } from "./PlayerState";
import type { ProjectileState } from "./ProjectileState";

export interface EnemyUpdateResult {
    enemies: EnemyState[];
    projectiles: ProjectileState[];
    chaserCollisions: number;
}

const TWO_PI = Math.PI * 2;

function normalizeAngle(angle: number): number {
    return ((((angle + Math.PI) % TWO_PI) + TWO_PI) % TWO_PI) - Math.PI;
}

function rotateTowards(
    current: number,
    target: number,
    maxStep: number,
): number {
    const difference = normalizeAngle(target - current);

    if (Math.abs(difference) <= maxStep) {
        return target;
    }

    return current + Math.sign(difference) * maxStep;
}

function clamp(value: number, minimum: number, maximum: number): number {
    return Math.max(minimum, Math.min(maximum, value));
}

function isValidSpawn(
    x: number,
    y: number,
    player: Readonly<PlayerState>,
    island: Readonly<IslandState>,
    config: GameplayConfig,
): boolean {
    const radius = config.enemyCollisionRadius;

    if (
        x < radius ||
        y < radius ||
        x > config.arenaWidth - radius ||
        y > config.arenaHeight - radius
    ) {
        return false;
    }

    if (
        Math.hypot(x - island.x, y - island.y) <
        radius + island.collisionRadius
    ) {
        return false;
    }

    return (
        Math.hypot(x - player.x, y - player.y) >=
        radius + config.playerCollisionRadius + config.enemySpawnSafeDistance
    );
}

export function createEnemy(
    id: number,
    type: EnemyType,
    player: Readonly<PlayerState>,
    island: Readonly<IslandState>,
    config: GameplayConfig,
    random: () => number = Math.random,
): EnemyState | null {
    const radius = config.enemyCollisionRadius;

    for (let attempt = 0; attempt < 100; attempt++) {
        const x = radius + random() * (config.arenaWidth - 2 * radius);
        const y = radius + random() * (config.arenaHeight - 2 * radius);

        if (!isValidSpawn(x, y, player, island, config)) {
            continue;
        }

        return {
            id,
            type,
            x,
            y,
            rotation: Math.atan2(player.x - x, -(player.y - y)),
            health:
                type === "chaser"
                    ? config.chaserMaxHealth
                    : config.shooterMaxHealth,
            attackCooldownSeconds: 0,
        };
    }

    return null;
}

export function updateEnemies(
    enemies: EnemyState[],
    player: Readonly<PlayerState>,
    island: Readonly<IslandState>,
    config: GameplayConfig,
    deltaSeconds: number,
    nextProjectileId: number,
): EnemyUpdateResult {
    const survivingEnemies: EnemyState[] = [];
    const projectiles: ProjectileState[] = [];
    let chaserCollisions = 0;

    for (const enemy of enemies) {
        if (enemy.health <= 0) {
            continue;
        }

        const remainingPlayerHealth =
            player.health - chaserCollisions * config.chaserCollisionDamage;

        if (remainingPlayerHealth <= 0) {
            survivingEnemies.push(enemy);
            continue;
        }

        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distance = Math.hypot(dx, dy);

        const targetRotation = Math.atan2(dx, -dy);

        enemy.rotation = rotateTowards(
            enemy.rotation,
            targetRotation,
            config.enemyRotationSpeed * deltaSeconds,
        );

        const preferredShooterDistance = config.shooterAttackRange * 0.8;

        const shouldMove =
            enemy.type === "chaser" || distance > preferredShooterDistance;

        if (shouldMove && distance > 0) {
            const speed =
                enemy.type === "chaser"
                    ? config.chaserMoveSpeed
                    : config.shooterMoveSpeed;

            const movement = Math.min(speed * deltaSeconds, distance);

            enemy.x += Math.sin(enemy.rotation) * movement;
            enemy.y -= Math.cos(enemy.rotation) * movement;
        }

        const radius = config.enemyCollisionRadius;

        enemy.x = clamp(enemy.x, radius, config.arenaWidth - radius);
        enemy.y = clamp(enemy.y, radius, config.arenaHeight - radius);

        const resolved = resolveCircleOverlap(
            { x: enemy.x, y: enemy.y, radius },
            {
                x: island.x,
                y: island.y,
                radius: island.collisionRadius,
            },
        );

        enemy.x = clamp(resolved.x, radius, config.arenaWidth - radius);
        enemy.y = clamp(resolved.y, radius, config.arenaHeight - radius);

        if (enemy.type === "shooter") {
            const resolvedPlayerCollision = resolveCircleOverlap(
                {
                    x: enemy.x,
                    y: enemy.y,
                    radius: config.enemyCollisionRadius,
                },
                {
                    x: player.x,
                    y: player.y,
                    radius: config.playerCollisionRadius,
                },
            );

            enemy.x = clamp(
                resolvedPlayerCollision.x,
                radius,
                config.arenaWidth - radius,
            );

            enemy.y = clamp(
                resolvedPlayerCollision.y,
                radius,
                config.arenaHeight - radius,
            );
        }

        const playerDistance = Math.hypot(
            player.x - enemy.x,
            player.y - enemy.y,
        );

        if (
            enemy.type === "chaser" &&
            playerDistance <= radius + config.playerCollisionRadius
        ) {
            chaserCollisions++;
            continue;
        }

        if (enemy.type === "shooter") {
            enemy.attackCooldownSeconds = Math.max(
                0,
                enemy.attackCooldownSeconds - deltaSeconds,
            );

            if (
                playerDistance <= config.shooterAttackRange &&
                enemy.attackCooldownSeconds === 0
            ) {
                projectiles.push({
                    id: nextProjectileId + projectiles.length,
                    x: enemy.x,
                    y: enemy.y,
                    rotation: targetRotation,
                    speed: config.projectileSpeed,
                    damage: config.enemyProjectileDamage,
                    remainingLifetimeSeconds: config.projectileLifetimeSeconds,
                    owner: "enemy",
                });

                enemy.attackCooldownSeconds = config.shooterFireCooldownSeconds;
            }
        }

        survivingEnemies.push(enemy);
    }

    if (player.health - chaserCollisions * config.chaserCollisionDamage <= 0) {
        return {
            enemies: survivingEnemies,
            projectiles,
            chaserCollisions,
        };
    }

    for (let i = 0; i < survivingEnemies.length; i++) {
        for (let j = i + 1; j < survivingEnemies.length; j++) {
            const first = survivingEnemies[i];
            const second = survivingEnemies[j];

            const dx = second.x - first.x;
            const dy = second.y - first.y;
            const distance = Math.hypot(dx, dy);
            const minimumDistance = config.enemyCollisionRadius * 2;

            if (distance >= minimumDistance) {
                continue;
            }

            const normalX = distance > 0 ? dx / distance : 1;
            const normalY = distance > 0 ? dy / distance : 0;

            const overlap = minimumDistance - distance;
            const correction = overlap / 2;

            first.x -= normalX * correction;
            first.y -= normalY * correction;

            second.x += normalX * correction;
            second.y += normalY * correction;

            for (const enemy of [first, second]) {
                const resolved = resolveCircleOverlap(
                    {
                        x: enemy.x,
                        y: enemy.y,
                        radius: config.enemyCollisionRadius,
                    },
                    {
                        x: island.x,
                        y: island.y,
                        radius: island.collisionRadius,
                    },
                );

                enemy.x = clamp(
                    resolved.x,
                    config.enemyCollisionRadius,
                    config.arenaWidth - config.enemyCollisionRadius,
                );

                enemy.y = clamp(
                    resolved.y,
                    config.enemyCollisionRadius,
                    config.arenaHeight - config.enemyCollisionRadius,
                );
            }
        }
    }

    return {
        enemies: survivingEnemies,
        projectiles,
        chaserCollisions,
    };
}
