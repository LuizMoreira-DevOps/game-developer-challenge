import { Graphics, type Container, type Sprite } from "pixi.js";

import type { GameRenderer } from "../core/GameRuntime";

import type { GameSimulationSnapshot } from "../core/GameSimulation";

const PLAYER_SPRITE_ROTATION_OFFSET = Math.PI;

export class PixiGameRenderer implements GameRenderer {
    private readonly playerSprite: Sprite;

    private readonly projectileLayer: Container;

    private readonly islandVisual: Container;

    private readonly projectileGraphics = new Map<number, Graphics>();

    public constructor(
        playerSprite: Sprite,
        islandVisual: Container,
        projectileLayer: Container,
    ) {
        this.playerSprite = playerSprite;
        this.islandVisual = islandVisual;
        this.projectileLayer = projectileLayer;
    }

    public render(snapshot: GameSimulationSnapshot): void {
        this.renderIsland(snapshot);
        this.renderPlayer(snapshot);
        this.renderProjectiles(snapshot);
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
}
