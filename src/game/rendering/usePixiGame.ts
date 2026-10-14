import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import { Application, Assets } from "pixi.js";

import type { GameplayConfig } from "../config/gameplayConfig";
import {
    GameSimulation,
    type GameSimulationSnapshot,
} from "../core/GameSimulation";
import { GameRuntime } from "../core/GameRuntime";

import { CompositeGameInput } from "../input/CompositeGameInput";
import { KeyboardInput } from "../input/KeyboardInput";
import { TouchInput } from "../input/TouchInput";

import { PixiGameRenderer } from "./PixiGameRenderer";
import { requiredGameAssetUrls } from "./gameAssetManifest";
import { createGameScene } from "./createGameScene";
import { observeArenaResize } from "./observeArenaResize";
import { attachGameLoop } from "./attachGameLoop";

export interface HudState {
    health: number;
    score: number;
    remainingSeconds: number;
    isRunning: boolean;
    isPaused: boolean;
    endReason: "time" | "destroyed" | null;
}

export interface AssetLoadState {
    phase: "loading" | "ready" | "error";
    percent: number;
}

export interface GameControls {
    pause: () => void;
    resume: () => void;
}

interface UsePixiGameOptions {
    config: Readonly<GameplayConfig>;
    onComplete: (snapshot: GameSimulationSnapshot) => void;
    previousFocusRef: RefObject<HTMLElement | null>;
}

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

export function usePixiGame({
    config,
    onComplete,
    previousFocusRef,
}: UsePixiGameOptions) {
    const containerRef = useRef<HTMLDivElement>(null);
    const touchInputRef = useRef<TouchInput | null>(null);
    const controlsRef = useRef<GameControls | null>(null);

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

    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    useEffect(() => {
        const container = containerRef.current;

        if (!container) {
            return;
        }

        setLoadState({
            phase: "loading",
            percent: 0,
        });

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

        const cleanupTasks: Array<() => void> = [];

        let runtimeCleaned = false;

        function registerCleanup(task: () => void): void {
            cleanupTasks.push(task);
        }

        function cleanupRuntime(): void {
            if (runtimeCleaned) {
                return;
            }

            runtimeCleaned = true;

            for (let index = cleanupTasks.length - 1; index >= 0; index--) {
                try {
                    cleanupTasks[index]();
                } catch (error) {
                    console.error(
                        "Failed to clean up Pirate Battle resource:",
                        error,
                    );
                }
            }

            cleanupTasks.length = 0;
        }

        function destroyApplication(): void {
            if (destroyed) {
                return;
            }

            destroyed = true;

            app.destroy({ removeView: true }, { children: true });
        }

        async function mount(target: HTMLDivElement): Promise<void> {
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

            await Assets.load(requiredGameAssetUrls, {
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

            const scene = await createGameScene(
                app.stage,
                config,
                () => disposed,
            );

            if (!scene) {
                return;
            }

            const {
                sea,
                islandVisual,
                projectileLayer,
                enemyLayer,
                playerSprite,
                chaserTexture,
                shooterTexture,
                explosionTexture,
                damageTextures,
            } = scene;

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
                damageTextures,
            );

            registerCleanup(() => {
                renderer.reset();
            });

            const keyboard = new KeyboardInput();
            const touch = new TouchInput();

            registerCleanup(() => {
                keyboard.stop();
                touch.clear();

                if (touchInputRef.current === touch) {
                    touchInputRef.current = null;
                }
            });

            const input = new CompositeGameInput([keyboard, touch]);

            touchInputRef.current = touch;

            keyboard.start();

            const runtime = new GameRuntime(simulation, renderer, input);

            registerCleanup(() => {
                runtime.stop();
            });

            runtime.start();

            let previousHud = toHud(simulation.getSnapshot());

            setHud(previousHud);

            const syncHud = (snapshot: GameSimulationSnapshot): void => {
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

            const pauseMatch = (): void => {
                const snapshot = simulation.getSnapshot();

                if (!snapshot.isRunning || snapshot.isPaused) {
                    return;
                }

                previousFocusRef.current =
                    document.activeElement instanceof HTMLElement
                        ? document.activeElement
                        : null;

                runtime.pause();
                keyboard.stop();
                touch.clear();

                syncHud(simulation.getSnapshot());
            };

            const resumeMatch = (): void => {
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

            const matchControls: GameControls = {
                pause: pauseMatch,
                resume: resumeMatch,
            };

            controlsRef.current = matchControls;

            registerCleanup(() => {
                if (controlsRef.current === matchControls) {
                    controlsRef.current = null;
                }
            });

            const handleVisibilityChange = (): void => {
                if (document.hidden) {
                    pauseMatch();
                }
            };

            window.addEventListener("blur", pauseMatch);

            registerCleanup(() => {
                window.removeEventListener("blur", pauseMatch);
            });

            document.addEventListener(
                "visibilitychange",
                handleVisibilityChange,
            );

            registerCleanup(() => {
                document.removeEventListener(
                    "visibilitychange",
                    handleVisibilityChange,
                );
            });

            const detachGameLoop = attachGameLoop({
                app,
                runtime,
                sea,
                target,
                keyboard,
                touch,
                onSnapshot: syncHud,
                onComplete: (snapshot) => {
                    onCompleteRef.current(snapshot);
                },
            });

            registerCleanup(detachGameLoop);

            const stopObservingArena = observeArenaResize(
                target,
                app.stage,
                config,
            );

            registerCleanup(stopObservingArena);

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

            cleanupRuntime();

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

            cleanupRuntime();

            if (initialized) {
                destroyApplication();
            }
        };
    }, [config, loadAttempt, previousFocusRef]);

    const retryLoading = (): void => {
        setLoadState({
            phase: "loading",
            percent: 0,
        });

        setLoadAttempt((attempt) => attempt + 1);
    };

    return {
        containerRef,
        touchInputRef,
        controlsRef,
        loadState,
        hud,
        retryLoading,
    };
}
