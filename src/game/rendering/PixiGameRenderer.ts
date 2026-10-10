import { Graphics } from "pixi.js";

import type { GameRenderer } from "../core/GameRuntime";
import type { GameSimulationSnapshot } from "../core/GameSimulation";

export class PixiGameRenderer implements GameRenderer {
    private readonly marker: Graphics;

    public constructor(marker: Graphics) {
        this.marker = marker;
    }

    public render(snapshot: GameSimulationSnapshot): void {
        this.marker.x = 120 + snapshot.elapsedSeconds * 40;
    }
}
