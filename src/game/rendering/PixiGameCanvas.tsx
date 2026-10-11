import { useEffect, useRef, useState } from "react";
import { Application, Assets, Container, Graphics, Sprite } from "pixi.js";

import type { GameplayConfig } from "../config/gameplayConfig";
import { GameRuntime } from "../core/GameRuntime";
import {
    GameSimulation,
    type GameSimulationSnapshot,
} from "../core/GameSimulation";
import { CompositeGameInput } from "../input/CompositeGameInput";
import { KeyboardInput } from "../input/KeyboardInput";
import { TouchInput } from "../input/TouchInput";
import { TouchControls } from "../ui/TouchControls";
import { PixiGameRenderer } from "./PixiGameRenderer";
import { createIslandVisual } from "./createIslandVisual";

import "../ui/gameplay-ui.css";

import enemyShipUrl from "../../../assets/png/default/ships/ship_3.png";
import playerShipUrl from "../../../assets/png/default/ships/ship_2.png";

interface PixiGameCanvasProps {
    config: Readonly<GameplayConfig>;
    onComplete: (snapshot: GameSimulationSnapshot) => void;
    onExit: () => void;
}

type HudState = {
    health: number;
    score: number;
    remainingSeconds: number;
    isRunning: boolean;
    isPaused: boolean;
    endReason: "time" | "destroyed" | null;
};

function toHud(snapshot: GameSimulationSnapshot): HudState {
    return {
        health: snapshot.player.health,
        score: snapshot.score,
        remainingSeconds: Math.ceil(snapshot.remainingSeconds),
        isRunning: snapshot.isRunning,
        isPaused: snapshot.isPaused,
        endReason: snapshot.endReason,
    };
}

export function PixiGameCanvas({
    config,
    onComplete,
    onExit,
}: PixiGameCanvasProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const touchInputRef = useRef<TouchInput | null>(null);
    const onCompleteRef = useRef(onComplete);

    const [hud, setHud] = useState<HudState>({
        health: config.playerMaxHealth,
        score: 0,
        remainingSeconds: config.matchDurationSeconds,
        isRunning: false,
        isPaused: false,
        endReason: null,
    });

    const controlsRef = useRef<{
        pause: () => void;
        resume: () => void;
    } | null>(null);

    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    useEffect(() => {
        const container = containerRef.current;

        if (!container) {
            return;
        }

        const app = new Application();

        let disposed = false;
        let initialized = false;
        let destroyed = false;
        let completionNotified = false;
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
                .rect(0, 0, config.arenaWidth, config.arenaHeight)
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

            const simulation = new GameSimulation(config);

            const renderer = new PixiGameRenderer(
                playerSprite,
                islandVisual,
                projectileLayer,
                enemyLayer,
                enemyTexture,
                config,
            );

            const keyboard = new KeyboardInput();
            const touch = new TouchInput();

            const input = new CompositeGameInput([keyboard, touch]);

            touchInputRef.current = touch;

            keyboard.start();

            const runtime = new GameRuntime(simulation, renderer, input);

            runtime.start();

            let previousHud = toHud(simulation.getSnapshot());

            setHud(previousHud);

            const syncHud = (snapshot: GameSimulationSnapshot) => {
                const next = toHud(snapshot);

                if (
                    next.health !== previousHud.health ||
                    next.score !== previousHud.score ||
                    next.remainingSeconds !== previousHud.remainingSeconds ||
                    next.isRunning !== previousHud.isRunning ||
                    next.isPaused !== previousHud.isPaused ||
                    next.endReason !== previousHud.endReason
                ) {
                    previousHud = next;
                    setHud(next);
                }
            };

            const pauseMatch = () => {
                const snapshot = simulation.getSnapshot();

                if (!snapshot.isRunning || snapshot.isPaused) {
                    return;
                }

                runtime.pause();
                keyboard.stop();
                syncHud(simulation.getSnapshot());
            };

            const resumeMatch = () => {
                const snapshot = simulation.getSnapshot();

                if (
                    !snapshot.isRunning ||
                    !snapshot.isPaused ||
                    document.hidden
                ) {
                    return;
                }

                runtime.resume();
                keyboard.start();
                syncHud(simulation.getSnapshot());
            };

            controlsRef.current = {
                pause: pauseMatch,
                resume: resumeMatch,
            };

            const handleVisibilityChange = () => {
                if (document.hidden) {
                    pauseMatch();
                }
            };

            window.addEventListener("blur", pauseMatch);

            document.addEventListener(
                "visibilitychange",
                handleVisibilityChange,
            );

            const update = () => {
                runtime.update(app.ticker.deltaMS / 1000);

                const snapshot = simulation.getSnapshot();

                syncHud(snapshot);

                if (!snapshot.isRunning) {
                    keyboard.stop();

                    if (snapshot.endReason !== null && !completionNotified) {
                        completionNotified = true;
                        onCompleteRef.current(snapshot);
                    }
                }
            };

            app.ticker.add(update);

            const resizeArena = () => {
                const scale = Math.min(
                    target.clientWidth / config.arenaWidth,
                    target.clientHeight / config.arenaHeight,
                );

                const renderedWidth = config.arenaWidth * scale;
                const renderedHeight = config.arenaHeight * scale;

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

                window.removeEventListener("blur", pauseMatch);

                document.removeEventListener(
                    "visibilitychange",
                    handleVisibilityChange,
                );

                if (touchInputRef.current === touch) {
                    touchInputRef.current = null;
                }

                controlsRef.current = null;
            };

            target.appendChild(app.canvas);
        }

        void mount(container).catch((error: unknown) => {
            console.error("Failed to initialize Pirate Battle:", error);
        });

        return () => {
            disposed = true;
            cleanupRuntime?.();

            if (initialized) {
                destroyApplication();
            }
        };
    }, [config]);

    const touchDisabled = !hud.isRunning || hud.isPaused;

    return (
        <section className="gameplay-shell" aria-label="Combat">
            <div className="gameplay-hud" aria-label="Combat statistics">
                <span>
                    Health:{" "}
                    <output aria-label="Player health" aria-live="off">
                        {hud.health}
                    </output>
                </span>

                <span>
                    Score:{" "}
                    <output aria-label="Score" aria-live="off">
                        {hud.score}
                    </output>
                </span>

                <span>
                    Time:{" "}
                    <output aria-label="Remaining time" aria-live="off">
                        {hud.remainingSeconds}
                    </output>
                    s
                </span>

                <span
                    role="status"
                    aria-label="Match status"
                    aria-live="polite"
                >
                    {hud.isRunning
                        ? hud.isPaused
                            ? "Paused"
                            : "Playing"
                        : hud.endReason === "time"
                          ? "Time's up"
                          : hud.endReason === "destroyed"
                            ? "Ship destroyed"
                            : "Ready"}
                </span>

                {hud.isRunning && !hud.isPaused && (
                    <button
                        type="button"
                        onClick={() => controlsRef.current?.pause()}
                    >
                        Pause
                    </button>
                )}

                {hud.isRunning && hud.isPaused && (
                    <button
                        type="button"
                        onClick={() => controlsRef.current?.resume()}
                    >
                        Resume
                    </button>
                )}

                <button type="button" onClick={onExit}>
                    Exit to Menu
                </button>
            </div>

            <p className="keyboard-hint" aria-label="Keyboard controls">
                <strong>Keyboard:</strong> W / ↑ Forward · A / ← Rotate left · D
                / → Rotate right · Space / F Front cannon · Q Left broadside · E
                Right broadside
            </p>

            <div
                ref={containerRef}
                className="gameplay-arena"
                data-testid="game-canvas-container"
            />

            <TouchControls inputRef={touchInputRef} disabled={touchDisabled} />
        </section>
    );
}
