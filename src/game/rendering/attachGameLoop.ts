import type { Application, TilingSprite } from "pixi.js";

import type { GameSimulationSnapshot } from "../core/GameSimulation";
import type { GameRuntime } from "../core/GameRuntime";
import { FrameMetrics } from "../diagnostics/FrameMetrics";
import { getBrowserPerformanceDiagnostics } from "../diagnostics/BrowserPerformanceDiagnostics";
import type { KeyboardInput } from "../input/KeyboardInput";
import type { TouchInput } from "../input/TouchInput";

interface GameLoopOptions {
    app: Application;
    runtime: GameRuntime;
    sea: TilingSprite;
    target: HTMLElement;
    keyboard: KeyboardInput;
    touch: TouchInput;
    onSnapshot: (snapshot: GameSimulationSnapshot) => void;
    onComplete: (snapshot: GameSimulationSnapshot) => void;
}

export function attachGameLoop({
    app,
    runtime,
    sea,
    target,
    keyboard,
    touch,
    onSnapshot,
    onComplete,
}: GameLoopOptions): () => void {
    const frameMetrics = new FrameMetrics();
    const browserProfile = getBrowserPerformanceDiagnostics();

    let completionNotified = false;
    let detached = false;

    const update = (): void => {
        const deltaSeconds = app.ticker.deltaMS / 1000;

        const snapshot = runtime.update(deltaSeconds);

        // Preserve existing ocean animation behavior.
        if (snapshot.isPaused) {
            sea.tilePosition.set(0, 0);
        } else if (snapshot.isRunning) {
            sea.tilePosition.x += deltaSeconds * 4;
            sea.tilePosition.y += deltaSeconds * 2;
        }

        const frameTimestamp = performance.now();

        browserProfile?.recordFrame(frameTimestamp, {
            isRunning: snapshot.isRunning,
            isPaused: snapshot.isPaused,
            playerX: snapshot.player.x,
            playerY: snapshot.player.y,
            playerRotation: snapshot.player.rotation,
            enemyCount: snapshot.enemies.length,
            projectileCount: snapshot.projectiles.length,
        });

        const playerProjectileCount = snapshot.projectiles.filter(
            (projectile) => projectile.owner === "player",
        ).length;

        if (
            target.dataset.playerProjectileCount !==
            String(playerProjectileCount)
        ) {
            target.dataset.playerProjectileCount = String(
                playerProjectileCount,
            );
        }

        frameMetrics.recordFrame(
            performance.now(),
            1 + snapshot.enemies.length + snapshot.projectiles.length,
        );

        onSnapshot(snapshot);

        if (!snapshot.isRunning) {
            keyboard.stop();
            touch.clear();

            if (snapshot.endReason !== null && !completionNotified) {
                completionNotified = true;
                onComplete(snapshot);
            }
        }
    };

    app.ticker.add(update);

    return () => {
        if (detached) {
            return;
        }

        detached = true;

        app.ticker.remove(update);
        browserProfile?.pause();
    };
}
