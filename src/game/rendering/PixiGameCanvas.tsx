import { useEffect, useRef } from "react";
import { Application, Graphics } from "pixi.js";
import { defaultGameplayConfig } from "../config/gameplayConfig";
import { GameRuntime } from "../core/GameRuntime";
import { GameSimulation } from "../core/GameSimulation";
import { PixiGameRenderer } from "./PixiGameRenderer";

export function PixiGameCanvas() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;

        if (!container) {
            return;
        }

        const app = new Application();

        let disposed = false;
        let initialized = false;
        let cleanupRuntime: (() => void) | undefined;

        function destroyApplication() {
            app.destroy({ removeView: true }, { children: true });
        }

        async function mount(target: HTMLDivElement) {
            await app.init({
                resizeTo: target,
                background: "#0b3d5c",
                antialias: true,
                resolution: window.devicePixelRatio,
                autoDensity: true,
            });

            initialized = true;

            if (disposed) {
                destroyApplication();
                return;
            }

            const marker = new Graphics().circle(0, 0, 24).fill("#f4c542");

            marker.position.set(120, 120);

            app.stage.addChild(marker);

            const simulation = new GameSimulation(defaultGameplayConfig);
            const renderer = new PixiGameRenderer(marker);
            const runtime = new GameRuntime(simulation, renderer);

            runtime.start();

            const update = () => {
                runtime.update(app.ticker.deltaMS / 1000);
            };

            app.ticker.add(update);

            cleanupRuntime = () => {
                app.ticker.remove(update);
                runtime.stop();
            };

            target.appendChild(app.canvas);
        }

        void mount(container);

        return () => {
            disposed = true;
            cleanupRuntime?.();

            if (initialized) {
                destroyApplication();
            }
        };
    }, []);

    return (
        <div
            ref={containerRef}
            data-testid="game-canvas-container"
            style={{
                width: "100%",
                height: "70vh",
                minHeight: "320px",
            }}
        />
    );
}
