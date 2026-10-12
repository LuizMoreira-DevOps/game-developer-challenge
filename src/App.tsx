import { useEffect, useState } from "react";

import jungleLogo from "../assets/logo_jungle_gaming.svg";

import { PixiGameCanvas } from "./game/rendering/PixiGameCanvas";
import type { GameSimulationSnapshot } from "./game/core/GameSimulation";

import {
    abandonActiveMatch,
    beginMatch,
    createMatchSession,
    loadMatchOptions,
    readLastCompletedResult,
    recordCompletedMatch,
    saveMatchOptions,
    type CompletedMatchResult,
    type MatchOptions,
    type MatchSession,
} from "./game/state/matchPersistence";

import { OptionsScreen } from "./game/ui/OptionsScreen";
import { ResultScreen } from "./game/ui/ResultScreen";
import { RankingScreen, HistoryScreen } from "./game/ui/RemoteScreens";

import { isMatchConfirmed } from "./game/api/submissionReceipts";
import { readPendingMatches } from "./game/api/pendingMatches";
import { usePendingMatchSync } from "./game/api/usePendingMatchSync";

import "./game/ui/application-ui.css";

import "./game/ui/visual-refinement.css";

type Screen = "menu" | "options" | "game" | "result" | "ranking" | "history";

function App() {
    const [screen, setScreen] = useState<Screen>("menu");

    const [options, setOptions] = useState<MatchOptions>(() =>
        loadMatchOptions(),
    );

    const [lastResult, setLastResult] = useState<CompletedMatchResult | null>(
        () => readLastCompletedResult(),
    );

    const [session, setSession] = useState<MatchSession | null>(null);

    const {
        player,
        pendingCount,
        isSyncing,
        syncError,
        queueCompletedMatch,
        syncPendingMatches,
    } = usePendingMatchSync();

    useEffect(() => {
        abandonActiveMatch();

        const handlePageHide = () => {
            abandonActiveMatch();
        };

        window.addEventListener("pagehide", handlePageHide);

        return () => {
            window.removeEventListener("pagehide", handlePageHide);
        };
    }, []);

    const startNewMatch = () => {
        const nextSession = createMatchSession(options);

        beginMatch(nextSession);

        setSession(nextSession);
        setScreen("game");
    };

    const saveOptions = (nextOptions: MatchOptions) => {
        saveMatchOptions(nextOptions);
        setOptions(nextOptions);
        setScreen("menu");
    };

    const finishMatch = (
        finishedSession: MatchSession,
        snapshot: GameSimulationSnapshot,
    ) => {
        const result = recordCompletedMatch(finishedSession, snapshot);

        queueCompletedMatch(result);

        setLastResult(result);
        setSession(null);
        setScreen("result");
    };

    const exitMatch = () => {
        abandonActiveMatch();
        setSession(null);
        setScreen("menu");
    };

    const resultConfirmed = lastResult
        ? isMatchConfirmed(lastResult.id)
        : false;

    const resultPending = lastResult
        ? readPendingMatches().some((match) => match.matchId === lastResult.id)
        : false;

    const submissionStatus = resultConfirmed
        ? "synced"
        : resultPending && isSyncing
          ? "syncing"
          : resultPending
            ? "pending"
            : "unknown";

    return (
        <main className={`application-main application-main--${screen}`}>
            {screen === "menu" ? (
                <header className="app-brand">
                    <h1>Pirate Battle</h1>
                    <p>THE HIGH SEAS AWAIT</p>
                </header>
            ) : (
                <h1 className="visually-hidden">Pirate Battle</h1>
            )}

            {screen === "menu" && (
                <section
                    className="app-panel app-panel--menu"
                    aria-labelledby="main-menu-heading"
                >
                    <h2 id="main-menu-heading">Main Menu</h2>

                    <p className="menu-intro">Your ship awaits, Captain.</p>

                    <nav
                        className="app-navigation"
                        aria-label="Main navigation"
                    >
                        <button type="button" onClick={startNewMatch}>
                            Play
                        </button>

                        <button
                            type="button"
                            onClick={() => setScreen("options")}
                        >
                            Options
                        </button>

                        <button
                            type="button"
                            onClick={() => setScreen("ranking")}
                        >
                            Ranking
                        </button>

                        <button
                            type="button"
                            onClick={() => setScreen("history")}
                        >
                            Match History
                        </button>
                    </nav>

                    <div
                        className="app-instructions"
                        aria-label="Gameplay controls"
                    >
                        <h3>Gameplay Controls</h3>

                        <p>
                            W / ↑ Forward · A / ← Rotate left · D / → Rotate
                            right
                        </p>

                        <p>
                            Space / F Front cannon · Q Left broadside · E Right
                            broadside
                        </p>

                        <p>Touch controls are available during gameplay.</p>
                    </div>

                    {lastResult && (
                        <div className="app-last-result">
                            <h3>Last Completed Match</h3>

                            <p>
                                <strong>{lastResult.score} points</strong>
                                {" · "}
                                {lastResult.reason === "time"
                                    ? "Time's up"
                                    : "Ship destroyed"}
                            </p>

                            <button
                                type="button"
                                onClick={() => setScreen("result")}
                            >
                                View Last Result
                            </button>
                        </div>
                    )}
                </section>
            )}

            {screen === "options" && (
                <OptionsScreen
                    options={options}
                    onSave={saveOptions}
                    onCancel={() => setScreen("menu")}
                />
            )}

            {screen === "game" && session && (
                <PixiGameCanvas
                    key={session.id}
                    config={session.config}
                    onComplete={(snapshot) => finishMatch(session, snapshot)}
                    onExit={exitMatch}
                />
            )}

            {screen === "result" && lastResult && (
                <ResultScreen
                    result={lastResult}
                    submissionStatus={submissionStatus}
                    pendingCount={pendingCount}
                    syncError={syncError}
                    onRetry={() => void syncPendingMatches()}
                    onPlayAgain={startNewMatch}
                    onMainMenu={() => setScreen("menu")}
                />
            )}

            {screen === "ranking" && (
                <RankingScreen
                    options={options}
                    playerId={player.id}
                    onMainMenu={() => setScreen("menu")}
                    onHistory={() => setScreen("history")}
                />
            )}

            {screen === "history" && (
                <HistoryScreen
                    playerId={player.id}
                    onMainMenu={() => setScreen("menu")}
                    onRanking={() => setScreen("ranking")}
                />
            )}

            {screen !== "game" && (
                <img
                    className="app-watermark"
                    src={jungleLogo}
                    alt="Jungle Gaming"
                />
            )}
        </main>
    );
}

export default App;
