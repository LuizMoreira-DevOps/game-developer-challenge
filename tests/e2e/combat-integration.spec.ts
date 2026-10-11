import { expect, test } from "@playwright/test";

import { defaultGameplayConfig } from "../../src/game/config/gameplayConfig";
import { updateEnemies } from "../../src/game/core/EnemySystem";
import type { EnemyState } from "../../src/game/core/EnemyState";
import type { PlayerState } from "../../src/game/core/PlayerState";
import { GameSimulation } from "../../src/game/core/GameSimulation";

const config = defaultGameplayConfig;

const idleMovement = {
    forward: false,
    turnLeft: false,
    turnRight: false,
};

const idleWeapons = {
    fireFront: false,
    fireLeftBroadside: false,
    fireRightBroadside: false,
};

test("chaser collision destroys itself without awarding a kill", () => {
    const player: PlayerState = {
        x: 120,
        y: 120,
        rotation: 0,
        health: config.playerMaxHealth,
    };

    const chaser: EnemyState = {
        id: 1,
        type: "chaser",
        x: 120,
        y: 120,
        rotation: 0,
        health: config.chaserMaxHealth,
        attackCooldownSeconds: 0,
    };

    const result = updateEnemies(
        [chaser],
        player,
        {
            x: config.islandX,
            y: config.islandY,
            collisionRadius: config.islandCollisionRadius,
        },
        config,
        0,
        1,
    );

    expect(result.enemies).toHaveLength(0);
    expect(result.chaserCollisions).toBe(1);
    expect(result.projectiles).toHaveLength(0);
});

test("stopped simulation ignores movement and firing", () => {
    const simulation = new GameSimulation(config);

    simulation.start();
    simulation.stop();

    const before = simulation.getSnapshot();

    simulation.update(
        1,
        { ...idleMovement, forward: true },
        { ...idleWeapons, fireFront: true },
    );

    const after = simulation.getSnapshot();

    expect(after.isRunning).toBe(false);
    expect(after.player).toEqual(before.player);
    expect(after.projectiles).toEqual(before.projectiles);
    expect(after.score).toBe(before.score);
});

test("restart restores initial combat state", () => {
    const simulation = new GameSimulation(config);

    simulation.start();

    simulation.update(0, idleMovement, {
        ...idleWeapons,
        fireFront: true,
    });

    expect(simulation.getSnapshot().projectiles).toHaveLength(1);

    simulation.start();

    const snapshot = simulation.getSnapshot();

    expect(snapshot.isRunning).toBe(true);
    expect(snapshot.isPaused).toBe(false);
    expect(snapshot.elapsedSeconds).toBe(0);
    expect(snapshot.player.health).toBe(config.playerMaxHealth);
    expect(snapshot.player.x).toBe(120);
    expect(snapshot.player.y).toBe(120);
    expect(snapshot.player.rotation).toBe(0);
    expect(snapshot.score).toBe(0);
    expect(snapshot.projectiles).toHaveLength(0);
    expect(snapshot.enemies).toHaveLength(0);
});

test("awards exactly one point for destroying an enemy", () => {
    const testConfig = {
        ...defaultGameplayConfig,
        enemySpawnIntervalSeconds: 2,
        chaserMoveSpeed: 0,
        shooterMoveSpeed: 0,
        chaserMaxHealth: 25,
        islandX: 1100,
        islandY: 600,
    };

    const spawnX = 120;
    const spawnY = 320;

    const randomValues = [
        (spawnX - testConfig.enemyCollisionRadius) /
            (testConfig.arenaWidth - 2 * testConfig.enemyCollisionRadius),
        (spawnY - testConfig.enemyCollisionRadius) /
            (testConfig.arenaHeight - 2 * testConfig.enemyCollisionRadius),
    ];

    let randomIndex = 0;

    const random = () => {
        const value = randomValues[randomIndex % randomValues.length];
        randomIndex++;
        return value;
    };

    const simulation = new GameSimulation(testConfig, random);

    simulation.start();

    // Gira 180 graus antes do surgimento do inimigo.
    simulation.update(
        1,
        {
            ...idleMovement,
            turnRight: true,
        },
        idleWeapons,
    );

    // Completa o intervalo de spawn.
    simulation.update(1, idleMovement, idleWeapons);

    const spawned = simulation.getSnapshot();

    expect(spawned.enemies).toHaveLength(1);
    expect(spawned.enemies[0].type).toBe("chaser");
    expect(spawned.enemies[0].x).toBeCloseTo(spawnX);
    expect(spawned.enemies[0].y).toBeCloseTo(spawnY);
    expect(spawned.score).toBe(0);

    const targetId = spawned.enemies[0].id;

    // Dispara para baixo, diretamente contra o Chaser.
    simulation.update(0.4, idleMovement, {
        ...idleWeapons,
        fireFront: true,
    });

    const afterShot = simulation.getSnapshot();

    expect(afterShot.score).toBe(1);
    expect(afterShot.enemies.some((enemy) => enemy.id === targetId)).toBe(
        false,
    );

    // Confirma que a eliminação não concede pontos novamente.
    simulation.update(0.1, idleMovement, idleWeapons);

    expect(simulation.getSnapshot().score).toBe(1);
});

test("chaser collision damages the player without awarding score", () => {
    const testConfig = {
        ...defaultGameplayConfig,
        enemySpawnIntervalSeconds: 2,
        chaserMoveSpeed: 200,
        shooterMoveSpeed: 0,
        islandX: 1100,
        islandY: 600,
    };

    const spawnX = 120;
    const spawnY = 320;

    const randomValues = [
        (spawnX - testConfig.enemyCollisionRadius) /
            (testConfig.arenaWidth - 2 * testConfig.enemyCollisionRadius),
        (spawnY - testConfig.enemyCollisionRadius) /
            (testConfig.arenaHeight - 2 * testConfig.enemyCollisionRadius),
    ];

    let randomIndex = 0;
    const random = () => randomValues[randomIndex++ % randomValues.length];

    const simulation = new GameSimulation(testConfig, random);

    simulation.start();

    // Approach the two-second spawn boundary.
    simulation.update(1.9, idleMovement, idleWeapons);
    simulation.update(0.05, idleMovement, idleWeapons);

    // Spawn and move the Chaser using a small time step.
    simulation.update(0.05, idleMovement, idleWeapons);

    const beforeCollision = simulation.getSnapshot();

    expect(beforeCollision.enemies).toHaveLength(1);
    expect(beforeCollision.enemies[0].type).toBe("chaser");
    expect(beforeCollision.player.health).toBe(testConfig.playerMaxHealth);
    expect(beforeCollision.score).toBe(0);

    // Let the Chaser reach the player before another enemy can spawn.
    for (let step = 0; step < 15; step++) {
        simulation.update(0.05, idleMovement, idleWeapons);
    }

    const afterCollision = simulation.getSnapshot();

    expect(afterCollision.player.health).toBe(
        testConfig.playerMaxHealth - testConfig.chaserCollisionDamage,
    );

    expect(afterCollision.enemies).toHaveLength(0);
    expect(afterCollision.score).toBe(0);
    expect(afterCollision.isRunning).toBe(true);

    // The destroyed Chaser must not damage the player again.
    simulation.update(0.1, idleMovement, idleWeapons);

    const afterAnotherUpdate = simulation.getSnapshot();

    expect(afterAnotherUpdate.player.health).toBe(afterCollision.player.health);
    expect(afterAnotherUpdate.score).toBe(0);
    expect(afterAnotherUpdate.enemies).toHaveLength(0);
});

test("lethal chaser collision stops combat immediately", () => {
    const testConfig = {
        ...defaultGameplayConfig,
        enemySpawnIntervalSeconds: 2,
        chaserMoveSpeed: 200,
        shooterMoveSpeed: 0,
        chaserCollisionDamage: defaultGameplayConfig.playerMaxHealth,
        islandX: 1100,
        islandY: 600,
    };

    const spawnX = 120;
    const spawnY = 320;

    const randomValues = [
        (spawnX - testConfig.enemyCollisionRadius) /
            (testConfig.arenaWidth - 2 * testConfig.enemyCollisionRadius),
        (spawnY - testConfig.enemyCollisionRadius) /
            (testConfig.arenaHeight - 2 * testConfig.enemyCollisionRadius),
    ];

    let randomIndex = 0;
    const random = () => randomValues[randomIndex++ % randomValues.length];

    const simulation = new GameSimulation(testConfig, random);

    simulation.start();

    // Approach the two-second spawn boundary.
    simulation.update(1.9, idleMovement, idleWeapons);
    simulation.update(0.05, idleMovement, idleWeapons);

    // Spawn and move the Chaser using a small time step.
    simulation.update(0.05, idleMovement, idleWeapons);

    const beforeCollision = simulation.getSnapshot();

    expect(beforeCollision.enemies).toHaveLength(1);
    expect(beforeCollision.enemies[0].type).toBe("chaser");
    expect(beforeCollision.player.health).toBe(testConfig.playerMaxHealth);
    expect(beforeCollision.isRunning).toBe(true);

    // Advance until the lethal collision happens.
    for (let step = 0; step < 15; step++) {
        simulation.update(0.05, idleMovement, idleWeapons);
    }

    const dead = simulation.getSnapshot();

    expect(dead.endReason).toBe("destroyed");

    expect(dead.player.health).toBe(0);
    expect(dead.isRunning).toBe(false);
    expect(dead.score).toBe(0);
    expect(dead.enemies).toHaveLength(0);

    // Movement and attacks must not change a finished simulation.
    simulation.update(
        1,
        {
            ...idleMovement,
            forward: true,
        },
        {
            ...idleWeapons,
            fireFront: true,
        },
    );

    const afterAttempt = simulation.getSnapshot();

    expect(afterAttempt).toEqual(dead);
});
