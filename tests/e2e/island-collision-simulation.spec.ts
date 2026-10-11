import { expect, test } from "@playwright/test";

import { defaultGameplayConfig } from "../../src/game/config/gameplayConfig";
import { GameSimulation } from "../../src/game/core/GameSimulation";

import type { PlayerMovementInput } from "../../src/game/core/PlayerState";
import type { PlayerWeaponInput } from "../../src/game/input/PlayerWeaponInput";

const idleMovement: PlayerMovementInput = {
    forward: false,
    turnLeft: false,
    turnRight: false,
};

const idleWeapons: PlayerWeaponInput = {
    fireFront: false,
    fireLeftBroadside: false,
    fireRightBroadside: false,
};

const collisionConfig = {
    ...defaultGameplayConfig,
    islandX: 300,
    islandY: 120,
};

test("prevents the player from moving through the island", () => {
    const simulation = new GameSimulation(collisionConfig);

    simulation.start();

    simulation.update(
        0.5,
        {
            ...idleMovement,
            turnRight: true,
        },
        idleWeapons,
    );

    simulation.update(
        0.5,
        {
            ...idleMovement,
            forward: true,
        },
        idleWeapons,
    );

    const snapshot = simulation.getSnapshot();

    expect(snapshot.player.x).toBeCloseTo(
        collisionConfig.islandX -
            collisionConfig.islandCollisionRadius -
            collisionConfig.playerCollisionRadius,
    );

    expect(snapshot.player.y).toBeCloseTo(120);
});

test("allows the player to continue moving around the island", () => {
    const simulation = new GameSimulation(collisionConfig);

    simulation.start();

    simulation.update(
        0.5,
        {
            ...idleMovement,
            turnRight: true,
        },
        idleWeapons,
    );

    simulation.update(
        0.5,
        {
            ...idleMovement,
            forward: true,
        },
        idleWeapons,
    );

    const blockedPosition = simulation.getSnapshot().player;

    simulation.update(
        0.5,
        {
            ...idleMovement,
            turnLeft: true,
        },
        idleWeapons,
    );

    simulation.update(
        0.2,
        {
            ...idleMovement,
            forward: true,
        },
        idleWeapons,
    );

    const movedPosition = simulation.getSnapshot().player;

    expect(movedPosition.x).toBeCloseTo(blockedPosition.x);

    expect(movedPosition.y).toBeLessThan(blockedPosition.y);
});
