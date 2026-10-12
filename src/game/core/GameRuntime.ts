import type { GameSimulationSnapshot } from "./GameSimulation";
import type { GameInput } from "../input/GameInput";
import { GameSimulation } from "./GameSimulation";

export interface GameRenderer {
    render(snapshot: GameSimulationSnapshot): void;
}

export class GameRuntime {
    private readonly simulation: GameSimulation;
    private readonly renderer: GameRenderer;
    private readonly input: GameInput;

    public constructor(
        simulation: GameSimulation,
        renderer: GameRenderer,
        input: GameInput,
    ) {
        this.simulation = simulation;
        this.renderer = renderer;
        this.input = input;
    }

    public start(): void {
        this.input.clear();
        this.simulation.start();
    }

    public update(deltaSeconds: number): GameSimulationSnapshot {
        const movementInput = this.input.getMovementInput();
        const weaponInput = this.input.getWeaponInput();

        this.simulation.update(deltaSeconds, movementInput, weaponInput);

        const snapshot = this.simulation.getSnapshot();

        this.renderer.render(snapshot);

        return snapshot;
    }

    public pause(): void {
        this.input.clear();
        this.simulation.pause();
    }

    public resume(): void {
        this.input.clear();
        this.simulation.resume();
    }

    public stop(): void {
        this.input.clear();
        this.simulation.stop();
    }
}
