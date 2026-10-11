import type { Sprite } from "pixi.js";

import type { GameRenderer } from "../core/GameRuntime";

import type { GameSimulationSnapshot } from "../core/GameSimulation";

const PLAYER_SPRITE_ROTATION_OFFSET = Math.PI;

export class PixiGameRenderer implements GameRenderer {
    private readonly playerSprite: Sprite;

    public constructor(playerSprite: Sprite) {
        this.playerSprite = playerSprite;
    }

    public render(snapshot: GameSimulationSnapshot): void {
        this.playerSprite.x = snapshot.player.x;
        this.playerSprite.y = snapshot.player.y;
        this.playerSprite.rotation =
            snapshot.player.rotation + PLAYER_SPRITE_ROTATION_OFFSET;
    }
}
