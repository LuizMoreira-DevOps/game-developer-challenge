import type { GameplayConfig } from "../config/gameplayConfig";
import type { PlayerMovementInput, PlayerState } from "./PlayerState";
import { updatePlayerMovement } from "./updatePlayerMovement";

export interface GameSimulationSnapshot {
    readonly elapsedSeconds: number;
    readonly isRunning: boolean;
    readonly isPaused: boolean;
    readonly player: Readonly<PlayerState>;
}

export class GameSimulation {
    private elapsedSeconds = 0;
    private isRunning = false;
    private isPaused = false;
    private readonly config: GameplayConfig;
    private readonly player: PlayerState = {
        x: 120,
        y: 120,
        rotation: 0,
    };

    public constructor(config: GameplayConfig) {
        this.config = config;
    }

    public start(): void {
        this.elapsedSeconds = 0;
        this.isRunning = true;
        this.isPaused = false;
    }

    public update(deltaSeconds: number, input: PlayerMovementInput): void {
        if (!this.isRunning || this.isPaused) {
            return;
        }

        updatePlayerMovement(this.player, input, this.config, deltaSeconds);

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
            player: this.player,
        };
    }
}
