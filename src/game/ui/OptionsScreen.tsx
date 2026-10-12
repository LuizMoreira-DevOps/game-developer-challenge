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

    const adjustDuration = (amount: number) => {
        const current = Number(duration) || 90;
        const next = Math.max(60, Math.min(180, current + amount));

        setDuration(String(next));
        setError("");
    };

    const adjustSpawn = (amount: number) => {
        const current = Number(spawnInterval) || 5;
        const next = Math.max(1, Math.min(30, current + amount));

        setSpawnInterval(String(next));
        setError("");
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const nextOptions: MatchOptions = {
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
        <section
            className="app-panel app-panel--options"
            aria-labelledby="options-heading"
        >
            <h2 id="options-heading">Options</h2>

            <form className="options-form" noValidate onSubmit={handleSubmit}>
                <div className="option-field">
                    <label htmlFor="match-duration">
                        Match duration (seconds)
                    </label>

                    <div className="option-stepper">
                        <button
                            type="button"
                            className="round-button"
                            aria-label="Decrease match duration"
                            onClick={() => adjustDuration(-10)}
                        >
                            −
                        </button>

                        <div className="option-input">
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

                            <span aria-hidden="true">s</span>
                        </div>

                        <button
                            type="button"
                            className="round-button"
                            aria-label="Increase match duration"
                            onClick={() => adjustDuration(10)}
                        >
                            +
                        </button>
                    </div>

                    <p className="option-hint">
                        Choose between 60 and 180 seconds.
                    </p>
                </div>

                <div className="option-field">
                    <label htmlFor="enemy-spawn-interval">
                        Enemy spawn interval (seconds)
                    </label>

                    <div className="option-stepper">
                        <button
                            type="button"
                            className="round-button"
                            aria-label="Decrease enemy spawn interval"
                            onClick={() => adjustSpawn(-1)}
                        >
                            −
                        </button>

                        <div className="option-input">
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

                            <span aria-hidden="true">s</span>
                        </div>

                        <button
                            type="button"
                            className="round-button"
                            aria-label="Increase enemy spawn interval"
                            onClick={() => adjustSpawn(1)}
                        >
                            +
                        </button>
                    </div>

                    <p className="option-hint">
                        Choose between 1 and 30 seconds.
                    </p>
                </div>

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
