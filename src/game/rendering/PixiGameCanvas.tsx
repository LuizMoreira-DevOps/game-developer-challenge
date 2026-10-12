import { useEffect, useRef, useState } from "react";

import { Application, Assets, Container, Sprite, TilingSprite } from "pixi.js";

import type { GameplayConfig } from "../config/gameplayConfig";

import { GameRuntime } from "../core/GameRuntime";
import { FrameMetrics } from "../diagnostics/FrameMetrics";

import {
    GameSimulation,
    type GameSimulationSnapshot,
} from "../core/GameSimulation";

import { CompositeGameInput } from "../input/CompositeGameInput";
import { KeyboardInput } from "../input/KeyboardInput";
import { TouchInput } from "../input/TouchInput";
import { TouchControls } from "../ui/TouchControls";

import { PixiGameRenderer } from "./PixiGameRenderer";

import { createIslandVisual, islandTileUrls } from "./createIslandVisual";

import { getBrowserPerformanceDiagnostics } from "../diagnostics/BrowserPerformanceDiagnostics";

import waterTileUrl from "../../../assets/png/default/tiles/tile_73.png";
import playerShipUrl from "../../../assets/png/default/ships/ship_2.png";
import chaserShipUrl from "../../../assets/png/default/ships/ship_3.png";
import shooterShipUrl from "../../../assets/png/default/ships/ship_22.png";
import explosionUrl from "../../../assets/png/default/effects/explosion_1.png";
import pauseIconUrl from "../../../assets/png/default/ui/controls/icon_pause.png";
import homeIconUrl from "../../../assets/png/default/ui/controls/icon_home.png";

import "../ui/gameplay-ui.css";

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

type AssetLoadState = {
    phase: "loading" | "ready" | "error";
    percent: number;
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

function formatTime(seconds: number): string {
    const remaining = Math.max(0, Math.ceil(seconds));

    const minutes = Math.floor(remaining / 60);
    const rest = remaining % 60;

    return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export function PixiGameCanvas({
    config,
    onComplete,
    onExit,
}: PixiGameCanvasProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    const touchInputRef = useRef<TouchInput | null>(null);

    const onCompleteRef = useRef(onComplete);

    const [loadState, setLoadState] = useState<AssetLoadState>({
        phase: "loading",
        percent: 0,
    });

    const [loadAttempt, setLoadAttempt] = useState(0);

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

        setLoadState({ phase: "loading", percent: 0 });
        setHud({
            health: config.playerMaxHealth,
            score: 0,
            remainingSeconds: config.matchDurationSeconds,
            isRunning: false,
            isPaused: false,
            endReason: null,
        });

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
                background: "#0b628c",
                backgroundAlpha: 0,
                antialias: true,
                resolution: window.devicePixelRatio,
                autoDensity: true,
            });

            initialized = true;

            if (disposed) {
                destroyApplication();
                return;
            }

            let assetLoadFailed = false;

            const requiredAssets = [
                ...islandTileUrls.flat(),
                waterTileUrl,
                playerShipUrl,
                chaserShipUrl,
                shooterShipUrl,
                explosionUrl,
            ];

            await Assets.load(requiredAssets, {
                strategy: "throw",

                onProgress: (progress) => {
                    if (disposed || assetLoadFailed) {
                        return;
                    }

                    setLoadState((current) => {
                        if (current.phase === "error") {
                            return current;
                        }

                        return {
                            phase: "loading",
                            percent: Math.round(progress * 100),
                        };
                    });
                },

                onError: (error, asset) => {
                    assetLoadFailed = true;

                    const url = typeof asset === "string" ? asset : asset.src;

                    console.error(`Failed to load game asset: ${url}`, error);
                },
            });

            if (disposed) {
                return;
            }

            // Ocean, behind every combat object.
            const waterTexture = await Assets.load(waterTileUrl);

            if (disposed) {
                return;
            }

            const sea = new TilingSprite({
                texture: waterTexture,
                width: config.arenaWidth,
                height: config.arenaHeight,
            });

            app.stage.addChild(sea);

            // Keep the original simulation island.
            const islandVisual = await createIslandVisual();

            if (disposed) {
                islandVisual.destroy({
                    children: true,
                });
                return;
            }

            app.stage.addChild(islandVisual);

            const projectileLayer = new Container();

            const enemyLayer = new Container();

            app.stage.addChild(projectileLayer);

            app.stage.addChild(enemyLayer);

            const [
                playerTexture,
                chaserTexture,
                shooterTexture,
                explosionTexture,
            ] = await Promise.all([
                Assets.load(playerShipUrl),
                Assets.load(chaserShipUrl),
                Assets.load(shooterShipUrl),
                Assets.load(explosionUrl),
            ]);

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
                chaserTexture,
                shooterTexture,
                explosionTexture,
                config,
            );

            const keyboard = new KeyboardInput();

            const touch = new TouchInput();

            const input = new CompositeGameInput([keyboard, touch]);

            touchInputRef.current = touch;

            keyboard.start();

            const runtime = new GameRuntime(simulation, renderer, input);

            const frameMetrics = new FrameMetrics();

            const browserProfile = getBrowserPerformanceDiagnostics();

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
                touch.clear();

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

                touch.clear();
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
                const deltaSeconds = app.ticker.deltaMS / 1000;

                const snapshot = runtime.update(deltaSeconds);

                // Animate only while the match is running.
                // Reset on pause for stable visual regression.
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

                syncHud(snapshot);

                if (!snapshot.isRunning) {
                    keyboard.stop();
                    touch.clear();

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

            let runtimeCleaned = false;

            cleanupRuntime = () => {
                if (runtimeCleaned) {
                    return;
                }

                runtimeCleaned = true;
                resizeObserver.disconnect();

                app.ticker.remove(update);

                keyboard.stop();
                touch.clear();
                runtime.stop();
                renderer.reset();

                browserProfile?.pause();

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

            if (!disposed) {
                setLoadState({
                    phase: "ready",
                    percent: 100,
                });
            }
        }

        void mount(container).catch((error: unknown) => {
            if (disposed) {
                return;
            }

            console.error("Failed to initialize Pirate Battle:", error);

            cleanupRuntime?.();

            if (initialized) {
                destroyApplication();
            }

            setLoadState({
                phase: "error",
                percent: 0,
            });
        });

        return () => {
            disposed = true;

            cleanupRuntime?.();

            if (initialized) {
                destroyApplication();
            }
        };
    }, [config, loadAttempt]);

    const touchDisabled =
        loadState.phase !== "ready" || !hud.isRunning || hud.isPaused;

    const healthPercent = Math.max(
        0,
        Math.min(100, (hud.health / config.playerMaxHealth) * 100),
    );

    const matchStatus = hud.isRunning
        ? hud.isPaused
            ? "Paused"
            : "Playing"
        : hud.endReason === "time"
          ? "Time's up"
          : hud.endReason === "destroyed"
            ? "Ship destroyed"
            : "Ready";

    return (
        <section className="gameplay-shell" aria-label="Combat">
            <div className="gameplay-stage">
                <div
                    ref={containerRef}
                    className="gameplay-arena"
                    data-testid="game-canvas-container"
                />

                <header className="gameplay-hud" aria-label="Combat statistics">
                    <div className="hud-health">
                        <span className="hud-heart" aria-hidden="true" />

                        <div className="hud-health-frame">
                            <div
                                className={`hud-health-fill ${
                                    healthPercent <= 30
                                        ? "hud-health-fill--red"
                                        : healthPercent <= 55
                                          ? "hud-health-fill--amber"
                                          : ""
                                }`}
                                style={{
                                    clipPath: `inset(0 ${100 - healthPercent}% 0 0)`,
                                }}
                                aria-hidden="true"
                            />

                            <output aria-label="Player health" aria-live="off">
                                {hud.health}
                            </output>

                            <span aria-hidden="true" className="hud-max-health">
                                / {config.playerMaxHealth}
                            </span>
                        </div>
                    </div>

                    <div className="hud-right">
                        <div className="hud-counter">
                            <span
                                className="hud-icon hud-icon--score"
                                aria-hidden="true"
                            />

                            <output aria-label="Score" aria-live="off">
                                {hud.score}
                            </output>
                        </div>

                        <div className="hud-counter">
                            <span
                                className="hud-icon hud-icon--time"
                                aria-hidden="true"
                            />

                            <span
                                aria-hidden="true"
                                className="hud-formatted-time"
                            >
                                {formatTime(hud.remainingSeconds)}
                            </span>

                            <output
                                className="visually-hidden"
                                aria-label="Remaining time"
                                aria-live="off"
                            >
                                {hud.remainingSeconds}
                            </output>
                        </div>

                        {loadState.phase === "ready" &&
                            hud.isRunning &&
                            !hud.isPaused && (
                                <button
                                    type="button"
                                    className="hud-round hud-round--pause"
                                    aria-label="Pause"
                                    onClick={() => controlsRef.current?.pause()}
                                >
                                    <img
                                        src={pauseIconUrl}
                                        alt=""
                                        draggable={false}
                                    />
                                </button>
                            )}

                        {!hud.isPaused && loadState.phase === "ready" && (
                            <button
                                type="button"
                                className="hud-round hud-round--exit"
                                aria-label="Exit to Menu"
                                onClick={onExit}
                            >
                                <img
                                    src={homeIconUrl}
                                    alt=""
                                    draggable={false}
                                />
                            </button>
                        )}
                    </div>
                </header>

                <span
                    className="visually-hidden"
                    role="status"
                    aria-label="Match status"
                    aria-live="polite"
                >
                    {matchStatus}
                </span>

                {loadState.phase === "loading" && (
                    <div className="asset-overlay">
                        <p
                            role="progressbar"
                            aria-label="Loading game assets"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={loadState.percent}
                        >
                            Loading game assets: {loadState.percent}%
                        </p>
                    </div>
                )}

                {loadState.phase === "error" && (
                    <div
                        className="asset-overlay asset-overlay--error"
                        role="alert"
                    >
                        <div className="asset-error-panel">
                            <h2>Loading Failed</h2>

                            <p>Game assets could not be loaded.</p>

                            <button
                                type="button"
                                onClick={() => {
                                    setLoadState({
                                        phase: "loading",
                                        percent: 0,
                                    });

                                    setLoadAttempt((attempt) => attempt + 1);
                                }}
                            >
                                Retry Loading
                            </button>

                            <button type="button" onClick={onExit}>
                                Return to Menu
                            </button>
                        </div>
                    </div>
                )}

                <TouchControls
                    inputRef={touchInputRef}
                    disabled={touchDisabled}
                />

                {hud.isRunning &&
                    hud.isPaused &&
                    loadState.phase === "ready" && (
                        <div className="pause-overlay">
                            <section
                                className="pause-panel"
                                aria-labelledby="pause-heading"
                            >
                                <h2 id="pause-heading">Paused</h2>

                                <p>Ready when you are.</p>

                                <button
                                    type="button"
                                    onClick={() =>
                                        controlsRef.current?.resume()
                                    }
                                >
                                    Resume
                                </button>

                                <button type="button" onClick={onExit}>
                                    Main Menu
                                </button>
                            </section>
                        </div>
                    )}
            </div>

            <p className="keyboard-hint" aria-label="Keyboard controls">
                <strong>Keyboard:</strong> W / ↑ Forward · A / ← Rotate left · D
                / → Rotate right · Space / F Front cannon · Q Left broadside · E
                Right broadside
            </p>
        </section>
    );
}
