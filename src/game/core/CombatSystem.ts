import type { GameplayConfig } from "../config/gameplayConfig";
import type { EnemyState } from "./EnemyState";
import type { IslandState } from "./IslandState";
import type { PlayerState } from "./PlayerState";
import type { ProjectileState } from "./ProjectileState";

interface Position {
    x: number;
    y: number;
}

export interface CombatResult {
    projectiles: ProjectileState[];
    enemies: EnemyState[];
    kills: number;
    playerDestroyed: boolean;
}

const PROJECTILE_RADIUS = 6;

function segmentCircleHit(
    start: Position,
    end: Position,
    center: Position,
    radius: number,
): number | null {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const fx = start.x - center.x;
    const fy = start.y - center.y;

    const a = dx * dx + dy * dy;
    const c = fx * fx + fy * fy - radius * radius;

    if (c <= 0) return 0;
    if (a === 0) return null;

    const b = 2 * (fx * dx + fy * dy);
    const discriminant = b * b - 4 * a * c;

    if (discriminant < 0) return null;

    const t = (-b - Math.sqrt(discriminant)) / (2 * a);

    return t >= 0 && t <= 1 ? t : null;
}

export function resolveCombat(
    projectiles: ProjectileState[],
    enemies: EnemyState[],
    player: PlayerState,
    island: Readonly<IslandState>,
    config: GameplayConfig,
    deltaSeconds: number,
): CombatResult {
    const remainingProjectiles: ProjectileState[] = [];
    let kills = 0;

    for (const projectile of projectiles) {
        if (player.health <= 0) break;

        const start = { x: projectile.x, y: projectile.y };
        if (projectile.remainingLifetimeSeconds <= 0) {
            continue;
        }

        const activeDeltaSeconds = Math.min(
            deltaSeconds,
            projectile.remainingLifetimeSeconds,
        );

        const distance = projectile.speed * activeDeltaSeconds;
        const end = {
            x: start.x + Math.sin(projectile.rotation) * distance,
            y: start.y - Math.cos(projectile.rotation) * distance,
        };

        let firstHit = segmentCircleHit(
            start,
            end,
            island,
            island.collisionRadius + PROJECTILE_RADIUS,
        );

        let target: EnemyState | "player" | null = null;

        if (projectile.owner === "player") {
            for (const enemy of enemies) {
                if (enemy.health <= 0) continue;

                const hit = segmentCircleHit(
                    start,
                    end,
                    enemy,
                    config.enemyCollisionRadius + PROJECTILE_RADIUS,
                );

                if (hit !== null && (firstHit === null || hit < firstHit)) {
                    firstHit = hit;
                    target = enemy;
                }
            }
        } else {
            const hit = segmentCircleHit(
                start,
                end,
                player,
                config.playerCollisionRadius + PROJECTILE_RADIUS,
            );

            if (hit !== null && (firstHit === null || hit < firstHit)) {
                firstHit = hit;
                target = "player";
            }
        }

        if (firstHit !== null) {
            if (target === "player") {
                player.health = Math.max(0, player.health - projectile.damage);
            } else if (target !== null) {
                target.health = Math.max(0, target.health - projectile.damage);

                if (target.health === 0) {
                    kills++;
                }
            }

            // Um impacto consome o projétil, inclusive na ilha.
            continue;
        }

        projectile.x = end.x;
        projectile.y = end.y;
        projectile.remainingLifetimeSeconds -= deltaSeconds;

        if (
            projectile.remainingLifetimeSeconds > 0 &&
            projectile.x >= 0 &&
            projectile.x <= config.arenaWidth &&
            projectile.y >= 0 &&
            projectile.y <= config.arenaHeight
        ) {
            remainingProjectiles.push(projectile);
        }
    }

    return {
        projectiles: remainingProjectiles,
        enemies: enemies.filter((enemy) => enemy.health > 0),
        kills,
        playerDestroyed: player.health <= 0,
    };
}
