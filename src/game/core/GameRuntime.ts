import type { GameSimulationSnapshot } from "./GameSimulation";
import { GameSimulation } from "./GameSimulation";

export interface GameRenderer {
    render(snapshot: GameSimulationSnapshot): void;
}

export class GameRuntime {
    private readonly simulation: GameSimulation;
    private readonly renderer: GameRenderer;

    public constructor(simulation: GameSimulation, renderer: GameRenderer) {
        this.simulation = simulation;
        this.renderer = renderer;
    }

    public start(): void {
        this.simulation.start();
    }

    public update(deltaSeconds: number): void {
        this.simulation.update(deltaSeconds);
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
