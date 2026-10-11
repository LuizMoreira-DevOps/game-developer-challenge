import { expect, test } from "@playwright/test";

import { GameSimulation } from "../../src/game/core/GameSimulation";
import {
    abandonActiveMatch,
    beginMatch,
    createMatchSession,
    defaultMatchOptions,
    isValidMatchOptions,
    loadMatchOptions,
    MATCH_STORAGE_KEYS,
    readLastCompletedResult,
    recordCompletedMatch,
    saveMatchOptions,
    type StorageAccess,
} from "../../src/game/state/matchPersistence";

class MemoryStorage implements StorageAccess {
    private readonly entries = new Map<string, string>();

    public getItem(key: string): string | null {
        return this.entries.get(key) ?? null;
    }

    public setItem(key: string, value: string): void {
        this.entries.set(key, value);
    }

    public removeItem(key: string): void {
        this.entries.delete(key);
    }
}

test("persists valid match options", () => {
    const storage = new MemoryStorage();

    saveMatchOptions(
        {
            matchDurationSeconds: 120,
            enemySpawnIntervalSeconds: 3,
        },
        storage,
    );

    expect(loadMatchOptions(storage)).toEqual({
        matchDurationSeconds: 120,
        enemySpawnIntervalSeconds: 3,
    });
});

test("rejects invalid duration and spawn intervals", () => {
    expect(
        isValidMatchOptions({
            matchDurationSeconds: 59,
            enemySpawnIntervalSeconds: 5,
        }),
    ).toBe(false);

    expect(
        isValidMatchOptions({
            matchDurationSeconds: 181,
            enemySpawnIntervalSeconds: 5,
        }),
    ).toBe(false);

    expect(
        isValidMatchOptions({
            matchDurationSeconds: 90,
            enemySpawnIntervalSeconds: 0,
        }),
    ).toBe(false);

    expect(
        isValidMatchOptions({
            matchDurationSeconds: 90,
            enemySpawnIntervalSeconds: 3,
        }),
    ).toBe(true);
});

test("falls back to defaults for corrupted storage", () => {
    const storage = new MemoryStorage();

    storage.setItem(MATCH_STORAGE_KEYS.options, "{not-valid-json");

    expect(loadMatchOptions(storage)).toEqual(defaultMatchOptions);

    storage.setItem(
        MATCH_STORAGE_KEYS.options,
        JSON.stringify({
            matchDurationSeconds: 999,
            enemySpawnIntervalSeconds: -1,
        }),
    );

    expect(loadMatchOptions(storage)).toEqual(defaultMatchOptions);
});

test("creates an immutable configuration snapshot", () => {
    const options = {
        matchDurationSeconds: 120,
        enemySpawnIntervalSeconds: 3,
    };

    const session = createMatchSession(
        options,
        "snapshot-test",
        "2026-10-11T00:00:00.000Z",
    );

    options.matchDurationSeconds = 60;
    options.enemySpawnIntervalSeconds = 10;

    expect(Object.isFrozen(session)).toBe(true);
    expect(Object.isFrozen(session.config)).toBe(true);

    expect(session.config.matchDurationSeconds).toBe(120);
    expect(session.config.enemySpawnIntervalSeconds).toBe(3);

    const simulation = new GameSimulation(session.config);

    simulation.start();

    expect(simulation.getSnapshot().remainingSeconds).toBe(120);
});

test("stores completed matches and clears the active marker", () => {
    const storage = new MemoryStorage();

    const session = createMatchSession(defaultMatchOptions, "completed-test");

    beginMatch(session, storage);

    expect(storage.getItem(MATCH_STORAGE_KEYS.active)).not.toBeNull();

    const simulation = new GameSimulation(session.config, () => 0.5);

    simulation.start();

    simulation.update(
        session.config.matchDurationSeconds,
        {
            forward: false,
            turnLeft: false,
            turnRight: false,
        },
        {
            fireFront: false,
            fireLeftBroadside: false,
            fireRightBroadside: false,
        },
    );

    const snapshot = simulation.getSnapshot();

    expect(snapshot.endReason).toBe("time");

    const result = recordCompletedMatch(session, snapshot, storage);

    expect(result.status).toBe("completed");
    expect(result.reason).toBe("time");
    expect(result.id).toBe("completed-test");

    expect(storage.getItem(MATCH_STORAGE_KEYS.active)).toBeNull();

    expect(readLastCompletedResult(storage)).toEqual(result);
});

test("marks interrupted matches as abandoned, not completed", () => {
    const storage = new MemoryStorage();

    const session = createMatchSession(defaultMatchOptions, "abandoned-test");

    beginMatch(session, storage);

    const abandoned = abandonActiveMatch(storage);

    expect(abandoned?.status).toBe("abandoned");
    expect(abandoned?.id).toBe("abandoned-test");

    expect(storage.getItem(MATCH_STORAGE_KEYS.active)).toBeNull();

    expect(readLastCompletedResult(storage)).toBeNull();

    // Recovery must be idempotent.
    expect(abandonActiveMatch(storage)).toBeNull();
});

test("abandoning a new match preserves the previous completed result", () => {
    const storage = new MemoryStorage();

    const completedSession = createMatchSession(
        defaultMatchOptions,
        "first-match",
    );

    beginMatch(completedSession, storage);

    const simulation = new GameSimulation(completedSession.config);

    simulation.start();
    simulation.stop("destroyed");

    const completed = recordCompletedMatch(
        completedSession,
        simulation.getSnapshot(),
        storage,
    );

    const nextSession = createMatchSession(defaultMatchOptions, "second-match");

    beginMatch(nextSession, storage);
    abandonActiveMatch(storage);

    expect(readLastCompletedResult(storage)).toEqual(completed);
});

test("rejects completion after a match has been abandoned", () => {
    const storage = new MemoryStorage();

    const session = createMatchSession(
        defaultMatchOptions,
        "stale-completion-test",
    );

    beginMatch(session, storage);

    const simulation = new GameSimulation(session.config);

    simulation.start();
    simulation.stop("destroyed");

    abandonActiveMatch(storage);

    expect(() =>
        recordCompletedMatch(session, simulation.getSnapshot(), storage),
    ).toThrow("Match session is no longer active.");

    expect(readLastCompletedResult(storage)).toBeNull();

    expect(storage.getItem(MATCH_STORAGE_KEYS.active)).toBeNull();
});
