import { expect, test } from "@playwright/test";

import { defaultGameplayConfig } from "../../src/game/config/gameplayConfig";
import { GameSimulation } from "../../src/game/core/GameSimulation";

test("advances elapsed time using delta time", () => {
    const simulation = new GameSimulation(defaultGameplayConfig);

    simulation.start();
    simulation.update(0.5);
    simulation.update(0.25);

    expect(simulation.getSnapshot()).toEqual({
        elapsedSeconds: 0.75,
        isRunning: true,
        isPaused: false,
    });
});

test("does not advance while paused", () => {
    const simulation = new GameSimulation(defaultGameplayConfig);

    simulation.start();
    simulation.update(1);
    simulation.pause();
    simulation.update(5);

    expect(simulation.getSnapshot().elapsedSeconds).toBe(1);
});

test("resumes updates after being paused", () => {
    const simulation = new GameSimulation(defaultGameplayConfig);

    simulation.start();
    simulation.update(1);
    simulation.pause();
    simulation.update(5);
    simulation.resume();
    simulation.update(0.5);

    expect(simulation.getSnapshot()).toEqual({
        elapsedSeconds: 1.5,
        isRunning: true,
        isPaused: false,
    });
});

test("does not advance after being stopped", () => {
    const simulation = new GameSimulation(defaultGameplayConfig);

    simulation.start();
    simulation.update(1);
    simulation.stop();
    simulation.update(5);

    expect(simulation.getSnapshot()).toEqual({
        elapsedSeconds: 1,
        isRunning: false,
        isPaused: false,
    });
});
