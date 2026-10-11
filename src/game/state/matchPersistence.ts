import {
    defaultGameplayConfig,
    type GameplayConfig,
} from "../config/gameplayConfig";
import type { GameSimulationSnapshot } from "../core/GameSimulation";

export interface MatchOptions {
    readonly matchDurationSeconds: number;
    readonly enemySpawnIntervalSeconds: number;
}

export interface MatchSession {
    readonly id: string;
    readonly startedAt: string;
    readonly config: Readonly<GameplayConfig>;
}

export interface CompletedMatchResult {
    readonly id: string;
    readonly status: "completed";
    readonly reason: "time" | "destroyed";
    readonly score: number;
    readonly elapsedSeconds: number;
    readonly remainingSeconds: number;
    readonly durationSeconds: number;
    readonly enemySpawnIntervalSeconds: number;
    readonly startedAt: string;
    readonly finishedAt: string;
}

export interface AbandonedMatch {
    readonly id: string;
    readonly status: "abandoned";
    readonly startedAt: string;
    readonly abandonedAt: string;
}

export type StorageAccess = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const MATCH_STORAGE_KEYS = {
    options: "pirate-battle:options:v1",
    active: "pirate-battle:active-match:v1",
    completed: "pirate-battle:last-completed:v1",
    abandoned: "pirate-battle:last-abandoned:v1",
} as const;

export const defaultMatchOptions: Readonly<MatchOptions> = Object.freeze({
    matchDurationSeconds: defaultGameplayConfig.matchDurationSeconds,
    enemySpawnIntervalSeconds: defaultGameplayConfig.enemySpawnIntervalSeconds,
});

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isValidMatchOptions(value: unknown): value is MatchOptions {
    if (!isRecord(value)) {
        return false;
    }

    return (
        typeof value.matchDurationSeconds === "number" &&
        Number.isInteger(value.matchDurationSeconds) &&
        value.matchDurationSeconds >= 60 &&
        value.matchDurationSeconds <= 180 &&
        typeof value.enemySpawnIntervalSeconds === "number" &&
        Number.isInteger(value.enemySpawnIntervalSeconds) &&
        value.enemySpawnIntervalSeconds >= 1 &&
        value.enemySpawnIntervalSeconds <= 30
    );
}

function readJson(storage: StorageAccess, key: string): unknown {
    try {
        const raw = storage.getItem(key);
        return raw === null ? null : JSON.parse(raw);
    } catch {
        return null;
    }
}

export function loadMatchOptions(
    storage: StorageAccess = localStorage,
): MatchOptions {
    const saved = readJson(storage, MATCH_STORAGE_KEYS.options);

    if (!isValidMatchOptions(saved)) {
        return { ...defaultMatchOptions };
    }

    return {
        matchDurationSeconds: saved.matchDurationSeconds,
        enemySpawnIntervalSeconds: saved.enemySpawnIntervalSeconds,
    };
}

export function saveMatchOptions(
    options: MatchOptions,
    storage: StorageAccess = localStorage,
): void {
    if (!isValidMatchOptions(options)) {
        throw new RangeError("Invalid match options.");
    }

    storage.setItem(MATCH_STORAGE_KEYS.options, JSON.stringify(options));
}

export function createMatchSession(
    options: MatchOptions,
    id: string = crypto.randomUUID(),
    startedAt: string = new Date().toISOString(),
): MatchSession {
    if (!isValidMatchOptions(options)) {
        throw new RangeError("Invalid match options.");
    }

    const config: Readonly<GameplayConfig> = Object.freeze({
        ...defaultGameplayConfig,
        matchDurationSeconds: options.matchDurationSeconds,
        enemySpawnIntervalSeconds: options.enemySpawnIntervalSeconds,
    });

    return Object.freeze({
        id,
        startedAt,
        config,
    });
}

export function beginMatch(
    session: MatchSession,
    storage: StorageAccess = localStorage,
): void {
    storage.setItem(
        MATCH_STORAGE_KEYS.active,
        JSON.stringify({
            id: session.id,
            status: "active",
            startedAt: session.startedAt,
            config: session.config,
        }),
    );
}

export function recordCompletedMatch(
    session: MatchSession,
    snapshot: GameSimulationSnapshot,
    storage: StorageAccess = localStorage,
): CompletedMatchResult {
    if (snapshot.isRunning || snapshot.endReason === null) {
        throw new Error("Cannot complete an active match.");
    }

    const active = readJson(storage, MATCH_STORAGE_KEYS.active);

    if (
        !isRecord(active) ||
        active.status !== "active" ||
        active.id !== session.id
    ) {
        throw new Error("Match session is no longer active.");
    }

    const result: CompletedMatchResult = Object.freeze({
        id: session.id,
        status: "completed",
        reason: snapshot.endReason,
        score: snapshot.score,
        elapsedSeconds: snapshot.elapsedSeconds,
        remainingSeconds: snapshot.remainingSeconds,
        durationSeconds: session.config.matchDurationSeconds,
        enemySpawnIntervalSeconds: session.config.enemySpawnIntervalSeconds,
        startedAt: session.startedAt,
        finishedAt: new Date().toISOString(),
    });

    storage.setItem(MATCH_STORAGE_KEYS.completed, JSON.stringify(result));

    storage.removeItem(MATCH_STORAGE_KEYS.active);

    return result;
}

export function readLastCompletedResult(
    storage: StorageAccess = localStorage,
): CompletedMatchResult | null {
    const value = readJson(storage, MATCH_STORAGE_KEYS.completed);

    if (!isRecord(value)) {
        return null;
    }

    if (
        value.status !== "completed" ||
        typeof value.id !== "string" ||
        (value.reason !== "time" && value.reason !== "destroyed") ||
        typeof value.score !== "number" ||
        !Number.isFinite(value.score) ||
        value.score < 0 ||
        typeof value.elapsedSeconds !== "number" ||
        !Number.isFinite(value.elapsedSeconds) ||
        value.elapsedSeconds < 0 ||
        typeof value.remainingSeconds !== "number" ||
        !Number.isFinite(value.remainingSeconds) ||
        value.remainingSeconds < 0 ||
        typeof value.durationSeconds !== "number" ||
        !Number.isInteger(value.durationSeconds) ||
        value.durationSeconds < 60 ||
        value.durationSeconds > 180 ||
        typeof value.enemySpawnIntervalSeconds !== "number" ||
        !Number.isInteger(value.enemySpawnIntervalSeconds) ||
        value.enemySpawnIntervalSeconds < 1 ||
        value.enemySpawnIntervalSeconds > 30 ||
        typeof value.startedAt !== "string" ||
        typeof value.finishedAt !== "string"
    ) {
        return null;
    }

    return value as unknown as CompletedMatchResult;
}

export function abandonActiveMatch(
    storage: StorageAccess = localStorage,
): AbandonedMatch | null {
    const active = readJson(storage, MATCH_STORAGE_KEYS.active);

    if (
        !isRecord(active) ||
        active.status !== "active" ||
        typeof active.id !== "string" ||
        typeof active.startedAt !== "string"
    ) {
        storage.removeItem(MATCH_STORAGE_KEYS.active);
        return null;
    }

    const abandoned: AbandonedMatch = {
        id: active.id,
        status: "abandoned",
        startedAt: active.startedAt,
        abandonedAt: new Date().toISOString(),
    };

    storage.setItem(MATCH_STORAGE_KEYS.abandoned, JSON.stringify(abandoned));

    storage.removeItem(MATCH_STORAGE_KEYS.active);

    return abandoned;
}
