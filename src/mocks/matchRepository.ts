import {
    RULESET_VERSION,
    type HistoryParams,
    type MatchHistoryResponse,
    type MatchRecord,
    type RankingEntry,
    type RankingParams,
    type RankingResponse,
    type SubmitMatchResponse,
    type PaginatedResponse,
} from "../game/api/contracts";

import { matchFixtures } from "./fixtures";

export const MOCK_MATCH_STORAGE_KEY = "pirate-battle:mock-confirmed-matches:v1";

export interface RepositoryStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

export class MatchConflictError extends Error {
    public constructor(matchId: string) {
        super(`Match ${matchId} already exists with different data.`);

        this.name = "MatchConflictError";
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidTimestamp(value: unknown): value is string {
    return typeof value === "string" && Number.isFinite(Date.parse(value));
}

export function isValidMatchRecord(value: unknown): value is MatchRecord {
    if (!isRecord(value)) {
        return false;
    }

    return (
        typeof value.matchId === "string" &&
        value.matchId.trim().length > 0 &&
        typeof value.playerId === "string" &&
        value.playerId.trim().length > 0 &&
        typeof value.playerName === "string" &&
        value.playerName.trim().length > 0 &&
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
        isValidTimestamp(value.startedAt) &&
        isValidTimestamp(value.finishedAt) &&
        Date.parse(value.finishedAt) >= Date.parse(value.startedAt)
    );
}

const matchFields = [
    "matchId",
    "playerId",
    "playerName",
    "score",
    "elapsedSeconds",
    "endReason",
    "matchDurationSeconds",
    "enemySpawnIntervalSeconds",
    "rulesetVersion",
    "startedAt",
    "finishedAt",
] as const;

function matchesAreIdentical(first: MatchRecord, second: MatchRecord): boolean {
    return matchFields.every((field) => first[field] === second[field]);
}

function compareIds(first: string, second: string): number {
    if (first < second) {
        return -1;
    }

    if (first > second) {
        return 1;
    }

    return 0;
}

export function compareRankingMatches(
    first: MatchRecord,
    second: MatchRecord,
): number {
    return (
        second.score - first.score ||
        first.elapsedSeconds - second.elapsedSeconds ||
        Date.parse(first.finishedAt) - Date.parse(second.finishedAt) ||
        compareIds(first.matchId, second.matchId)
    );
}

export function compareHistoryMatches(
    first: MatchRecord,
    second: MatchRecord,
): number {
    return (
        Date.parse(second.finishedAt) - Date.parse(first.finishedAt) ||
        compareIds(first.matchId, second.matchId)
    );
}

function paginate<T>(
    items: readonly T[],
    page: number,
    pageSize: number,
): PaginatedResponse<T> {
    if (
        !Number.isSafeInteger(page) ||
        page < 1 ||
        !Number.isSafeInteger(pageSize) ||
        pageSize < 1 ||
        pageSize > 50
    ) {
        throw new RangeError(
            "Page must be >= 1 and pageSize must be between 1 and 50.",
        );
    }

    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const start = (page - 1) * pageSize;

    return {
        items: items.slice(start, start + pageSize),
        page,
        pageSize,
        totalItems,
        totalPages,
    };
}

export class MatchRepository {
    private readonly storage: RepositoryStorage;
    private readonly fixtures: readonly MatchRecord[];

    public constructor(
        storage: RepositoryStorage = localStorage,
        fixtures: readonly MatchRecord[] = matchFixtures,
    ) {
        this.storage = storage;
        this.fixtures = fixtures;
    }

    private readSubmittedMatches(): MatchRecord[] {
        try {
            const raw = this.storage.getItem(MOCK_MATCH_STORAGE_KEY);

            if (!raw) {
                return [];
            }

            const parsed: unknown = JSON.parse(raw);

            if (!Array.isArray(parsed)) {
                return [];
            }

            return parsed.filter(isValidMatchRecord);
        } catch {
            return [];
        }
    }

    private readAllMatches(): MatchRecord[] {
        const fixtures = [...this.fixtures];
        const fixtureIds = new Set(fixtures.map((match) => match.matchId));

        const submitted = this.readSubmittedMatches().filter(
            (match) => !fixtureIds.has(match.matchId),
        );

        return [...fixtures, ...submitted];
    }

    public submitMatch(match: MatchRecord): SubmitMatchResponse {
        if (!isValidMatchRecord(match)) {
            throw new RangeError("Invalid completed match record.");
        }

        const existing = this.readAllMatches().find(
            (record) => record.matchId === match.matchId,
        );

        if (existing) {
            if (!matchesAreIdentical(existing, match)) {
                throw new MatchConflictError(match.matchId);
            }

            return {
                match: existing,
                created: false,
            };
        }

        const submitted = this.readSubmittedMatches();

        this.storage.setItem(
            MOCK_MATCH_STORAGE_KEY,
            JSON.stringify([...submitted, match]),
        );

        return {
            match,
            created: true,
        };
    }

    public getRanking(params: RankingParams): RankingResponse {
        if (
            !Number.isInteger(params.matchDurationSeconds) ||
            params.matchDurationSeconds < 60 ||
            params.matchDurationSeconds > 180 ||
            !Number.isInteger(params.enemySpawnIntervalSeconds) ||
            params.enemySpawnIntervalSeconds < 1 ||
            params.enemySpawnIntervalSeconds > 30 ||
            params.rulesetVersion !== RULESET_VERSION
        ) {
            throw new RangeError("Invalid ranking configuration.");
        }

        const sorted = this.readAllMatches()
            .filter(
                (match) =>
                    match.matchDurationSeconds ===
                        params.matchDurationSeconds &&
                    match.enemySpawnIntervalSeconds ===
                        params.enemySpawnIntervalSeconds &&
                    match.rulesetVersion === params.rulesetVersion,
            )
            .sort(compareRankingMatches);

        const ranked: RankingEntry[] = sorted.map((match, index) => ({
            ...match,
            rank: index + 1,
        }));

        return paginate(ranked, params.page, params.pageSize);
    }

    public getHistory(params: HistoryParams): MatchHistoryResponse {
        if (
            typeof params.playerId !== "string" ||
            params.playerId.trim().length === 0
        ) {
            throw new RangeError("Player ID is required.");
        }

        const matches = this.readAllMatches()
            .filter((match) => match.playerId === params.playerId)
            .sort(compareHistoryMatches);

        return paginate(matches, params.page, params.pageSize);
    }

    public reset(): void {
        this.storage.removeItem(MOCK_MATCH_STORAGE_KEY);
    }
}
