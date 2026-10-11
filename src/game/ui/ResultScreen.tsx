import type { CompletedMatchResult } from "../state/matchPersistence";

interface ResultScreenProps {
    result: CompletedMatchResult;
    onPlayAgain: () => void;
    onMainMenu: () => void;
}

export function ResultScreen({
    result,
    onPlayAgain,
    onMainMenu,
}: ResultScreenProps) {
    return (
        <section className="app-panel" aria-labelledby="result-heading">
            <h2 id="result-heading">Match Result</h2>

            <p>
                Outcome:{" "}
                <strong>
                    {result.reason === "time" ? "Time's up" : "Ship destroyed"}
                </strong>
            </p>

            <p>
                Final score:{" "}
                <output aria-label="Final score">{result.score}</output>
            </p>

            <p>
                Time survived:{" "}
                <output aria-label="Time survived">
                    {Math.round(result.elapsedSeconds)}
                </output>
                s
            </p>

            <p>Match duration: {result.durationSeconds}s</p>

            <p>Enemy spawn interval: {result.enemySpawnIntervalSeconds}s</p>

            <p>
                Completed:{" "}
                <time dateTime={result.finishedAt}>
                    {new Date(result.finishedAt).toLocaleString()}
                </time>
            </p>

            <div className="app-actions">
                <button type="button" onClick={onPlayAgain}>
                    Play Again
                </button>

                <button type="button" onClick={onMainMenu}>
                    Main Menu
                </button>
            </div>
        </section>
    );
}
