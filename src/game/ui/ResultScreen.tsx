import type { CompletedMatchResult } from "../state/matchPersistence";

export type SubmissionStatus = "pending" | "syncing" | "synced" | "unknown";

interface ResultScreenProps {
    result: CompletedMatchResult;
    submissionStatus: SubmissionStatus;
    pendingCount: number;
    syncError: string | null;
    onRetry: () => void;
    onPlayAgain: () => void;
    onMainMenu: () => void;
}

const statusLabels: Record<SubmissionStatus, string> = {
    pending: "Pending",
    syncing: "Syncing",
    synced: "Synced",
    unknown: "Unknown",
};

export function ResultScreen({
    result,
    submissionStatus,
    pendingCount,
    syncError,
    onRetry,
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

            <div aria-label="Match submission">
                <p role="status" aria-label="Submission status">
                    Registration:{" "}
                    <strong>{statusLabels[submissionStatus]}</strong>
                </p>

                {pendingCount > 0 && <p>Pending submissions: {pendingCount}</p>}

                {syncError && submissionStatus === "pending" && (
                    <p role="alert">
                        The submission could not be confirmed. It remains saved
                        locally.
                    </p>
                )}

                {submissionStatus === "unknown" && (
                    <p>Registration has not been confirmed.</p>
                )}

                {submissionStatus === "pending" && (
                    <button type="button" onClick={onRetry}>
                        Retry Submission
                    </button>
                )}
            </div>

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
