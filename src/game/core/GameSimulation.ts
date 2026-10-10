import type { GameplayConfig } from "../config/gameplayConfig";

export interface GameSimulationSnapshot {
    readonly elapsedSeconds: number;
    readonly isRunning: boolean;
    readonly isPaused: boolean;
}

export class GameSimulation {
    private elapsedSeconds = 0;
    private isRunning = false;
    private isPaused = false;
    private readonly config: GameplayConfig;

    public constructor(config: GameplayConfig) {
        this.config = config;
    }

    public start(): void {
        this.elapsedSeconds = 0;
        this.isRunning = true;
        this.isPaused = false;
    }

    public update(deltaSeconds: number): void {
        if (!this.isRunning || this.isPaused) {
            return;
        }

        this.elapsedSeconds = Math.min(
            this.elapsedSeconds + deltaSeconds,
            this.config.matchDurationSeconds,
        );

        if (this.elapsedSeconds >= this.config.matchDurationSeconds) {
            this.stop();
        }
    }

    public pause(): void {
        if (this.isRunning) {
            this.isPaused = true;
        }
    }

    public resume(): void {
        if (this.isRunning) {
            this.isPaused = false;
        }
    }

    public stop(): void {
        this.isRunning = false;
        this.isPaused = false;
    }

    public getSnapshot(): GameSimulationSnapshot {
        return {
            elapsedSeconds: this.elapsedSeconds,
            isRunning: this.isRunning,
            isPaused: this.isPaused,
        };
    }
}
