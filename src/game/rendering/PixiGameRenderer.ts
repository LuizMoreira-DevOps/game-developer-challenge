import { Graphics, Sprite, type Container, type Texture } from "pixi.js";

import type { GameplayConfig } from "../config/gameplayConfig";
import type { GameRenderer } from "../core/GameRuntime";
import type { GameSimulationSnapshot } from "../core/GameSimulation";

const PLAYER_SPRITE_ROTATION_OFFSET = Math.PI;

const HIT_FLASH_MS = 150;
const EXPLOSION_DURATION_MS = 420;

interface ExplosionEffect {
    graphic: Graphics;
    startedAt: number;
}

export class PixiGameRenderer implements GameRenderer {
    private readonly playerSprite: Sprite;
    private readonly projectileLayer: Container;
    private readonly islandVisual: Container;
    private readonly enemyLayer: Container;
    private readonly enemyTexture: Texture;
    private readonly config: GameplayConfig;

    private readonly projectileGraphics = new Map<number, Graphics>();
    private readonly enemySprites = new Map<number, Sprite>();

    private readonly playerHealthBar = new Graphics();
    private readonly enemyHealthBars = new Map<number, Graphics>();

    private previousPlayerHealth: number | null = null;
    private playerFlashUntil = 0;

    private readonly previousEnemyHealth = new Map<number, number>();
    private readonly enemyFlashUntil = new Map<number, number>();

    private readonly explosions: ExplosionEffect[] = [];

    public constructor(
        playerSprite: Sprite,
        islandVisual: Container,
        projectileLayer: Container,
        enemyLayer: Container,
        enemyTexture: Texture,
        config: GameplayConfig,
    ) {
        this.playerSprite = playerSprite;
        this.islandVisual = islandVisual;
        this.projectileLayer = projectileLayer;
        this.enemyLayer = enemyLayer;
        this.enemyTexture = enemyTexture;
        this.config = config;

        this.enemyLayer.addChild(this.playerHealthBar);
    }

    public render(snapshot: GameSimulationSnapshot): void {
        const now = performance.now();

        this.renderIsland(snapshot);
        this.renderPlayer(snapshot, now);
        this.renderProjectiles(snapshot);
        this.renderEnemies(snapshot, now);
        this.renderExplosions(now);
    }

    private renderIsland(snapshot: GameSimulationSnapshot): void {
        this.islandVisual.position.set(snapshot.island.x, snapshot.island.y);
    }

    private renderPlayer(snapshot: GameSimulationSnapshot, now: number): void {
        const player = snapshot.player;

        if (
            this.previousPlayerHealth !== null &&
            player.health < this.previousPlayerHealth
        ) {
            this.playerFlashUntil = now + HIT_FLASH_MS;

            if (player.health === 0 && this.previousPlayerHealth > 0) {
                this.spawnExplosion(player.x, player.y, now);
            }
        }

        this.previousPlayerHealth = player.health;

        this.playerSprite.position.set(player.x, player.y);
        this.playerSprite.rotation =
            player.rotation + PLAYER_SPRITE_ROTATION_OFFSET;

        this.playerSprite.tint =
            now < this.playerFlashUntil ? 0xff7777 : 0xffffff;

        // O navio destruído fica escurecido.
        this.playerSprite.alpha = player.health > 0 ? 1 : 0.3;

        this.drawHealthBar(
            this.playerHealthBar,
            player.x,
            player.y - 48,
            player.health,
            this.config.playerMaxHealth,
        );
    }

    private renderProjectiles(snapshot: GameSimulationSnapshot): void {
        const activeIds = new Set<number>();

        for (const projectile of snapshot.projectiles) {
            activeIds.add(projectile.id);

            let graphic = this.projectileGraphics.get(projectile.id);

            if (!graphic) {
                graphic = new Graphics().circle(0, 0, 6).fill("#111111");

                this.projectileGraphics.set(projectile.id, graphic);
                this.projectileLayer.addChild(graphic);
            }

            graphic.position.set(projectile.x, projectile.y);
        }

        for (const [id, graphic] of this.projectileGraphics) {
            if (activeIds.has(id)) {
                continue;
            }

            this.projectileLayer.removeChild(graphic);
            graphic.destroy();
            this.projectileGraphics.delete(id);
        }
    }

    private renderEnemies(snapshot: GameSimulationSnapshot, now: number): void {
        const activeIds = new Set<number>();

        for (const enemy of snapshot.enemies) {
            activeIds.add(enemy.id);

            let sprite = this.enemySprites.get(enemy.id);

            if (!sprite) {
                sprite = new Sprite(this.enemyTexture);
                sprite.anchor.set(0.5);

                this.enemySprites.set(enemy.id, sprite);
                this.enemyLayer.addChild(sprite);
            }

            const previousHealth = this.previousEnemyHealth.get(enemy.id);

            if (previousHealth !== undefined && enemy.health < previousHealth) {
                this.enemyFlashUntil.set(enemy.id, now + HIT_FLASH_MS);
            }

            this.previousEnemyHealth.set(enemy.id, enemy.health);

            const baseTint = enemy.type === "chaser" ? 0xff7777 : 0xffd166;

            sprite.tint =
                now < (this.enemyFlashUntil.get(enemy.id) ?? 0)
                    ? 0xffffff
                    : baseTint;

            sprite.position.set(enemy.x, enemy.y);
            sprite.rotation = enemy.rotation + PLAYER_SPRITE_ROTATION_OFFSET;

            // Barra de vida individual.
            let healthBar = this.enemyHealthBars.get(enemy.id);

            if (!healthBar) {
                healthBar = new Graphics();
                this.enemyHealthBars.set(enemy.id, healthBar);
                this.enemyLayer.addChild(healthBar);
            }

            this.drawHealthBar(
                healthBar,
                enemy.x,
                enemy.y - 44,
                enemy.health,
                enemy.type === "chaser"
                    ? this.config.chaserMaxHealth
                    : this.config.shooterMaxHealth,
            );
        }

        // Detecta inimigos que desapareceram do snapshot.
        for (const [id, sprite] of this.enemySprites) {
            if (activeIds.has(id)) {
                continue;
            }

            // A explosão usa a última posição renderizada.
            this.spawnExplosion(sprite.x, sprite.y, now);

            this.enemyLayer.removeChild(sprite);
            sprite.destroy();
            this.enemySprites.delete(id);

            const healthBar = this.enemyHealthBars.get(id);

            if (healthBar) {
                this.enemyLayer.removeChild(healthBar);
                healthBar.destroy();
                this.enemyHealthBars.delete(id);
            }

            this.previousEnemyHealth.delete(id);
            this.enemyFlashUntil.delete(id);
        }
    }

    private drawHealthBar(
        graphic: Graphics,
        x: number,
        y: number,
        health: number,
        maxHealth: number,
    ): void {
        const width = 52;
        const height = 7;

        const ratio =
            maxHealth > 0 ? Math.max(0, Math.min(1, health / maxHealth)) : 0;

        const color =
            ratio > 0.5 ? 0x4ade80 : ratio > 0.25 ? 0xfbbf24 : 0xef4444;

        graphic.clear();

        graphic.rect(-width / 2, 0, width, height).fill(0x17232c);

        if (ratio > 0) {
            graphic
                .rect(-width / 2 + 1, 1, (width - 2) * ratio, height - 2)
                .fill(color);
        }

        graphic.position.set(x, y);
    }

    private spawnExplosion(x: number, y: number, now: number): void {
        const graphic = new Graphics();

        graphic.position.set(x, y);
        this.enemyLayer.addChild(graphic);

        this.explosions.push({
            graphic,
            startedAt: now,
        });
    }

    private renderExplosions(now: number): void {
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const effect = this.explosions[i];

            const progress = (now - effect.startedAt) / EXPLOSION_DURATION_MS;

            if (progress >= 1) {
                this.enemyLayer.removeChild(effect.graphic);
                effect.graphic.destroy();
                this.explosions.splice(i, 1);
                continue;
            }

            const opacity = Math.max(0, 1 - progress);
            const radius = 8 + progress * 32;

            effect.graphic.clear();

            // Onda circular da explosão.
            effect.graphic.circle(0, 0, radius).stroke({
                color: 0xffad42,
                width: 3,
                alpha: opacity,
            });

            // Núcleo luminoso.
            effect.graphic.circle(0, 0, Math.max(1, 11 * (1 - progress))).fill({
                color: 0xffe39a,
                alpha: opacity,
            });

            // Oito fragmentos que se afastam do centro.
            for (let particle = 0; particle < 8; particle++) {
                const angle = (particle / 8) * Math.PI * 2;

                const innerRadius = 7 + progress * 20;
                const outerRadius = innerRadius + 8;

                effect.graphic
                    .moveTo(
                        Math.cos(angle) * innerRadius,
                        Math.sin(angle) * innerRadius,
                    )
                    .lineTo(
                        Math.cos(angle) * outerRadius,
                        Math.sin(angle) * outerRadius,
                    )
                    .stroke({
                        color: 0xff7744,
                        width: 3,
                        alpha: opacity,
                    });
            }
        }
    }
}
