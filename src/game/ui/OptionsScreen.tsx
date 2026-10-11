import { useState, type FormEvent } from "react";

import {
    isValidMatchOptions,
    type MatchOptions,
} from "../state/matchPersistence";

interface OptionsScreenProps {
    options: MatchOptions;
    onSave: (options: MatchOptions) => void;
    onCancel: () => void;
}

export function OptionsScreen({
    options,
    onSave,
    onCancel,
}: OptionsScreenProps) {
    const [duration, setDuration] = useState(
        String(options.matchDurationSeconds),
    );

    const [spawnInterval, setSpawnInterval] = useState(
        String(options.enemySpawnIntervalSeconds),
    );

    const [error, setError] = useState("");

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const nextOptions = {
            matchDurationSeconds: Number(duration),
            enemySpawnIntervalSeconds: Number(spawnInterval),
        };

        if (!isValidMatchOptions(nextOptions)) {
            setError(
                "Choose a duration from 60 to 180 seconds " +
                    "and an enemy spawn interval from 1 to 30 seconds.",
            );
            return;
        }

        setError("");
        onSave(nextOptions);
    };

    return (
        <section aria-labelledby="options-heading" className="app-panel">
            <h2 id="options-heading">Options</h2>

            <form noValidate onSubmit={handleSubmit} className="options-form">
                <label htmlFor="match-duration">Match duration (seconds)</label>

                <input
                    id="match-duration"
                    name="matchDurationSeconds"
                    type="number"
                    min={60}
                    max={180}
                    step={1}
                    required
                    value={duration}
                    onChange={(event) => {
                        setDuration(event.target.value);
                        setError("");
                    }}
                />

                <label htmlFor="enemy-spawn-interval">
                    Enemy spawn interval (seconds)
                </label>

                <input
                    id="enemy-spawn-interval"
                    name="enemySpawnIntervalSeconds"
                    type="number"
                    min={1}
                    max={30}
                    step={1}
                    required
                    value={spawnInterval}
                    onChange={(event) => {
                        setSpawnInterval(event.target.value);
                        setError("");
                    }}
                />

                {error && <p role="alert">{error}</p>}

                <div className="app-actions">
                    <button type="submit">Save Options</button>
                    <button type="button" onClick={onCancel}>
                        Cancel
                    </button>
                </div>
            </form>
        </section>
    );
}
