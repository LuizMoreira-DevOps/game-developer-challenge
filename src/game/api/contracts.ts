export const RULESET_VERSION = "1" as const;

export interface PlayerIdentity {
    readonly id: string;
    readonly name: string;
}

export interface MatchRecord {
    readonly matchId: string;
    readonly playerId: string;
    readonly playerName: string;
    readonly score: number;
    readonly elapsedSeconds: number;
    readonly endReason: "time" | "destroyed";
    readonly matchDurationSeconds: number;
    readonly enemySpawnIntervalSeconds: number;
    readonly rulesetVersion: typeof RULESET_VERSION;
    readonly startedAt: string;
    readonly finishedAt: string;
}

export type SubmitMatchRequest = MatchRecord;

export interface SubmitMatchResponse {
    readonly match: MatchRecord;
    readonly created: boolean;
}

export interface RankingEntry extends MatchRecord {
    readonly rank: number;
}

export interface PaginatedResponse<T> {
    readonly items: readonly T[];
    readonly page: number;
    readonly pageSize: number;
    readonly totalItems: number;
    readonly totalPages: number;
}

export interface RankingParams {
    readonly matchDurationSeconds: number;
    readonly enemySpawnIntervalSeconds: number;
    readonly rulesetVersion: typeof RULESET_VERSION;
    readonly page: number;
    readonly pageSize: number;
}

export interface HistoryParams {
    readonly playerId: string;
    readonly page: number;
    readonly pageSize: number;
}

export type RankingResponse = PaginatedResponse<RankingEntry>;

export type MatchHistoryResponse = PaginatedResponse<MatchRecord>;

export interface ApiErrorResponse {
    readonly error: {
        readonly code: string;
        readonly message: string;
    };
}
