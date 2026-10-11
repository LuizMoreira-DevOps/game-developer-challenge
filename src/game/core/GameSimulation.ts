import type { GameplayConfig } from "../config/gameplayConfig";
import type { PlayerWeaponInput } from "../input/PlayerWeaponInput";

import {
    createPlayerProjectiles,
    type PlayerWeaponType,
} from "./createPlayerProjectiles";
import type { PlayerMovementInput, PlayerState } from "./PlayerState";
import type { ProjectileState } from "./ProjectileState";
import { updatePlayerMovement } from "./updatePlayerMovement";
import { updateProjectiles } from "./updateProjectiles";

export interface GameSimulationSnapshot {
    readonly elapsedSeconds: number;
    readonly isRunning: boolean;
    readonly isPaused: boolean;
    readonly player: Readonly<PlayerState>;
    readonly projectiles: readonly Readonly<ProjectileState>[];
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

    private projectiles: ProjectileState[] = [];

    private nextProjectileId = 1;

    private frontFireCooldownSeconds = 0;
    private leftBroadsideCooldownSeconds = 0;
    private rightBroadsideCooldownSeconds = 0;

    public constructor(config: GameplayConfig) {
        this.config = config;
    }

    public start(): void {
        this.elapsedSeconds = 0;
        this.isRunning = true;
        this.isPaused = false;

        this.projectiles = [];
        this.nextProjectileId = 1;

        this.frontFireCooldownSeconds = 0;
        this.leftBroadsideCooldownSeconds = 0;
        this.rightBroadsideCooldownSeconds = 0;
    }

    public update(
        deltaSeconds: number,
        movementInput: PlayerMovementInput,
        weaponInput: PlayerWeaponInput,
    ): void {
        if (!this.isRunning || this.isPaused) {
            return;
        }

        updatePlayerMovement(
            this.player,
            movementInput,
            this.config,
            deltaSeconds,
        );

        this.updateWeaponCooldowns(deltaSeconds);

        this.projectiles = updateProjectiles(this.projectiles, deltaSeconds);

        this.handleWeaponInput(weaponInput);

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
            player: {
                ...this.player,
            },
            projectiles: this.projectiles.map((projectile) => ({
                ...projectile,
            })),
        };
    }

    private updateWeaponCooldowns(deltaSeconds: number): void {
        this.frontFireCooldownSeconds = Math.max(
            0,
            this.frontFireCooldownSeconds - deltaSeconds,
        );

        this.leftBroadsideCooldownSeconds = Math.max(
            0,
            this.leftBroadsideCooldownSeconds - deltaSeconds,
        );

        this.rightBroadsideCooldownSeconds = Math.max(
            0,
            this.rightBroadsideCooldownSeconds - deltaSeconds,
        );
    }

    private handleWeaponInput(input: PlayerWeaponInput): void {
        if (input.fireFront && this.frontFireCooldownSeconds === 0) {
            this.spawnProjectiles("front");

            this.frontFireCooldownSeconds =
                this.config.frontFireCooldownSeconds;
        }

        if (
            input.fireLeftBroadside &&
            this.leftBroadsideCooldownSeconds === 0
        ) {
            this.spawnProjectiles("leftBroadside");

            this.leftBroadsideCooldownSeconds =
                this.config.broadsideCooldownSeconds;
        }

        if (
            input.fireRightBroadside &&
            this.rightBroadsideCooldownSeconds === 0
        ) {
            this.spawnProjectiles("rightBroadside");

            this.rightBroadsideCooldownSeconds =
                this.config.broadsideCooldownSeconds;
        }
    }

    private spawnProjectiles(weapon: PlayerWeaponType): void {
        const projectiles = createPlayerProjectiles(
            this.player,
            weapon,
            this.nextProjectileId,
            this.config,
        );

        this.nextProjectileId += projectiles.length;

        this.projectiles.push(...projectiles);
    }
}
