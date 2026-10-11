import { expect, test } from "@playwright/test";

import { defaultGameplayConfig } from "../../src/game/config/gameplayConfig";
import { createPlayerProjectiles } from "../../src/game/core/createPlayerProjectiles";
import type { PlayerState } from "../../src/game/core/PlayerState";
import { updateProjectiles } from "../../src/game/core/updateProjectiles";

const player: PlayerState = {
    x: 400,
    y: 300,
    rotation: 0,
};

test("creates one front projectile", () => {
    const projectiles = createPlayerProjectiles(
        player,
        "front",
        1,
        defaultGameplayConfig,
    );

    expect(projectiles).toHaveLength(1);

    expect(projectiles[0]).toEqual(
        expect.objectContaining({
            id: 1,
            x: 400,
            y: 300,
            rotation: 0,
            speed: defaultGameplayConfig.projectileSpeed,
            damage: defaultGameplayConfig.projectileDamage,
        }),
    );
});

test("creates three parallel left broadside projectiles", () => {
    const projectiles = createPlayerProjectiles(
        player,
        "leftBroadside",
        10,
        defaultGameplayConfig,
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
        defaultGameplayConfig,
    );

    expect(projectiles).toHaveLength(3);

    for (const projectile of projectiles) {
        expect(projectile.rotation).toBeCloseTo(Math.PI / 2);
    }
});

test("moves projectiles using delta time", () => {
    const projectiles = createPlayerProjectiles(
        player,
        "front",
        1,
        defaultGameplayConfig,
    );

    const updated = updateProjectiles(projectiles, 0.5);

    expect(updated[0].x).toBeCloseTo(400);

    expect(updated[0].y).toBeCloseTo(
        300 - defaultGameplayConfig.projectileSpeed * 0.5,
    );

    expect(updated[0].remainingLifetimeSeconds).toBeCloseTo(
        defaultGameplayConfig.projectileLifetimeSeconds - 0.5,
    );
});

test("removes expired projectiles", () => {
    const projectiles = createPlayerProjectiles(
        player,
        "front",
        1,
        defaultGameplayConfig,
    );

    const updated = updateProjectiles(
        projectiles,
        defaultGameplayConfig.projectileLifetimeSeconds,
    );

    expect(updated).toHaveLength(0);
});
