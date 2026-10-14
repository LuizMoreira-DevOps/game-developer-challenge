import type { RefObject } from "react";

interface AssetLoadingOverlayProps {
    percent: number;
}

export function AssetLoadingOverlay({ percent }: AssetLoadingOverlayProps) {
    return (
        <div className="asset-overlay">
            <p
                role="progressbar"
                aria-label="Loading game assets"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
            >
                Loading game assets: {percent}%
            </p>
        </div>
    );
}

interface AssetErrorOverlayProps {
    onRetry: () => void;
    onExit: () => void;
}

export function AssetErrorOverlay({ onRetry, onExit }: AssetErrorOverlayProps) {
    return (
        <div className="asset-overlay asset-overlay--error" role="alert">
            <div className="asset-error-panel">
                <h2>Loading Failed</h2>

                <p>Game assets could not be loaded.</p>

                <button type="button" onClick={onRetry}>
                    Retry Loading
                </button>

                <button type="button" onClick={onExit}>
                    Return to Menu
                </button>
            </div>
        </div>
    );
}

interface PauseOverlayProps {
    resumeButtonRef: RefObject<HTMLButtonElement | null>;
    mainMenuButtonRef: RefObject<HTMLButtonElement | null>;
    onResume: () => void;
    onExit: () => void;
}

export function PauseOverlay({
    resumeButtonRef,
    mainMenuButtonRef,
    onResume,
    onExit,
}: PauseOverlayProps) {
    return (
        <div className="pause-overlay">
            <section
                className="pause-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="pause-heading"
            >
                <h2 id="pause-heading">Paused</h2>

                <p>Ready when you are.</p>

                <button type="button" ref={resumeButtonRef} onClick={onResume}>
                    Resume
                </button>

                <button type="button" ref={mainMenuButtonRef} onClick={onExit}>
                    Main Menu
                </button>
            </section>
        </div>
    );
}
