import { expect, test } from "@playwright/test";
import type { GameInput } from "../../src/game/input/GameInput";
import type { PlayerMovementInput } from "../../src/game/core/PlayerState";

import type { PlayerWeaponInput } from "../../src/game/input/PlayerWeaponInput";

import { defaultGameplayConfig } from "../../src/game/config/gameplayConfig";
import {
    type GameRenderer,
    GameRuntime,
} from "../../src/game/core/GameRuntime";
import {
    type GameSimulationSnapshot,
    GameSimulation,
} from "../../src/game/core/GameSimulation";

class TestRenderer implements GameRenderer {
    public snapshots: GameSimulationSnapshot[] = [];

    public render(snapshot: GameSimulationSnapshot): void {
        this.snapshots.push(snapshot);
    }
}

class TestInput implements GameInput {
    public getMovementInput(): PlayerMovementInput {
        return {
            forward: false,
            turnLeft: false,
            turnRight: false,
        };
    }

    public clear(): void {}

    public getWeaponInput(): PlayerWeaponInput {
        return {
            fireFront: false,
            fireLeftBroadside: false,
            fireRightBroadside: false,
        };
    }
}

test("updates the simulation and forwards its snapshot to the renderer", () => {
    const simulation = new GameSimulation(defaultGameplayConfig);
    const renderer = new TestRenderer();
    const input = new TestInput();
    const runtime = new GameRuntime(simulation, renderer, input);

    runtime.start();
    runtime.update(0.5);

    expect(renderer.snapshots).toHaveLength(1);
    expect(renderer.snapshots[0]).toEqual(
        expect.objectContaining({
            elapsedSeconds: 0.5,
            isRunning: true,
            isPaused: false,
        }),
    );
});
