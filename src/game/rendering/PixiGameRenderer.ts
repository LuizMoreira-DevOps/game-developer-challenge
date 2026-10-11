import { Graphics, Sprite, type Container, type Texture } from "pixi.js";

import type { GameRenderer } from "../core/GameRuntime";

import type { GameSimulationSnapshot } from "../core/GameSimulation";

const PLAYER_SPRITE_ROTATION_OFFSET = Math.PI;

export class PixiGameRenderer implements GameRenderer {
    private readonly playerSprite: Sprite;

    private readonly projectileLayer: Container;

    private readonly islandVisual: Container;

    private readonly projectileGraphics = new Map<number, Graphics>();

    private readonly enemyLayer: Container;
    private readonly enemyTexture: Texture;
    private readonly enemySprites = new Map<number, Sprite>();

    public constructor(
        playerSprite: Sprite,
        islandVisual: Container,
        projectileLayer: Container,
        enemyLayer: Container,
        enemyTexture: Texture,
    ) {
        this.playerSprite = playerSprite;
        this.islandVisual = islandVisual;
        this.projectileLayer = projectileLayer;
        this.enemyLayer = enemyLayer;
        this.enemyTexture = enemyTexture;
    }

    public render(snapshot: GameSimulationSnapshot): void {
        this.renderIsland(snapshot);
        this.renderPlayer(snapshot);
        this.renderProjectiles(snapshot);
        this.renderEnemies(snapshot);
    }

    private renderIsland(snapshot: GameSimulationSnapshot): void {
        this.islandVisual.x = snapshot.island.x;
        this.islandVisual.y = snapshot.island.y;
    }

    private renderPlayer(snapshot: GameSimulationSnapshot): void {
        this.playerSprite.x = snapshot.player.x;

        this.playerSprite.y = snapshot.player.y;

        this.playerSprite.rotation =
            snapshot.player.rotation + PLAYER_SPRITE_ROTATION_OFFSET;
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

            graphic.x = projectile.x;
            graphic.y = projectile.y;
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

    private renderEnemies(snapshot: GameSimulationSnapshot): void {
        const activeIds = new Set<number>();

        for (const enemy of snapshot.enemies) {
            activeIds.add(enemy.id);

            let sprite = this.enemySprites.get(enemy.id);

            if (!sprite) {
                sprite = new Sprite(this.enemyTexture);
                sprite.anchor.set(0.5);

                if (enemy.type === "chaser") {
                    sprite.tint = 0xff7777;
                } else {
                    sprite.tint = 0xffd166;
                }

                this.enemySprites.set(enemy.id, sprite);
                this.enemyLayer.addChild(sprite);
            }

            sprite.position.set(enemy.x, enemy.y);
            sprite.rotation = enemy.rotation + PLAYER_SPRITE_ROTATION_OFFSET;
        }

        for (const [id, sprite] of this.enemySprites) {
            if (activeIds.has(id)) {
                continue;
            }

            this.enemyLayer.removeChild(sprite);
            sprite.destroy();
            this.enemySprites.delete(id);
        }
    }
}
