import { expect, test } from "@playwright/test";

import { defaultGameplayConfig } from "../../src/game/config/gameplayConfig";
import { resolveCombat } from "../../src/game/core/CombatSystem";
import type { EnemyState } from "../../src/game/core/EnemyState";
import type { PlayerState } from "../../src/game/core/PlayerState";
import type { ProjectileState } from "../../src/game/core/ProjectileState";

const config = defaultGameplayConfig;

function createPlayer(): PlayerState {
    return {
        x: 120,
        y: 120,
        rotation: 0,
        health: config.playerMaxHealth,
    };
}

function createEnemy(
    id: number,
    x: number,
    y: number,
    health: number = config.chaserMaxHealth,
): EnemyState {
    return {
        id,
        type: "chaser",
        x,
        y,
        rotation: 0,
        health,
        attackCooldownSeconds: 0,
    };
}

function createProjectile(
    id: number,
    x: number,
    y: number,
    owner: ProjectileState["owner"] = "player",
): ProjectileState {
    return {
        id,
        x,
        y,
        rotation: Math.PI / 2,
        speed: config.projectileSpeed,
        damage:
            owner === "player"
                ? config.projectileDamage
                : config.enemyProjectileDamage,
        remainingLifetimeSeconds: config.projectileLifetimeSeconds,
        owner,
    };
}

const island = {
    x: config.islandX,
    y: config.islandY,
    collisionRadius: config.islandCollisionRadius,
};

test("player projectile damages an enemy", () => {
    const player = createPlayer();
    const enemy = createEnemy(1, 200, 120);
    const projectile = createProjectile(1, 120, 120);

    const result = resolveCombat(
        [projectile],
        [enemy],
        player,
        island,
        config,
        0.2,
    );

    expect(result.enemies).toHaveLength(1);
    expect(result.enemies[0].health).toBe(
        config.chaserMaxHealth - config.projectileDamage,
    );
    expect(result.projectiles).toHaveLength(0);
    expect(result.kills).toBe(0);
});

test("enemy projectile damages the player", () => {
    const player = createPlayer();
    const projectile = createProjectile(1, 40, 120, "enemy");

    const result = resolveCombat([projectile], [], player, island, config, 0.2);

    expect(player.health).toBe(
        config.playerMaxHealth - config.enemyProjectileDamage,
    );
    expect(result.projectiles).toHaveLength(0);
    expect(result.playerDestroyed).toBe(false);
});

test("projectile hits only the first enemy", () => {
    const player = createPlayer();
    const firstEnemy = createEnemy(1, 200, 120);
    const secondEnemy = createEnemy(2, 280, 120);
    const projectile = createProjectile(1, 120, 120);

    const result = resolveCombat(
        [projectile],
        [firstEnemy, secondEnemy],
        player,
        island,
        config,
        0.4,
    );

    expect(result.enemies[0].health).toBe(
        config.chaserMaxHealth - config.projectileDamage,
    );
    expect(result.enemies[1].health).toBe(config.chaserMaxHealth);
    expect(result.projectiles).toHaveLength(0);
});

test("destroyed enemy is removed and awards one kill", () => {
    const player = createPlayer();
    const enemy = createEnemy(1, 200, 120, 25);
    const projectile = createProjectile(1, 120, 120);

    const result = resolveCombat(
        [projectile],
        [enemy],
        player,
        island,
        config,
        0.2,
    );

    expect(result.enemies).toHaveLength(0);
    expect(result.projectiles).toHaveLength(0);
    expect(result.kills).toBe(1);
});

test("multiple projectiles cannot score twice on one enemy", () => {
    const player = createPlayer();
    const enemy = createEnemy(1, 200, 120, 25);

    const result = resolveCombat(
        [createProjectile(1, 120, 120), createProjectile(2, 120, 120)],
        [enemy],
        player,
        island,
        config,
        0.2,
    );

    expect(result.enemies).toHaveLength(0);
    expect(result.kills).toBe(1);
});

test("island blocks a projectile before it reaches an enemy", () => {
    const player = createPlayer();
    const enemy = createEnemy(1, 800, 360);
    const projectile = createProjectile(1, 450, 360);

    const result = resolveCombat(
        [projectile],
        [enemy],
        player,
        island,
        config,
        0.8,
    );

    expect(result.projectiles).toHaveLength(0);
    expect(result.enemies[0].health).toBe(config.chaserMaxHealth);
    expect(result.kills).toBe(0);
});

test("lethal enemy projectile destroys the player", () => {
    const player = createPlayer();
    player.health = config.enemyProjectileDamage;

    const projectile = createProjectile(1, 40, 120, "enemy");

    const result = resolveCombat([projectile], [], player, island, config, 0.2);

    expect(player.health).toBe(0);
    expect(result.playerDestroyed).toBe(true);
    expect(result.projectiles).toHaveLength(0);
});
