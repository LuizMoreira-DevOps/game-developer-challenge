import {
    RULESET_VERSION,
    type MatchRecord,
    type PlayerIdentity,
} from "./contracts";

import type {
    CompletedMatchResult,
    StorageAccess,
} from "../state/matchPersistence";

export const PENDING_MATCHES_STORAGE_KEY = "pirate-battle:pending-matches:v1";

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPendingMatch(value: unknown): value is MatchRecord {
    if (!isRecord(value)) {
        return false;
    }

    return (
        typeof value.matchId === "string" &&
        value.matchId.length > 0 &&
        typeof value.playerId === "string" &&
        value.playerId.length > 0 &&
        typeof value.playerName === "string" &&
        value.playerName.length > 0 &&
        typeof value.score === "number" &&
        Number.isSafeInteger(value.score) &&
        value.score >= 0 &&
        typeof value.elapsedSeconds === "number" &&
        Number.isFinite(value.elapsedSeconds) &&
        value.elapsedSeconds >= 0 &&
        typeof value.matchDurationSeconds === "number" &&
        Number.isInteger(value.matchDurationSeconds) &&
        value.matchDurationSeconds >= 60 &&
        value.matchDurationSeconds <= 180 &&
        value.elapsedSeconds <= value.matchDurationSeconds &&
        typeof value.enemySpawnIntervalSeconds === "number" &&
        Number.isInteger(value.enemySpawnIntervalSeconds) &&
        value.enemySpawnIntervalSeconds >= 1 &&
        value.enemySpawnIntervalSeconds <= 30 &&
        (value.endReason === "time" || value.endReason === "destroyed") &&
        (value.endReason !== "time" ||
            value.elapsedSeconds === value.matchDurationSeconds) &&
        value.rulesetVersion === RULESET_VERSION &&
        typeof value.startedAt === "string" &&
        Number.isFinite(Date.parse(value.startedAt)) &&
        typeof value.finishedAt === "string" &&
        Number.isFinite(Date.parse(value.finishedAt))
    );
}

export function readPendingMatches(
    storage: StorageAccess = localStorage,
): MatchRecord[] {
    try {
        const raw = storage.getItem(PENDING_MATCHES_STORAGE_KEY);

        if (!raw) {
            return [];
        }

        const parsed: unknown = JSON.parse(raw);

        if (!Array.isArray(parsed)) {
            return [];
        }

        const unique = new Map<string, MatchRecord>();

        for (const value of parsed) {
            if (isPendingMatch(value) && !unique.has(value.matchId)) {
                unique.set(value.matchId, value);
            }
        }

        return [...unique.values()];
    } catch {
        return [];
    }
}

export function enqueueCompletedMatch(
    result: CompletedMatchResult,
    player: PlayerIdentity,
    storage: StorageAccess = localStorage,
): MatchRecord {
    const match: MatchRecord = {
        matchId: result.id,
        playerId: player.id,
        playerName: player.name,
        score: result.score,
        elapsedSeconds: result.elapsedSeconds,
        endReason: result.reason,
        matchDurationSeconds: result.durationSeconds,
        enemySpawnIntervalSeconds: result.enemySpawnIntervalSeconds,
        rulesetVersion: RULESET_VERSION,
        startedAt: result.startedAt,
        finishedAt: result.finishedAt,
    };

    const pending = readPendingMatches(storage);

    const existing = pending.find((item) => item.matchId === match.matchId);

    if (existing) {
        // Reuse the original payload and its idempotency identity.
        return existing;
    }

    storage.setItem(
        PENDING_MATCHES_STORAGE_KEY,
        JSON.stringify([...pending, match]),
    );

    return match;
}

export function removePendingMatch(
    matchId: string,
    storage: StorageAccess = localStorage,
): void {
    const remaining = readPendingMatches(storage).filter(
        (match) => match.matchId !== matchId,
    );

    storage.setItem(PENDING_MATCHES_STORAGE_KEY, JSON.stringify(remaining));
}

export function getPendingMatchCount(
    storage: StorageAccess = localStorage,
): number {
    return readPendingMatches(storage).length;
}
