import { expect, test } from "@playwright/test";

import { defaultGameplayConfig } from "../../src/game/config/gameplayConfig";
import { GameSimulation } from "../../src/game/core/GameSimulation";

const config = {
    ...defaultGameplayConfig,
    matchDurationSeconds: 60,
    enemySpawnIntervalSeconds: 999,
};

const movement = {
    forward: false,
    turnLeft: false,
    turnRight: false,
};

const weapons = {
    fireFront: false,
    fireLeftBroadside: false,
    fireRightBroadside: false,
};

test("validates match duration boundaries", () => {
    for (const duration of [59, 181, Number.NaN]) {
        expect(
            () =>
                new GameSimulation({
                    ...config,
                    matchDurationSeconds: duration,
                }),
        ).toThrow(RangeError);
    }

    for (const duration of [60, 90, 180]) {
        expect(
            () =>
                new GameSimulation({
                    ...config,
                    matchDurationSeconds: duration,
                }),
        ).not.toThrow();
    }
});

test("ends the match when active time reaches zero", () => {
    const simulation = new GameSimulation(config);

    simulation.start();
    simulation.update(59.9, movement, weapons);

    expect(simulation.getSnapshot().isRunning).toBe(true);
    expect(simulation.getSnapshot().remainingSeconds).toBeCloseTo(0.1);

    simulation.update(1, movement, weapons);

    const finished = simulation.getSnapshot();

    expect(finished.elapsedSeconds).toBe(60);
    expect(finished.remainingSeconds).toBe(0);
    expect(finished.isRunning).toBe(false);
    expect(finished.endReason).toBe("time");

    simulation.update(
        5,
        { ...movement, forward: true },
        { ...weapons, fireFront: true },
    );

    expect(simulation.getSnapshot()).toEqual(finished);
});

test("pause freezes the simulation until resume", () => {
    const simulation = new GameSimulation(config);

    simulation.start();
    simulation.update(1.5, movement, weapons);
    simulation.pause();

    const paused = simulation.getSnapshot();

    simulation.update(
        20,
        { ...movement, forward: true },
        { ...weapons, fireFront: true },
    );

    expect(simulation.getSnapshot()).toEqual(paused);

    simulation.resume();
    simulation.update(0.25, movement, weapons);

    expect(simulation.getSnapshot().elapsedSeconds).toBe(1.75);
    expect(simulation.getSnapshot().isPaused).toBe(false);
});

test("weapon cooldown remains frozen during pause", () => {
    const simulation = new GameSimulation(config);
    const fire = { ...weapons, fireFront: true };

    simulation.start();
    simulation.update(0, movement, fire);

    expect(simulation.getSnapshot().projectiles).toHaveLength(1);

    simulation.pause();
    simulation.update(10, movement, fire);
    simulation.resume();

    simulation.update(0.1, movement, fire);

    expect(simulation.getSnapshot().projectiles.map((p) => p.id)).toEqual([1]);

    simulation.update(0.31, movement, weapons);
    simulation.update(0, movement, fire);

    const projectileIds = simulation
        .getSnapshot()
        .projectiles.map((projectile) => projectile.id);

    expect(projectileIds).toContain(2);
});

test("enemy spawn timer remains frozen during pause", () => {
    const spawnConfig = {
        ...config,
        enemySpawnIntervalSeconds: 2,
        chaserMoveSpeed: 0,
        islandX: 1100,
        islandY: 600,
    };

    const randomValues = [
        (120 - spawnConfig.enemyCollisionRadius) /
            (spawnConfig.arenaWidth - 2 * spawnConfig.enemyCollisionRadius),
        (320 - spawnConfig.enemyCollisionRadius) /
            (spawnConfig.arenaHeight - 2 * spawnConfig.enemyCollisionRadius),
    ];

    let index = 0;

    const simulation = new GameSimulation(
        spawnConfig,
        () => randomValues[index++ % randomValues.length],
    );

    simulation.start();
    simulation.update(1.5, movement, weapons);

    simulation.pause();
    simulation.update(10, movement, weapons);

    expect(simulation.getSnapshot().enemies).toHaveLength(0);

    simulation.resume();
    simulation.update(0.4, movement, weapons);

    expect(simulation.getSnapshot().enemies).toHaveLength(0);

    simulation.update(0.1, movement, weapons);

    expect(simulation.getSnapshot().enemies).toHaveLength(1);
});

test("restart restores a clean match", () => {
    const simulation = new GameSimulation(config);

    simulation.start();
    simulation.update(60, movement, weapons);

    expect(simulation.getSnapshot().endReason).toBe("time");

    simulation.start();

    const restarted = simulation.getSnapshot();

    expect(restarted.isRunning).toBe(true);
    expect(restarted.isPaused).toBe(false);
    expect(restarted.endReason).toBeNull();
    expect(restarted.elapsedSeconds).toBe(0);
    expect(restarted.remainingSeconds).toBe(60);
    expect(restarted.player.health).toBe(config.playerMaxHealth);
    expect(restarted.score).toBe(0);
    expect(restarted.enemies).toHaveLength(0);
    expect(restarted.projectiles).toHaveLength(0);
});

test("caps gameplay updates at the remaining match time", () => {
    const simulation = new GameSimulation(config);

    simulation.start();
    simulation.update(59.9, movement, weapons);

    const before = simulation.getSnapshot().player;

    simulation.update(1, { ...movement, forward: true }, weapons);

    const after = simulation.getSnapshot();

    const displacement = Math.hypot(
        after.player.x - before.x,
        after.player.y - before.y,
    );

    expect(displacement).toBeLessThanOrEqual(
        config.playerMoveSpeed * 0.1 + 0.001,
    );

    expect(after.remainingSeconds).toBe(0);
    expect(after.endReason).toBe("time");
    expect(after.isRunning).toBe(false);
});
