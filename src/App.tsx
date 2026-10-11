import { useEffect, useState } from "react";

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

import "./game/ui/application-ui.css";

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

    useEffect(() => {
        // Recover a match left active by a previous reload/crash.
        // This is idempotent under React Strict Mode.
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

        setLastResult(result);
        setSession(null);
        setScreen("result");
    };

    const exitMatch = () => {
        abandonActiveMatch();

        setSession(null);
        setScreen("menu");
    };

    return (
        <main className="application-main">
            <h1>Pirate Battle</h1>

            {screen === "menu" && (
                <section
                    className="app-panel"
                    aria-labelledby="main-menu-heading"
                >
                    <h2 id="main-menu-heading">Main Menu</h2>

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
                            W / ↑: Forward · A / ←: Rotate left · D / →: Rotate
                            right
                        </p>

                        <p>
                            Space / F: Front cannon · Q: Left broadside · E:
                            Right broadside
                        </p>

                        <p>
                            Touch: use the movement and cannon buttons during
                            gameplay.
                        </p>
                    </div>

                    {lastResult && (
                        <div className="app-last-result">
                            <h3>Last Completed Match</h3>

                            <p>
                                Score: {lastResult.score} ·
                                {lastResult.reason === "time"
                                    ? " Time's up"
                                    : " Ship destroyed"}
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
                    onPlayAgain={startNewMatch}
                    onMainMenu={() => setScreen("menu")}
                />
            )}

            {(screen === "ranking" || screen === "history") && (
                <section className="app-panel">
                    <h2>
                        {screen === "ranking" ? "Ranking" : "Match History"}
                    </h2>

                    <p>
                        This section will be connected to the API in issue #26.
                    </p>

                    <button type="button" onClick={() => setScreen("menu")}>
                        Main Menu
                    </button>
                </section>
            )}
        </main>
    );
}

export default App;
