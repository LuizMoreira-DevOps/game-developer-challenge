import { expect, test } from "@playwright/test";

import { defaultGameplayConfig } from "../../src/game/config/gameplayConfig";
import { GameSimulation } from "../../src/game/core/GameSimulation";

import type { PlayerMovementInput } from "../../src/game/core/PlayerState";

import type { PlayerWeaponInput } from "../../src/game/input/PlayerWeaponInput";

const idleInput: PlayerMovementInput = {
    forward: false,
    turnLeft: false,
    turnRight: false,
};

const idleWeaponInput: PlayerWeaponInput = {
    fireFront: false,
    fireLeftBroadside: false,
    fireRightBroadside: false,
};

test("advances elapsed time using delta time", () => {
    const simulation = new GameSimulation(defaultGameplayConfig);

    simulation.start();
    simulation.update(0.5, idleInput, idleWeaponInput);
    simulation.update(0.25, idleInput, idleWeaponInput);

    expect(simulation.getSnapshot()).toEqual(
        expect.objectContaining({
            elapsedSeconds: 0.75,
            isRunning: true,
            isPaused: false,
        }),
    );
});

test("does not advance while paused", () => {
    const simulation = new GameSimulation(defaultGameplayConfig);

    simulation.start();
    simulation.update(1, idleInput, idleWeaponInput);
    simulation.pause();
    simulation.update(5, idleInput, idleWeaponInput);

    expect(simulation.getSnapshot().elapsedSeconds).toBe(1);
});

test("resumes updates after being paused", () => {
    const simulation = new GameSimulation(defaultGameplayConfig);

    simulation.start();
    simulation.update(1, idleInput, idleWeaponInput);
    simulation.pause();
    simulation.update(5, idleInput, idleWeaponInput);
    simulation.resume();
    simulation.update(0.5, idleInput, idleWeaponInput);

    expect(simulation.getSnapshot()).toEqual(
        expect.objectContaining({
            elapsedSeconds: 1.5,
            isRunning: true,
            isPaused: false,
        }),
    );
});

test("does not advance after being stopped", () => {
    const simulation = new GameSimulation(defaultGameplayConfig);

    simulation.start();
    simulation.update(1, idleInput, idleWeaponInput);
    simulation.stop();
    simulation.update(5, idleInput, idleWeaponInput);

    expect(simulation.getSnapshot()).toEqual(
        expect.objectContaining({
            elapsedSeconds: 1,
            isRunning: false,
            isPaused: false,
        }),
    );
});
