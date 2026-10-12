import { http, HttpResponse } from "msw";

import { RULESET_VERSION } from "../game/api/contracts";

import {
    isValidMatchRecord,
    MatchConflictError,
    MatchRepository,
} from "./matchRepository";

import {
    applyScenarioBefore,
    applyScenarioAfterSubmit,
    getNetworkScenario,
} from "./networkScenarios";

function apiError(status: number, code: string, message: string): Response {
    return HttpResponse.json(
        {
            error: {
                code,
                message,
            },
        },
        { status },
    );
}

function integerParam(url: URL, name: string): number | null {
    const raw = url.searchParams.get(name);

    if (raw === null || !/^\d+$/.test(raw)) {
        return null;
    }

    const value = Number(raw);

    return Number.isSafeInteger(value) ? value : null;
}

function handleRepositoryError(error: unknown): Response {
    if (error instanceof MatchConflictError) {
        return apiError(409, "MATCH_CONFLICT", error.message);
    }

    if (error instanceof RangeError) {
        return apiError(400, "INVALID_REQUEST", error.message);
    }

    return apiError(
        500,
        "INTERNAL_ERROR",
        "The mock API could not process the request.",
    );
}

export const handlers = [
    // GET /api/ranking
    http.get("*/api/ranking", async ({ request }) => {
        const url = new URL(request.url);

        const matchDurationSeconds = integerParam(url, "matchDurationSeconds");

        const enemySpawnIntervalSeconds = integerParam(
            url,
            "enemySpawnIntervalSeconds",
        );

        const page = integerParam(url, "page");
        const pageSize = integerParam(url, "pageSize");

        const rulesetVersion = url.searchParams.get("rulesetVersion");

        if (
            matchDurationSeconds === null ||
            enemySpawnIntervalSeconds === null ||
            page === null ||
            pageSize === null ||
            rulesetVersion !== RULESET_VERSION
        ) {
            return apiError(
                400,
                "INVALID_QUERY",
                "Invalid ranking query parameters.",
            );
        }

        // Apply the selected network scenario before querying.
        const scenarioResponse = await applyScenarioBefore("ranking", page);

        if (scenarioResponse) {
            return scenarioResponse;
        }

        try {
            const repository = new MatchRepository();

            const result = repository.getRanking({
                matchDurationSeconds,
                enemySpawnIntervalSeconds,
                rulesetVersion,
                page,
                pageSize,
            });

            if (getNetworkScenario() === "empty") {
                return HttpResponse.json({
                    ...result,
                    items: [],
                    totalItems: 0,
                    totalPages: 0,
                });
            }

            return HttpResponse.json(result);
        } catch (error: unknown) {
            return handleRepositoryError(error);
        }
    }),

    // GET /api/matches
    http.get("*/api/matches", async ({ request }) => {
        const url = new URL(request.url);

        const playerId = url.searchParams.get("playerId");

        const page = integerParam(url, "page");
        const pageSize = integerParam(url, "pageSize");

        if (!playerId?.trim() || page === null || pageSize === null) {
            return apiError(
                400,
                "INVALID_QUERY",
                "Invalid match history query parameters.",
            );
        }

        // Apply the selected network scenario before querying.
        const scenarioResponse = await applyScenarioBefore("history", page);

        if (scenarioResponse) {
            return scenarioResponse;
        }

        try {
            const repository = new MatchRepository();

            const result = repository.getHistory({
                playerId,
                page,
                pageSize,
            });

            if (getNetworkScenario() === "empty") {
                return HttpResponse.json({
                    ...result,
                    items: [],
                    totalItems: 0,
                    totalPages: 0,
                });
            }

            return HttpResponse.json(result);
        } catch (error: unknown) {
            return handleRepositoryError(error);
        }
    }),

    // POST /api/matches
    http.post("*/api/matches", async ({ request }) => {
        let body: unknown;

        try {
            body = await request.json();
        } catch {
            return apiError(
                400,
                "INVALID_JSON",
                "The request body must contain valid JSON.",
            );
        }

        if (!isValidMatchRecord(body)) {
            return apiError(
                400,
                "INVALID_MATCH",
                "The completed match record is invalid.",
            );
        }

        const idempotencyKey = request.headers.get("Idempotency-Key");

        if (idempotencyKey !== body.matchId) {
            return apiError(
                400,
                "INVALID_IDEMPOTENCY_KEY",
                "Idempotency-Key must match matchId.",
            );
        }

        // Network failures occur before saving the match.
        const scenarioResponse = await applyScenarioBefore("submit");

        if (scenarioResponse) {
            return scenarioResponse;
        }

        try {
            const repository = new MatchRepository();

            const result = repository.submitMatch(body);

            // Simulate a delayed response after successful storage.
            await applyScenarioAfterSubmit();

            return HttpResponse.json(result, {
                status: result.created ? 201 : 200,
            });
        } catch (error: unknown) {
            return handleRepositoryError(error);
        }
    }),
];
