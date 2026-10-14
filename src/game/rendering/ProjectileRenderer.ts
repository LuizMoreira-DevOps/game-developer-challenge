import { Graphics, type Container } from "pixi.js";

import type { GameSimulationSnapshot } from "../core/GameSimulation";

type Projectiles = GameSimulationSnapshot["projectiles"];

export class ProjectileRenderer {
    private readonly graphics = new Map<number, Graphics>();
    private readonly layer: Container;

    public constructor(layer: Container) {
        this.layer = layer;
    }

    public render(projectiles: Projectiles): void {
        const activeIds = new Set<number>();

        for (const projectile of projectiles) {
            activeIds.add(projectile.id);

            let graphic = this.graphics.get(projectile.id);

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

                this.graphics.set(projectile.id, graphic);
                this.layer.addChild(graphic);
            }

            graphic.position.set(projectile.x, projectile.y);

            graphic.rotation = projectile.rotation;
        }

        // Destroy visuals for projectiles no longer in the snapshot.
        for (const [id, graphic] of this.graphics) {
            if (activeIds.has(id)) {
                continue;
            }

            this.layer.removeChild(graphic);
            graphic.destroy();

            this.graphics.delete(id);
        }
    }

    public reset(): void {
        for (const graphic of this.graphics.values()) {
            this.layer.removeChild(graphic);
            graphic.destroy();
        }

        this.graphics.clear();
    }
}
