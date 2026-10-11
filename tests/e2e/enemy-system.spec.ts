import { expect, test } from "@playwright/test";

import { defaultGameplayConfig as config } from "../../src/game/config/gameplayConfig";
import { createEnemy, updateEnemies } from "../../src/game/core/EnemySystem";
import type { EnemyState } from "../../src/game/core/EnemyState";

const player = { x: 120, y: 120, rotation: 0 };
const island = {
    x: config.islandX,
    y: config.islandY,
    collisionRadius: config.islandCollisionRadius,
};

test("spawns enemies in valid positions", () => {
    const enemy = createEnemy(1, "chaser", player, island, config, () => 0.9);

    expect(enemy).not.toBeNull();

    if (!enemy) return;

    expect(enemy.x).toBeGreaterThanOrEqual(config.enemyCollisionRadius);
    expect(enemy.y).toBeGreaterThanOrEqual(config.enemyCollisionRadius);

    expect(
        Math.hypot(enemy.x - island.x, enemy.y - island.y),
    ).toBeGreaterThanOrEqual(
        config.enemyCollisionRadius + island.collisionRadius,
    );

    expect(
        Math.hypot(enemy.x - player.x, enemy.y - player.y),
    ).toBeGreaterThanOrEqual(
        config.enemyCollisionRadius +
            config.playerCollisionRadius +
            config.enemySpawnSafeDistance,
    );
});

test("chaser pursues the player", () => {
    const enemy: EnemyState = {
        id: 1,
        type: "chaser",
        x: 400,
        y: 120,
        rotation: -Math.PI / 2,
        attackCooldownSeconds: 0,
    };

    const result = updateEnemies([enemy], player, island, config, 0.5, 1);

    expect(result.enemies[0].x).toBeLessThan(400);
});

test("chaser self-destructs on player collision", () => {
    const enemy: EnemyState = {
        id: 1,
        type: "chaser",
        x: player.x + 10,
        y: player.y,
        rotation: 0,
        attackCooldownSeconds: 0,
    };

    const result = updateEnemies([enemy], player, island, config, 0.016, 1);

    expect(result.enemies).toHaveLength(0);
});

test("shooter fires within range", () => {
    const enemy: EnemyState = {
        id: 2,
        type: "shooter",
        x: 300,
        y: 120,
        rotation: -Math.PI / 2,
        attackCooldownSeconds: 0,
    };

    const result = updateEnemies([enemy], player, island, config, 0.016, 1);

    expect(result.projectiles).toHaveLength(1);
    expect(result.projectiles[0].owner).toBe("enemy");
});

test("shooter does not fire outside range", () => {
    const enemy: EnemyState = {
        id: 2,
        type: "shooter",
        x: 1000,
        y: 120,
        rotation: -Math.PI / 2,
        attackCooldownSeconds: 0,
    };

    const result = updateEnemies([enemy], player, island, config, 0.016, 1);

    expect(result.projectiles).toHaveLength(0);
});

test("enemy rotation respects delta time", () => {
    const enemy: EnemyState = {
        id: 1,
        type: "chaser",
        x: 400,
        y: 120,
        rotation: 0,
        attackCooldownSeconds: 0,
    };

    const deltaSeconds = 0.1;

    const result = updateEnemies(
        [enemy],
        player,
        island,
        config,
        deltaSeconds,
        1,
    );

    expect(Math.abs(result.enemies[0].rotation)).toBeLessThanOrEqual(
        config.enemyRotationSpeed * deltaSeconds + 0.000001,
    );
});

test("enemy respects arena boundaries", () => {
    const enemy: EnemyState = {
        id: 1,
        type: "chaser",
        x: config.arenaWidth - config.enemyCollisionRadius,
        y: 120,
        rotation: Math.PI / 2,
        attackCooldownSeconds: 0,
    };

    const target = {
        x: config.arenaWidth + 100,
        y: 120,
        rotation: 0,
    };

    const result = updateEnemies([enemy], target, island, config, 1, 1);

    expect(result.enemies[0].x).toBeLessThanOrEqual(
        config.arenaWidth - config.enemyCollisionRadius,
    );
});

test("enemy does not enter island collision radius", () => {
    const enemy: EnemyState = {
        id: 1,
        type: "chaser",
        x: island.x - island.collisionRadius - config.enemyCollisionRadius - 5,
        y: island.y,
        rotation: Math.PI / 2,
        attackCooldownSeconds: 0,
    };

    const target = {
        x: island.x + 250,
        y: island.y,
        rotation: 0,
    };

    const result = updateEnemies([enemy], target, island, config, 0.5, 1);

    const moved = result.enemies[0];

    expect(
        Math.hypot(moved.x - island.x, moved.y - island.y),
    ).toBeGreaterThanOrEqual(
        island.collisionRadius + config.enemyCollisionRadius - 0.001,
    );
});

test("separates overlapping enemies", () => {
    const enemies: EnemyState[] = [
        {
            id: 1,
            type: "shooter",
            x: 300,
            y: 300,
            rotation: 0,
            attackCooldownSeconds: 1,
        },
        {
            id: 2,
            type: "shooter",
            x: 300,
            y: 300,
            rotation: 0,
            attackCooldownSeconds: 1,
        },
    ];

    const result = updateEnemies(enemies, player, island, config, 0, 1);

    const [first, second] = result.enemies;

    expect(
        Math.hypot(first.x - second.x, first.y - second.y),
    ).toBeGreaterThanOrEqual(config.enemyCollisionRadius * 2 - 0.001);
});
