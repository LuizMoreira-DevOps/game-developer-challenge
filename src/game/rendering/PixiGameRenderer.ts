import { Graphics, Sprite, type Container, type Texture } from "pixi.js";

import type { GameplayConfig } from "../config/gameplayConfig";
import type { GameRenderer } from "../core/GameRuntime";
import type { GameSimulationSnapshot } from "../core/GameSimulation";

const SHIP_ROTATION_OFFSET = Math.PI;
const HIT_FLASH_MS = 150;
const EXPLOSION_DURATION_MS = 520;

type DamageStage = 0 | 1 | 2 | 3;

interface DamageAssetTextures {
    player: readonly [Texture, Texture];
    chaser: readonly [Texture, Texture];
    smallFire: Texture;
    largeFire: Texture;
}

interface FireVisual {
    small: Sprite;
    large: Sprite;
}

interface ExplosionEffect {
    sprite: Sprite;
    startedAt: number;
}

const DAMAGE_TINTS = [0xffffff, 0xf0e7dd, 0xe0c7b0, 0xc59b79] as const;

function getDamageStage(health: number, maxHealth: number): DamageStage {
    if (maxHealth <= 0) return 0;

    const ratio = Math.max(0, Math.min(1, health / maxHealth));

    if (ratio <= 0.25) return 3;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 1;

    return 0;
}

export class PixiGameRenderer implements GameRenderer {
    private readonly playerSprite: Sprite;
    private readonly playerBaseTexture: Texture;

    private readonly islandVisual: Container;
    private readonly projectileLayer: Container;
    private readonly enemyLayer: Container;

    private readonly chaserTexture: Texture;
    private readonly shooterTexture: Texture;
    private readonly explosionTexture: Texture;
    private readonly damageTextures: DamageAssetTextures;
    private readonly config: GameplayConfig;

    private readonly projectileGraphics = new Map<number, Graphics>();
    private readonly enemySprites = new Map<number, Sprite>();

    private readonly playerHealthBar = new Graphics();
    private readonly enemyHealthBars = new Map<number, Graphics>();

    private readonly previousEnemyHealth = new Map<number, number>();
    private readonly enemyFlashUntil = new Map<number, number>();

    private readonly explosions: ExplosionEffect[] = [];

    private playerFire: FireVisual | null = null;
    private readonly enemyFire = new Map<number, FireVisual>();

    private previousPlayerHealth: number | null = null;
    private playerFlashUntil = 0;

    public constructor(
        playerSprite: Sprite,
        islandVisual: Container,
        projectileLayer: Container,
        enemyLayer: Container,
        chaserTexture: Texture,
        shooterTexture: Texture,
        explosionTexture: Texture,
        config: GameplayConfig,
        damageTextures: DamageAssetTextures,
    ) {
        this.playerSprite = playerSprite;
        this.playerBaseTexture = playerSprite.texture;

        this.islandVisual = islandVisual;
        this.projectileLayer = projectileLayer;
        this.enemyLayer = enemyLayer;

        this.chaserTexture = chaserTexture;
        this.shooterTexture = shooterTexture;
        this.explosionTexture = explosionTexture;
        this.damageTextures = damageTextures;
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

        const sprite = this.playerSprite;

        sprite.position.set(player.x, player.y);
        sprite.rotation = player.rotation + SHIP_ROTATION_OFFSET;

        const stage = getDamageStage(
            player.health,
            this.config.playerMaxHealth,
        );

        this.applyShipTexture(
            sprite,
            stage,
            this.playerBaseTexture,
            this.damageTextures.player,
        );

        this.playerFire = this.updateFire(
            sprite,
            stage,
            snapshot.elapsedSeconds,
            this.playerFire,
        );

        sprite.tint =
            now < this.playerFlashUntil ? 0xff7777 : DAMAGE_TINTS[stage];

        sprite.alpha = player.health > 0 ? 1 : 0.35;

        this.drawHealthBar(
            this.playerHealthBar,
            player.x,
            player.y - 52,
            player.health,
            this.config.playerMaxHealth,
            true,
        );
    }

    private renderProjectiles(snapshot: GameSimulationSnapshot): void {
        const activeIds = new Set<number>();

        for (const projectile of snapshot.projectiles) {
            activeIds.add(projectile.id);

            let graphic = this.projectileGraphics.get(projectile.id);

            if (!graphic) {
                const isPlayer = projectile.owner === "player";

                const trailColor = isPlayer ? 0xd9f9ff : 0xffd2a0;

                const ballColor = isPlayer ? 0x18242e : 0x9c3027;

                graphic = new Graphics();

                graphic.moveTo(0, 48).lineTo(0, 7).stroke({
                    color: trailColor,
                    width: 6,
                    alpha: 0.28,
                });

                graphic.moveTo(0, 34).lineTo(0, 7).stroke({
                    color: trailColor,
                    width: 2.5,
                    alpha: 0.9,
                });

                graphic.circle(0, 0, 7).fill(ballColor);

                graphic.circle(-2, -2, 2.5).fill({
                    color: 0xf5f7f4,
                    alpha: 0.9,
                });

                this.projectileGraphics.set(projectile.id, graphic);

                this.projectileLayer.addChild(graphic);
            }

            graphic.position.set(projectile.x, projectile.y);
            graphic.rotation = projectile.rotation;
        }

        for (const [id, graphic] of this.projectileGraphics) {
            if (activeIds.has(id)) continue;

            this.projectileLayer.removeChild(graphic);
            graphic.destroy();
            this.projectileGraphics.delete(id);
        }
    }

    private renderEnemies(snapshot: GameSimulationSnapshot, now: number): void {
        const activeIds = new Set<number>();

        for (const enemy of snapshot.enemies) {
            activeIds.add(enemy.id);

            const isChaser = enemy.type === "chaser";

            const baseTexture = isChaser
                ? this.chaserTexture
                : this.shooterTexture;

            let sprite = this.enemySprites.get(enemy.id);

            if (!sprite) {
                sprite = new Sprite(baseTexture);
                sprite.anchor.set(0.5);

                this.enemySprites.set(enemy.id, sprite);
                this.enemyLayer.addChild(sprite);
            }

            const previousHealth = this.previousEnemyHealth.get(enemy.id);

            if (previousHealth !== undefined && enemy.health < previousHealth) {
                this.enemyFlashUntil.set(enemy.id, now + HIT_FLASH_MS);
            }

            this.previousEnemyHealth.set(enemy.id, enemy.health);

            sprite.position.set(enemy.x, enemy.y);
            sprite.rotation = enemy.rotation + SHIP_ROTATION_OFFSET;

            const maxHealth = isChaser
                ? this.config.chaserMaxHealth
                : this.config.shooterMaxHealth;

            const stage = getDamageStage(enemy.health, maxHealth);

            this.applyShipTexture(
                sprite,
                stage,
                baseTexture,
                isChaser ? this.damageTextures.chaser : null,
            );

            const fire = this.updateFire(
                sprite,
                stage,
                snapshot.elapsedSeconds,
                this.enemyFire.get(enemy.id) ?? null,
            );

            if (fire) {
                this.enemyFire.set(enemy.id, fire);
            } else {
                this.enemyFire.delete(enemy.id);
            }

            sprite.tint =
                now < (this.enemyFlashUntil.get(enemy.id) ?? 0)
                    ? 0xffbbbb
                    : DAMAGE_TINTS[stage];

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
                maxHealth,
            );
        }

        // Destroy all visual resources belonging to dead enemies.
        for (const [id, sprite] of this.enemySprites) {
            if (activeIds.has(id)) continue;

            this.spawnExplosion(sprite.x, sprite.y, now);

            const fire = this.enemyFire.get(id);

            if (fire) {
                this.destroyFire(sprite, fire);
                this.enemyFire.delete(id);
            }

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

    /**
     * Swap between the original supplied ship sprites.
     * All versions preserve the same dimensions and anchor.
     */
    private applyShipTexture(
        sprite: Sprite,
        stage: DamageStage,
        base: Texture,
        variants: readonly [Texture, Texture] | null,
    ): void {
        const nextTexture = variants
            ? stage >= 2
                ? variants[1]
                : stage === 1
                  ? variants[0]
                  : base
            : base;

        if (sprite.texture !== nextTexture) {
            sprite.texture = nextTexture;
        }
    }

    /**
     * Use the supplied fire PNGs instead of procedural Graphics.
     * Each fire sprite is created only when damage reaches stage 2.
     */
    private updateFire(
        ship: Sprite,
        stage: DamageStage,
        elapsedSeconds: number,
        current: FireVisual | null,
    ): FireVisual | null {
        if (stage < 2) {
            if (current) {
                this.destroyFire(ship, current);
            }

            return null;
        }

        let visual = current;

        if (!visual) {
            const small = new Sprite(this.damageTextures.smallFire);

            const large = new Sprite(this.damageTextures.largeFire);

            small.anchor.set(0.5, 0.85);
            large.anchor.set(0.5, 0.85);

            // Positions relative to the ship center.
            small.position.set(-12, -7);
            large.position.set(12, 10);

            ship.addChild(small, large);

            visual = { small, large };
        }

        // Light fire from 50% HP; two flames below 25%.
        visual.small.visible = true;
        visual.large.visible = stage >= 3;

        // Cancel parent rotation so flames stay upright,
        // while their positions still follow the ship.
        visual.small.rotation = -ship.rotation;
        visual.large.rotation = -ship.rotation;

        // Simulation time freezes during pause.
        const smallPulse = Math.sin(elapsedSeconds * 8);

        const largePulse = Math.sin(elapsedSeconds * 6.5 + 1.2);

        visual.small.scale.set(0.9 + smallPulse * 0.06);

        visual.large.scale.set(1 + largePulse * 0.08);

        visual.small.alpha = 0.88 + smallPulse * 0.1;

        visual.large.alpha = 0.87 + largePulse * 0.1;

        return visual;
    }

    private destroyFire(ship: Sprite, visual: FireVisual): void {
        ship.removeChild(visual.small, visual.large);

        visual.small.destroy();
        visual.large.destroy();
    }

    private drawHealthBar(
        graphic: Graphics,
        x: number,
        y: number,
        health: number,
        maxHealth: number,
        isPlayer = false,
    ): void {
        const width = 52;
        const height = 7;

        const ratio =
            maxHealth > 0 ? Math.max(0, Math.min(1, health / maxHealth)) : 0;

        const color = isPlayer
            ? ratio > 0.5
                ? 0x55da78
                : ratio > 0.25
                  ? 0xffc348
                  : 0xf04f47
            : 0xef4540;

        graphic.clear();

        graphic.roundRect(-width / 2, 0, width, height, 3).fill(0x142434);

        if (ratio > 0) {
            graphic
                .roundRect(
                    -width / 2 + 1,
                    1,
                    (width - 2) * ratio,
                    height - 2,
                    2,
                )
                .fill(color);
        }

        graphic.position.set(x, y);
    }

    private spawnExplosion(x: number, y: number, now: number): void {
        const sprite = new Sprite(this.explosionTexture);

        sprite.anchor.set(0.5);
        sprite.position.set(x, y);
        sprite.scale.set(0.6);

        this.enemyLayer.addChild(sprite);

        this.explosions.push({
            sprite,
            startedAt: now,
        });
    }

    private renderExplosions(now: number): void {
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const effect = this.explosions[i];

            const progress = (now - effect.startedAt) / EXPLOSION_DURATION_MS;

            if (progress >= 1) {
                this.enemyLayer.removeChild(effect.sprite);

                effect.sprite.destroy();

                this.explosions.splice(i, 1);
                continue;
            }

            effect.sprite.scale.set(0.95 + progress * 1.15);

            effect.sprite.alpha = Math.max(0, 1 - progress * progress);
        }
    }

    public reset(): void {
        this.previousPlayerHealth = null;
        this.playerFlashUntil = 0;

        if (this.playerFire) {
            this.destroyFire(this.playerSprite, this.playerFire);

            this.playerFire = null;
        }

        this.playerSprite.texture = this.playerBaseTexture;

        this.playerSprite.tint = 0xffffff;
        this.playerSprite.alpha = 1;

        this.playerHealthBar.clear();

        for (const graphic of this.projectileGraphics.values()) {
            this.projectileLayer.removeChild(graphic);
            graphic.destroy();
        }

        this.projectileGraphics.clear();

        for (const [id, sprite] of this.enemySprites) {
            const fire = this.enemyFire.get(id);

            if (fire) {
                this.destroyFire(sprite, fire);
            }

            this.enemyLayer.removeChild(sprite);
            sprite.destroy();
        }

        this.enemySprites.clear();
        this.enemyFire.clear();

        for (const bar of this.enemyHealthBars.values()) {
            this.enemyLayer.removeChild(bar);
            bar.destroy();
        }

        this.enemyHealthBars.clear();

        for (const effect of this.explosions) {
            this.enemyLayer.removeChild(effect.sprite);

            effect.sprite.destroy();
        }

        this.explosions.length = 0;

        this.previousEnemyHealth.clear();
        this.enemyFlashUntil.clear();
    }
}
