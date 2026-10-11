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
        this.simulation.start();
    }

    public update(deltaSeconds: number): void {
        const movementInput = this.input.getMovementInput();

        this.simulation.update(deltaSeconds, movementInput);

        this.renderer.render(this.simulation.getSnapshot());
    }

    public pause(): void {
        this.simulation.pause();
    }

    public resume(): void {
        this.simulation.resume();
    }

    public stop(): void {
        this.simulation.stop();
    }
}
