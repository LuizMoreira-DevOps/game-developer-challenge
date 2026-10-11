import { expect, test } from "@playwright/test";

import { defaultGameplayConfig } from "../../src/game/config/gameplayConfig";
import { GameRuntime } from "../../src/game/core/GameRuntime";
import { GameSimulation } from "../../src/game/core/GameSimulation";
import { CompositeGameInput } from "../../src/game/input/CompositeGameInput";
import type { GameInput } from "../../src/game/input/GameInput";
import { TouchInput } from "../../src/game/input/TouchInput";

test("maps all six touch actions to gameplay input", () => {
    const input = new TouchInput();

    input.press("forward", 1);
    input.press("turnLeft", 2);
    input.press("turnRight", 3);
    input.press("fireFront", 4);
    input.press("fireLeftBroadside", 5);
    input.press("fireRightBroadside", 6);

    expect(input.getMovementInput()).toEqual({
        forward: true,
        turnLeft: true,
        turnRight: true,
    });

    expect(input.getWeaponInput()).toEqual({
        fireFront: true,
        fireLeftBroadside: true,
        fireRightBroadside: true,
    });
});

test("independent pointers support simultaneous movement and fire", () => {
    const input = new TouchInput();

    input.press("forward", 11);
    input.press("fireFront", 12);

    expect(input.getMovementInput().forward).toBe(true);
    expect(input.getWeaponInput().fireFront).toBe(true);

    input.release(11);

    expect(input.getMovementInput().forward).toBe(false);
    expect(input.getWeaponInput().fireFront).toBe(true);

    input.release(12);

    expect(input.getWeaponInput().fireFront).toBe(false);
});

test("releasing one of two pointers preserves a held action", () => {
    const input = new TouchInput();

    input.press("forward", 1);
    input.press("forward", 2);

    input.release(1);

    expect(input.getMovementInput().forward).toBe(true);

    input.release(2);

    expect(input.getMovementInput().forward).toBe(false);
});

test("composite input combines keyboard and touch actions", () => {
    let keyboardCleared = false;

    const keyboard: GameInput = {
        getMovementInput: () => ({
            forward: false,
            turnLeft: true,
            turnRight: false,
        }),

        getWeaponInput: () => ({
            fireFront: false,
            fireLeftBroadside: true,
            fireRightBroadside: false,
        }),

        clear: () => {
            keyboardCleared = true;
        },
    };

    const touch = new TouchInput();
    touch.press("forward", 1);
    touch.press("fireFront", 2);

    const input = new CompositeGameInput([keyboard, touch]);

    expect(input.getMovementInput()).toEqual({
        forward: true,
        turnLeft: true,
        turnRight: false,
    });

    expect(input.getWeaponInput()).toEqual({
        fireFront: true,
        fireLeftBroadside: true,
        fireRightBroadside: false,
    });

    input.clear();

    expect(keyboardCleared).toBe(true);
    expect(touch.getMovementInput().forward).toBe(false);
    expect(touch.getWeaponInput().fireFront).toBe(false);
});

test("pausing the runtime clears active touch pointers", () => {
    const touch = new TouchInput();
    const input = new CompositeGameInput([touch]);

    const simulation = new GameSimulation(defaultGameplayConfig);

    const runtime = new GameRuntime(
        simulation,
        {
            render: () => undefined,
        },
        input,
    );

    runtime.start();

    touch.press("forward", 1);
    touch.press("fireFront", 2);

    runtime.pause();

    expect(simulation.getSnapshot().isPaused).toBe(true);
    expect(touch.getMovementInput().forward).toBe(false);
    expect(touch.getWeaponInput().fireFront).toBe(false);

    runtime.resume();

    expect(touch.getMovementInput().forward).toBe(false);
    expect(touch.getWeaponInput().fireFront).toBe(false);
});
