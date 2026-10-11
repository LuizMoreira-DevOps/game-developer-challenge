import { expect, test } from "@playwright/test";

import { defaultGameplayConfig } from "../../src/game/config/gameplayConfig";
import { resolveCombat } from "../../src/game/core/CombatSystem";
import { updateEnemies } from "../../src/game/core/EnemySystem";

type Projectile = Parameters<typeof resolveCombat>[0][number];
type Enemy = Parameters<typeof resolveCombat>[1][number];
type Player = Parameters<typeof resolveCombat>[2];

const config = defaultGameplayConfig;

const island = {
    x: config.islandX,
    y: config.islandY,
    collisionRadius: config.islandCollisionRadius,
};

function createPlayer(): Player {
    return {
        x: 120,
        y: 120,
        rotation: 0,
        health: config.playerMaxHealth,
    };
}

function createEnemy(
    id: number,
    type: Enemy["type"],
    x: number,
    y: number,
): Enemy {
    return {
        id,
        type,
        x,
        y,
        rotation: 0,
        health:
            type === "chaser"
                ? config.chaserMaxHealth
                : config.shooterMaxHealth,
        attackCooldownSeconds: 0,
    };
}

function createProjectile(lifetimeSeconds: number): Projectile {
    return {
        id: 1,
        x: 120,
        y: 120,
        rotation: Math.PI / 2,
        speed: config.projectileSpeed,
        damage: config.projectileDamage,
        remainingLifetimeSeconds: lifetimeSeconds,
        owner: "player",
    };
}

test.describe("Combat regressions", () => {
    test("an expired projectile cannot damage an enemy", () => {
        const enemy = createEnemy(1, "chaser", 200, 120);

        const result = resolveCombat(
            [createProjectile(0)],
            [enemy],
            createPlayer(),
            island,
            config,
            0.2,
        );

        expect(enemy.health).toBe(config.chaserMaxHealth);
        expect(result.projectiles).toHaveLength(0);
        expect(result.kills).toBe(0);
    });

    test("a projectile cannot hit beyond its remaining lifetime", () => {
        const enemy = createEnemy(1, "chaser", 200, 120);

        const result = resolveCombat(
            [createProjectile(0.02)],
            [enemy],
            createPlayer(),
            island,
            config,
            0.2,
        );

        expect(enemy.health).toBe(config.chaserMaxHealth);
        expect(result.projectiles).toHaveLength(0);
        expect(result.kills).toBe(0);
    });

    test("a destroyed shooter cannot move or fire", () => {
        const shooter = createEnemy(1, "shooter", 300, 120);
        shooter.health = 0;

        const previousState = { ...shooter };

        const result = updateEnemies(
            [shooter],
            createPlayer(),
            island,
            config,
            0.1,
            1,
        );

        expect(shooter).toEqual(previousState);
        expect(result.enemies).toHaveLength(0);
        expect(result.projectiles).toHaveLength(0);
        expect(result.chaserCollisions).toBe(0);
    });

    test("a fatal chaser collision prevents later enemy actions", () => {
        const player = createPlayer();
        const chaser = createEnemy(1, "chaser", 160, 120);
        const shooter = createEnemy(2, "shooter", 300, 120);

        const previousShooterState = { ...shooter };

        const fatalCollisionConfig = {
            ...config,
            chaserCollisionDamage: player.health,
        };

        const result = updateEnemies(
            [chaser, shooter],
            player,
            island,
            fatalCollisionConfig,
            0.1,
            1,
        );

        expect(result.chaserCollisions).toBe(1);
        expect(result.enemies).toHaveLength(1);
        expect(result.enemies[0]).toEqual(previousShooterState);
        expect(result.projectiles).toHaveLength(0);
    });
});
