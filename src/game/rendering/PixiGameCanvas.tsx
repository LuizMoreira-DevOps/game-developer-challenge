import { useLayoutEffect, useRef } from "react";

import type { GameplayConfig } from "../config/gameplayConfig";
import type { GameSimulationSnapshot } from "../core/GameSimulation";

import { TouchControls } from "../ui/TouchControls";
import { GameplayHud } from "../ui/GameplayHud";
import { usePixiGame } from "./usePixiGame";

import {
    AssetLoadingOverlay,
    AssetErrorOverlay,
    PauseOverlay,
} from "../ui/GameOverlays";

import "../ui/gameplay-ui.css";

interface PixiGameCanvasProps {
    config: Readonly<GameplayConfig>;
    onComplete: (snapshot: GameSimulationSnapshot) => void;
    onExit: () => void;
}

export function PixiGameCanvas({
    config,
    onComplete,
    onExit,
}: PixiGameCanvasProps) {
    const pauseButtonRef = useRef<HTMLButtonElement>(null);
    const resumeButtonRef = useRef<HTMLButtonElement>(null);
    const mainMenuButtonRef = useRef<HTMLButtonElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);

    const {
        containerRef,
        touchInputRef,
        controlsRef,
        loadState,
        hud,
        retryLoading,
    } = usePixiGame({
        config,
        onComplete,
        previousFocusRef,
    });

    const pauseOpen =
        hud.isRunning && hud.isPaused && loadState.phase === "ready";

    useLayoutEffect(() => {
        if (!pauseOpen) {
            if (previousFocusRef.current) {
                const target =
                    pauseButtonRef.current ?? previousFocusRef.current;
                if (target.isConnected) {
                    target.focus();
                }
                previousFocusRef.current = null;
            }
            return;
        }

        resumeButtonRef.current?.focus();

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                controlsRef.current?.resume();
            } else if (event.key === "Tab") {
                event.preventDefault();
                const resume = resumeButtonRef.current;
                const menu = mainMenuButtonRef.current;
                const next =
                    document.activeElement === resume
                        ? menu
                        : document.activeElement === menu
                          ? resume
                          : event.shiftKey
                            ? menu
                            : resume;
                next?.focus();
            }
        };

        document.addEventListener("keydown", handleKeyDown, true);
        return () => {
            document.removeEventListener("keydown", handleKeyDown, true);
        };
    }, [pauseOpen]);

    const touchDisabled =
        loadState.phase !== "ready" || !hud.isRunning || hud.isPaused;

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

                <GameplayHud
                    hud={hud}
                    maxHealth={config.playerMaxHealth}
                    isReady={loadState.phase === "ready"}
                    pauseButtonRef={pauseButtonRef}
                    onPause={() => controlsRef.current?.pause()}
                    onExit={onExit}
                />

                <span
                    className="visually-hidden"
                    role="status"
                    aria-label="Match status"
                    aria-live="polite"
                >
                    {matchStatus}
                </span>

                {loadState.phase === "loading" && (
                    <AssetLoadingOverlay percent={loadState.percent} />
                )}

                {loadState.phase === "error" && (
                    <AssetErrorOverlay onRetry={retryLoading} onExit={onExit} />
                )}

                <TouchControls
                    inputRef={touchInputRef}
                    disabled={touchDisabled}
                />

                {pauseOpen && (
                    <PauseOverlay
                        resumeButtonRef={resumeButtonRef}
                        mainMenuButtonRef={mainMenuButtonRef}
                        onResume={() => controlsRef.current?.resume()}
                        onExit={onExit}
                    />
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
