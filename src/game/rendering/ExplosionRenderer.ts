import { Sprite, type Container, type Texture } from "pixi.js";

const EXPLOSION_DURATION_MS = 520;

interface ExplosionEffect {
    sprite: Sprite;
    startedAt: number;
}

export class ExplosionRenderer {
    private readonly layer: Container;
    private readonly texture: Texture;
    private readonly effects: ExplosionEffect[] = [];

    public constructor(layer: Container, texture: Texture) {
        this.layer = layer;
        this.texture = texture;
    }

    public spawn(x: number, y: number, now: number): void {
        const sprite = new Sprite(this.texture);

        sprite.anchor.set(0.5);
        sprite.position.set(x, y);
        sprite.scale.set(0.6);

        this.layer.addChild(sprite);

        this.effects.push({
            sprite,
            startedAt: now,
        });
    }

    public render(now: number): void {
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];

            const progress = (now - effect.startedAt) / EXPLOSION_DURATION_MS;

            if (progress >= 1) {
                this.layer.removeChild(effect.sprite);
                effect.sprite.destroy();

                this.effects.splice(i, 1);
                continue;
            }

            effect.sprite.scale.set(0.95 + progress * 1.15);

            effect.sprite.alpha = Math.max(0, 1 - progress * progress);
        }
    }

    public reset(): void {
        for (const effect of this.effects) {
            this.layer.removeChild(effect.sprite);
            effect.sprite.destroy();
        }

        this.effects.length = 0;
    }
}
