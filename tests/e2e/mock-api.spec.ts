import { expect, test, type Page } from "@playwright/test";

import {
    RULESET_VERSION,
    type MatchRecord,
} from "../../src/game/api/contracts";

interface ApiResult {
    status: number;
    data: unknown;
}

interface ApiRequestOptions {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
}

async function requestApi(
    page: Page,
    path: string,
    options?: ApiRequestOptions,
): Promise<ApiResult> {
    return page.evaluate(
        async ({ path, options }) => {
            const response = await fetch(path, options);

            return {
                status: response.status,
                data: (await response.json()) as unknown,
            };
        },
        { path, options },
    );
}

const rankingUrl =
    "/api/ranking" +
    "?matchDurationSeconds=90" +
    "&enemySpawnIntervalSeconds=5" +
    "&rulesetVersion=1" +
    "&page=1" +
    "&pageSize=3";

function createTestMatch(): MatchRecord {
    return {
        matchId: "api-test-match-001",
        playerId: "api-test-player",
        playerName: "Test Captain",
        score: 12,
        elapsedSeconds: 45,
        endReason: "destroyed",
        matchDurationSeconds: 90,
        enemySpawnIntervalSeconds: 5,
        rulesetVersion: RULESET_VERSION,
        startedAt: "2026-10-11T10:00:00.000Z",
        finishedAt: "2026-10-11T10:00:45.000Z",
    };
}

async function openApplication(page: Page): Promise<void> {
    await page.goto("/", {
        waitUntil: "domcontentloaded",
    });

    await expect(
        page.getByRole("heading", { name: "Main Menu" }),
    ).toBeVisible();
}

test("ranking returns ordered paginated results", async ({ page }) => {
    await openApplication(page);

    const firstPage = await requestApi(page, rankingUrl);

    expect(firstPage.status).toBe(200);

    expect(firstPage.data).toMatchObject({
        page: 1,
        pageSize: 3,
        totalItems: 6,
        totalPages: 2,
        items: [
            { matchId: "fixture-001", rank: 1, score: 18 },
            { matchId: "fixture-002", rank: 2, score: 14 },
            { matchId: "fixture-003", rank: 3, score: 14 },
        ],
    });

    const secondPage = await requestApi(
        page,
        rankingUrl.replace("page=1", "page=2"),
    );

    expect(secondPage.status).toBe(200);

    expect(secondPage.data).toMatchObject({
        page: 2,
        totalItems: 6,
        items: [
            { matchId: "fixture-004", rank: 4 },
            { matchId: "fixture-005", rank: 5 },
            { matchId: "fixture-006", rank: 6 },
        ],
    });
});

test("ranking separates matches by configuration", async ({ page }) => {
    await openApplication(page);

    const response = await requestApi(
        page,
        "/api/ranking" +
            "?matchDurationSeconds=120" +
            "&enemySpawnIntervalSeconds=3" +
            "&rulesetVersion=1" +
            "&page=1" +
            "&pageSize=10",
    );

    expect(response.status).toBe(200);

    expect(response.data).toMatchObject({
        totalItems: 2,
        items: [
            { matchId: "fixture-007", score: 25 },
            { matchId: "fixture-008", score: 21 },
        ],
    });
});

test("history returns only the selected player's matches", async ({ page }) => {
    await openApplication(page);

    const response = await requestApi(
        page,
        "/api/matches?playerId=player-ada&page=1&pageSize=10",
    );

    expect(response.status).toBe(200);

    expect(response.data).toMatchObject({
        totalItems: 2,
        items: [
            { matchId: "fixture-007", playerId: "player-ada" },
            { matchId: "fixture-001", playerId: "player-ada" },
        ],
    });
});

test("repeated POST records a completed match only once", async ({ page }) => {
    await openApplication(page);

    const match = createTestMatch();

    const options: ApiRequestOptions = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": match.matchId,
        },
        body: JSON.stringify(match),
    };

    const first = await requestApi(page, "/api/matches", options);

    expect(first.status).toBe(201);
    expect(first.data).toMatchObject({
        created: true,
        match: { matchId: match.matchId },
    });

    const second = await requestApi(page, "/api/matches", options);

    expect(second.status).toBe(200);
    expect(second.data).toMatchObject({
        created: false,
        match: { matchId: match.matchId },
    });

    const history = await requestApi(
        page,
        "/api/matches?playerId=api-test-player&page=1&pageSize=10",
    );

    expect(history.data).toMatchObject({
        totalItems: 1,
        items: [{ matchId: match.matchId }],
    });

    // Confirmed records must survive a browser refresh.
    await page.reload({ waitUntil: "domcontentloaded" });

    await expect(
        page.getByRole("heading", { name: "Main Menu" }),
    ).toBeVisible();

    const persisted = await requestApi(
        page,
        "/api/matches?playerId=api-test-player&page=1&pageSize=10",
    );

    expect(persisted.data).toMatchObject({
        totalItems: 1,
        items: [{ matchId: match.matchId }],
    });
});

test("conflicting match submissions return HTTP 409", async ({ page }) => {
    await openApplication(page);

    const match = createTestMatch();

    const first = await requestApi(page, "/api/matches", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": match.matchId,
        },
        body: JSON.stringify(match),
    });

    expect(first.status).toBe(201);

    const conflict = await requestApi(page, "/api/matches", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": match.matchId,
        },
        body: JSON.stringify({
            ...match,
            score: 999,
        }),
    });

    expect(conflict.status).toBe(409);

    expect(conflict.data).toMatchObject({
        error: {
            code: "MATCH_CONFLICT",
        },
    });
});

test("invalid idempotency keys are rejected", async ({ page }) => {
    await openApplication(page);

    const match = createTestMatch();

    const response = await requestApi(page, "/api/matches", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": "wrong-id",
        },
        body: JSON.stringify(match),
    });

    expect(response.status).toBe(400);

    expect(response.data).toMatchObject({
        error: {
            code: "INVALID_IDEMPOTENCY_KEY",
        },
    });
});

test("invalid ranking parameters return HTTP 400", async ({ page }) => {
    await openApplication(page);

    const response = await requestApi(
        page,
        "/api/ranking" +
            "?matchDurationSeconds=999" +
            "&enemySpawnIntervalSeconds=5" +
            "&rulesetVersion=1" +
            "&page=1" +
            "&pageSize=3",
    );

    expect(response.status).toBe(400);

    expect(response.data).toMatchObject({
        error: {
            code: "INVALID_REQUEST",
        },
    });
});
