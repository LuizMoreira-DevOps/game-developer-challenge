import type { GameplayConfig } from "../config/gameplayConfig";
import type { PlayerWeaponInput } from "../input/PlayerWeaponInput";

import { resolveCircleOverlap } from "./collision/resolveCircleOverlap";
import { resolveCombat } from "./CombatSystem";
import {
    createPlayerProjectiles,
    type PlayerWeaponType,
} from "./createPlayerProjectiles";
import { createEnemy, updateEnemies } from "./EnemySystem";
import type { EnemyState, EnemyType } from "./EnemyState";
import type { IslandState } from "./IslandState";
import type { PlayerMovementInput, PlayerState } from "./PlayerState";
import type { ProjectileState } from "./ProjectileState";
import { updatePlayerMovement } from "./updatePlayerMovement";

export type MatchEndReason = "time" | "destroyed" | null;

export interface GameSimulationSnapshot {
    readonly elapsedSeconds: number;
    readonly isRunning: boolean;
    readonly isPaused: boolean;
    readonly score: number;
    readonly player: Readonly<PlayerState>;
    readonly projectiles: readonly Readonly<ProjectileState>[];
    readonly island: Readonly<IslandState>;
    readonly enemies: readonly Readonly<EnemyState>[];
    readonly remainingSeconds: number;
    readonly endReason: MatchEndReason;
}

export class GameSimulation {
    private elapsedSeconds = 0;
    private isRunning = false;
    private isPaused = false;
    private score = 0;

    private readonly config: GameplayConfig;

    private readonly player: PlayerState = {
        x: 120,
        y: 120,
        rotation: 0,
        health: 0,
    };

    private readonly island: IslandState;

    private projectiles: ProjectileState[] = [];
    private nextProjectileId = 1;

    private frontFireCooldownSeconds = 0;
    private leftBroadsideCooldownSeconds = 0;
    private rightBroadsideCooldownSeconds = 0;

    private enemies: EnemyState[] = [];
    private nextEnemyId = 1;
    private enemySpawnTimerSeconds = 0;
    private nextEnemyType: EnemyType = "chaser";

    private readonly random: () => number;

    private endReason: MatchEndReason = null;

    public constructor(
        config: GameplayConfig,
        random: () => number = Math.random,
    ) {
        if (
            !Number.isFinite(config.matchDurationSeconds) ||
            config.matchDurationSeconds < 60 ||
            config.matchDurationSeconds > 180
        ) {
            throw new RangeError(
                "Match duration must be between 60 and 180 seconds.",
            );
        }

        if (
            !Number.isFinite(config.enemySpawnIntervalSeconds) ||
            config.enemySpawnIntervalSeconds <= 0
        ) {
            throw new RangeError(
                "Enemy spawn interval must be greater than zero.",
            );
        }

        this.config = config;
        this.random = random;

        this.island = {
            x: config.islandX,
            y: config.islandY,
            collisionRadius: config.islandCollisionRadius,
        };
    }

    public start(): void {
        // Restaura o estado inicial do jogador.
        this.player.x = 120;
        this.player.y = 120;
        this.player.rotation = 0;
        this.player.health = this.config.playerMaxHealth;

        // Reinicia o estado da partida.
        this.elapsedSeconds = 0;
        this.isRunning = true;
        this.isPaused = false;
        this.score = 0;
        this.endReason = null;

        // Reinicia os projéteis e as armas.
        this.projectiles = [];
        this.nextProjectileId = 1;

        this.frontFireCooldownSeconds = 0;
        this.leftBroadsideCooldownSeconds = 0;
        this.rightBroadsideCooldownSeconds = 0;

        // Reinicia os inimigos.
        this.enemies = [];
        this.nextEnemyId = 1;
        this.enemySpawnTimerSeconds = 0;
        this.nextEnemyType = "chaser";
    }

    public update(
        deltaSeconds: number,
        movementInput: PlayerMovementInput,
        weaponInput: PlayerWeaponInput,
    ): void {
        if (!this.isRunning || this.isPaused) {
            return;
        }

        if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
            throw new RangeError("Delta time must be finite and non-negative.");
        }

        const stepSeconds = Math.min(
            deltaSeconds,
            this.config.matchDurationSeconds - this.elapsedSeconds,
        );

        this.elapsedSeconds += stepSeconds;

        // 1. Atualiza a movimentação do jogador.
        updatePlayerMovement(
            this.player,
            movementInput,
            this.config,
            stepSeconds,
        );

        // Impede que o jogador atravesse a ilha.
        const resolvedPlayerPosition = resolveCircleOverlap(
            {
                x: this.player.x,
                y: this.player.y,
                radius: this.config.playerCollisionRadius,
            },
            {
                x: this.island.x,
                y: this.island.y,
                radius: this.island.collisionRadius,
            },
        );

        this.player.x = resolvedPlayerPosition.x;
        this.player.y = resolvedPlayerPosition.y;

        // 2. Atualiza armas e processa os disparos do jogador.
        this.updateWeaponCooldowns(stepSeconds);
        this.handleWeaponInput(weaponInput);

        // 3. Resolve os impactos dos projéteis.
        const combat = resolveCombat(
            this.projectiles,
            this.enemies,
            this.player,
            this.island,
            this.config,
            stepSeconds,
        );

        this.projectiles = combat.projectiles;
        this.enemies = combat.enemies;
        this.score += combat.kills;

        // Encerra imediatamente se o jogador foi destruído.
        if (combat.playerDestroyed) {
            this.stop("destroyed");
            return;
        }

        if (this.elapsedSeconds >= this.config.matchDurationSeconds) {
            this.stop("time");
            return;
        }

        // 5. Gera novos inimigos.
        this.enemySpawnTimerSeconds += stepSeconds;

        while (
            this.enemySpawnTimerSeconds >= this.config.enemySpawnIntervalSeconds
        ) {
            this.enemySpawnTimerSeconds -=
                this.config.enemySpawnIntervalSeconds;

            const enemy = createEnemy(
                this.nextEnemyId,
                this.nextEnemyType,
                this.player,
                this.island,
                this.config,
                this.random,
            );

            if (enemy) {
                this.enemies.push(enemy);
                this.nextEnemyId++;

                this.nextEnemyType =
                    this.nextEnemyType === "chaser" ? "shooter" : "chaser";
            }
        }

        // 6. Movimenta os inimigos sobreviventes e processa seus ataques.
        const enemyUpdate = updateEnemies(
            this.enemies,
            this.player,
            this.island,
            this.config,
            stepSeconds,
            this.nextProjectileId,
        );

        this.enemies = enemyUpdate.enemies;

        // 7. Aplica o dano das colisões dos Chasers.
        this.player.health = Math.max(
            0,
            this.player.health -
                enemyUpdate.chaserCollisions *
                    this.config.chaserCollisionDamage,
        );

        if (this.player.health === 0) {
            this.stop("destroyed");
            return;
        }

        // 8. Adiciona os projéteis inimigos para o próximo frame.
        this.projectiles.push(...enemyUpdate.projectiles);
        this.nextProjectileId += enemyUpdate.projectiles.length;
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

    public stop(reason: MatchEndReason = null): void {
        this.isRunning = false;
        this.isPaused = false;
        this.endReason = reason;
    }

    public getSnapshot(): GameSimulationSnapshot {
        return {
            elapsedSeconds: this.elapsedSeconds,
            isRunning: this.isRunning,
            isPaused: this.isPaused,
            score: this.score,
            player: { ...this.player },
            projectiles: this.projectiles.map((projectile) => ({
                ...projectile,
            })),
            island: { ...this.island },
            enemies: this.enemies.map((enemy) => ({ ...enemy })),
            remainingSeconds: Math.max(
                0,
                this.config.matchDurationSeconds - this.elapsedSeconds,
            ),
            endReason: this.endReason,
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
