import { expect, test } from "@playwright/test";

import { defaultGameplayConfig as config } from "../../src/game/config/gameplayConfig";
import { createPlayerProjectiles } from "../../src/game/core/createPlayerProjectiles";
import type { PlayerState } from "../../src/game/core/PlayerState";
import { updateProjectiles } from "../../src/game/core/updateProjectiles";

const player: PlayerState = {
    x: 400,
    y: 300,
    rotation: 0,
    health: config.playerMaxHealth,
};

test("creates one front projectile", () => {
    const projectiles = createPlayerProjectiles(player, "front", 1, config);

    expect(projectiles).toHaveLength(1);

    expect(projectiles[0]).toEqual(
        expect.objectContaining({
            id: 1,
            x: 400,
            y: 300,
            rotation: 0,
            speed: config.projectileSpeed,
            damage: config.projectileDamage,
        }),
    );
});

test("creates three parallel left broadside projectiles", () => {
    const projectiles = createPlayerProjectiles(
        player,
        "leftBroadside",
        10,
        config,
    );

    expect(projectiles).toHaveLength(3);

    expect(projectiles.map((projectile) => projectile.id)).toEqual([
        10, 11, 12,
    ]);

    for (const projectile of projectiles) {
        expect(projectile.rotation).toBeCloseTo(-Math.PI / 2);
    }
});

test("creates three parallel right broadside projectiles", () => {
    const projectiles = createPlayerProjectiles(
        player,
        "rightBroadside",
        20,
        config,
    );

    expect(projectiles).toHaveLength(3);

    for (const projectile of projectiles) {
        expect(projectile.rotation).toBeCloseTo(Math.PI / 2);
    }
});

test("moves projectiles using delta time", () => {
    const projectiles = createPlayerProjectiles(player, "front", 1, config);

    const updated = updateProjectiles(projectiles, 0.5);

    expect(updated[0].x).toBeCloseTo(400);

    expect(updated[0].y).toBeCloseTo(300 - config.projectileSpeed * 0.5);

    expect(updated[0].remainingLifetimeSeconds).toBeCloseTo(
        config.projectileLifetimeSeconds - 0.5,
    );
});

test("removes expired projectiles", () => {
    const projectiles = createPlayerProjectiles(player, "front", 1, config);

    const updated = updateProjectiles(
        projectiles,
        config.projectileLifetimeSeconds,
    );

    expect(updated).toHaveLength(0);
});
