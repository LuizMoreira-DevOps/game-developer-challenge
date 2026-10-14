import type { RefObject } from "react";

import type { HudState } from "../rendering/usePixiGame";

import pauseIconUrl from "../../../assets/png/default/ui/controls/icon_pause.png";
import homeIconUrl from "../../../assets/png/default/ui/controls/icon_home.png";

interface GameplayHudProps {
    hud: Readonly<HudState>;
    maxHealth: number;
    isReady: boolean;
    pauseButtonRef: RefObject<HTMLButtonElement | null>;
    onPause: () => void;
    onExit: () => void;
}

function formatTime(seconds: number): string {
    const remaining = Math.max(0, Math.ceil(seconds));

    const minutes = Math.floor(remaining / 60);
    const rest = remaining % 60;

    return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export function GameplayHud({
    hud,
    maxHealth,
    isReady,
    pauseButtonRef,
    onPause,
    onExit,
}: GameplayHudProps) {
    const healthPercent = Math.max(
        0,
        Math.min(100, (hud.health / maxHealth) * 100),
    );

    return (
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
                        / {maxHealth}
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

                    <span aria-hidden="true" className="hud-formatted-time">
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

                {isReady && hud.isRunning && !hud.isPaused && (
                    <button
                        type="button"
                        className="hud-round hud-round--pause"
                        ref={pauseButtonRef}
                        aria-label="Pause"
                        onClick={onPause}
                    >
                        <img src={pauseIconUrl} alt="" draggable={false} />
                    </button>
                )}

                {!hud.isPaused && isReady && (
                    <button
                        type="button"
                        className="hud-round hud-round--exit"
                        aria-label="Exit to Menu"
                        onClick={onExit}
                    >
                        <img src={homeIconUrl} alt="" draggable={false} />
                    </button>
                )}
            </div>
        </header>
    );
}
