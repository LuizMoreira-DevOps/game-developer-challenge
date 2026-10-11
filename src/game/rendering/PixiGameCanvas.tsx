import { useEffect, useRef, useState } from "react";
import { Application, Assets, Container, Graphics, Sprite } from "pixi.js";

import { defaultGameplayConfig } from "../config/gameplayConfig";
import { GameRuntime } from "../core/GameRuntime";
import { GameSimulation } from "../core/GameSimulation";
import { KeyboardInput } from "../input/KeyboardInput";
import { PixiGameRenderer } from "./PixiGameRenderer";

import { createIslandVisual } from "./createIslandVisual";

import enemyShipUrl from "../../../assets/png/default/ships/ship_3.png";

import playerShipUrl from "../../../assets/png/default/ships/ship_2.png";

export function PixiGameCanvas() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [hud, setHud] = useState<{ health: number; score: number }>({
        health: defaultGameplayConfig.playerMaxHealth,
        score: 0,
    });

    useEffect(() => {
        const container = containerRef.current;

        if (!container) {
            return;
        }

        const app = new Application();

        let disposed = false;
        let initialized = false;
        let destroyed = false;
        let cleanupRuntime: (() => void) | undefined;

        function destroyApplication() {
            if (destroyed) {
                return;
            }

            destroyed = true;

            app.destroy({ removeView: true }, { children: true });
        }

        async function mount(target: HTMLDivElement) {
            await app.init({
                resizeTo: target,
                background: "#07131f",
                antialias: true,
                resolution: window.devicePixelRatio,
                autoDensity: true,
            });

            initialized = true;

            if (disposed) {
                destroyApplication();
                return;
            }

            const arena = new Graphics()
                .rect(
                    0,
                    0,
                    defaultGameplayConfig.arenaWidth,
                    defaultGameplayConfig.arenaHeight,
                )
                .fill("#0b3d5c");

            app.stage.addChild(arena);

            const islandVisual = await createIslandVisual();

            if (disposed) {
                return;
            }

            app.stage.addChild(islandVisual);

            const projectileLayer = new Container();

            app.stage.addChild(projectileLayer);

            const playerTexture = await Assets.load(playerShipUrl);

            if (disposed) {
                return;
            }

            const enemyLayer = new Container();

            app.stage.addChild(enemyLayer);

            const enemyTexture = await Assets.load(enemyShipUrl);

            if (disposed) {
                return;
            }

            const playerSprite = new Sprite(playerTexture);

            playerSprite.anchor.set(0.5);

            app.stage.addChild(playerSprite);

            const simulation = new GameSimulation(defaultGameplayConfig);

            const renderer = new PixiGameRenderer(
                playerSprite,
                islandVisual,
                projectileLayer,
                enemyLayer,
                enemyTexture,
                defaultGameplayConfig,
            );

            const keyboard = new KeyboardInput();

            keyboard.start();

            const runtime = new GameRuntime(simulation, renderer, keyboard);

            runtime.start();

            let previousHealth: number = defaultGameplayConfig.playerMaxHealth;
            let previousScore: number = 0;

            const update = () => {
                runtime.update(app.ticker.deltaMS / 1000);

                const snapshot = simulation.getSnapshot();

                const healthChanged = snapshot.player.health !== previousHealth;
                const scoreChanged = snapshot.score !== previousScore;

                if (healthChanged || scoreChanged) {
                    previousHealth = snapshot.player.health;
                    previousScore = snapshot.score;

                    setHud({
                        health: previousHealth,
                        score: previousScore,
                    });
                }

                if (!snapshot.isRunning) {
                    keyboard.stop();
                }
            };

            app.ticker.add(update);

            const resizeArena = () => {
                const scale = Math.min(
                    target.clientWidth / defaultGameplayConfig.arenaWidth,
                    target.clientHeight / defaultGameplayConfig.arenaHeight,
                );

                const renderedWidth = defaultGameplayConfig.arenaWidth * scale;

                const renderedHeight =
                    defaultGameplayConfig.arenaHeight * scale;

                app.stage.scale.set(scale);

                app.stage.position.set(
                    (target.clientWidth - renderedWidth) / 2,
                    (target.clientHeight - renderedHeight) / 2,
                );
            };

            resizeArena();

            const resizeObserver = new ResizeObserver(resizeArena);

            resizeObserver.observe(target);

            cleanupRuntime = () => {
                resizeObserver.disconnect();
                app.ticker.remove(update);
                keyboard.stop();
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
        <section aria-label="Combat">
            <div aria-label="Combat statistics">
                <span>
                    Health:{" "}
                    <output aria-label="Player health">{hud.health}</output>
                </span>
                {" · "}
                <span>
                    Score: <output aria-label="Score">{hud.score}</output>
                </span>
            </div>
            <div
                ref={containerRef}
                data-testid="game-canvas-container"
                style={{
                    width: "100%",
                    height: "70vh",
                    minHeight: "320px",
                }}
            />
        </section>
    );
}
