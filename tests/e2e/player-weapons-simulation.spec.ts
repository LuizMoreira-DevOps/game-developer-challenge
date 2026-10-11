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

test("fires a front projectile from the simulation", () => {
    const simulation = new GameSimulation(defaultGameplayConfig);

    simulation.start();

    simulation.update(0, idleMovement, {
        ...idleWeapons,
        fireFront: true,
    });

    expect(simulation.getSnapshot().projectiles).toHaveLength(1);
});

test("prevents front fire during cooldown", () => {
    const simulation = new GameSimulation(defaultGameplayConfig);

    simulation.start();

    const fireFront: PlayerWeaponInput = {
        ...idleWeapons,
        fireFront: true,
    };

    simulation.update(0, idleMovement, fireFront);

    simulation.update(0.1, idleMovement, fireFront);

    expect(simulation.getSnapshot().projectiles).toHaveLength(1);
});

test("allows movement and firing simultaneously", () => {
    const simulation = new GameSimulation(defaultGameplayConfig);

    simulation.start();

    const initialPlayer = simulation.getSnapshot().player;

    simulation.update(
        0.5,
        {
            ...idleMovement,
            forward: true,
        },
        {
            ...idleWeapons,
            fireFront: true,
        },
    );

    const snapshot = simulation.getSnapshot();

    expect(snapshot.player.y).toBeLessThan(initialPlayer.y);

    expect(snapshot.projectiles).toHaveLength(1);
});

test("prevents repeated broadside fire during cooldown", () => {
    const simulation = new GameSimulation(defaultGameplayConfig);

    simulation.start();

    const fireLeft: PlayerWeaponInput = {
        ...idleWeapons,
        fireLeftBroadside: true,
    };

    simulation.update(0, idleMovement, fireLeft);

    simulation.update(0.1, idleMovement, fireLeft);

    expect(simulation.getSnapshot().projectiles).toHaveLength(3);
});

test("allows left and right broadsides independently", () => {
    const simulation = new GameSimulation(defaultGameplayConfig);

    simulation.start();

    simulation.update(0, idleMovement, {
        ...idleWeapons,
        fireLeftBroadside: true,
    });

    simulation.update(0, idleMovement, {
        ...idleWeapons,
        fireRightBroadside: true,
    });

    expect(simulation.getSnapshot().projectiles).toHaveLength(6);
});
