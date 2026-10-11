import { expect, test, type Page } from "@playwright/test";

import {
    MOCK_SCENARIO_STORAGE_KEY,
    type NetworkScenario,
} from "../../src/mocks/networkScenarios";

const rankingUrl =
    "/api/ranking" +
    "?matchDurationSeconds=90" +
    "&enemySpawnIntervalSeconds=5" +
    "&rulesetVersion=1" +
    "&page=1" +
    "&pageSize=3";

const historyUrl = "/api/matches?playerId=player-ada&page=1&pageSize=10";

async function openApp(page: Page): Promise<void> {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(
        page.getByRole("heading", { name: "Main Menu" }),
    ).toBeVisible();
}

async function selectScenario(
    page: Page,
    scenario: NetworkScenario,
): Promise<void> {
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
        key: MOCK_SCENARIO_STORAGE_KEY,
        value: scenario,
    });
}

async function resetScenario(page: Page): Promise<void> {
    await page.evaluate(
        (key) => localStorage.removeItem(key),
        MOCK_SCENARIO_STORAGE_KEY,
    );
}

async function requestApi(
    page: Page,
    url: string,
): Promise<{ status: number; data: unknown }> {
    return page.evaluate(async (path) => {
        const response = await fetch(path);

        return {
            status: response.status,
            data: (await response.json()) as unknown,
        };
    }, url);
}

test("ranking failure returns 500 and recovers after reset", async ({
    page,
}) => {
    await openApp(page);

    await selectScenario(page, "ranking-error");

    const failed = await requestApi(page, rankingUrl);

    expect(failed.status).toBe(500);
    expect(failed.data).toMatchObject({
        error: {
            code: "RANKING_UNAVAILABLE",
        },
    });

    await resetScenario(page);

    const recovered = await requestApi(page, rankingUrl);

    expect(recovered.status).toBe(200);
    expect(recovered.data).toMatchObject({
        totalItems: 6,
        items: [
            { matchId: "fixture-001" },
            { matchId: "fixture-002" },
            { matchId: "fixture-003" },
        ],
    });
});

test("history failure does not affect ranking", async ({ page }) => {
    await openApp(page);

    await selectScenario(page, "history-error");

    const history = await requestApi(page, historyUrl);
    const ranking = await requestApi(page, rankingUrl);

    expect(history.status).toBe(500);
    expect(history.data).toMatchObject({
        error: {
            code: "HISTORY_UNAVAILABLE",
        },
    });

    expect(ranking.status).toBe(200);
});

test("empty scenario returns valid empty collections", async ({ page }) => {
    await openApp(page);

    await selectScenario(page, "empty");

    for (const url of [rankingUrl, historyUrl]) {
        const response = await requestApi(page, url);

        expect(response.status).toBe(200);
        expect(response.data).toMatchObject({
            items: [],
            totalItems: 0,
            totalPages: 0,
        });
    }
});

test("HTTP 400 and 500 scenarios return structured errors", async ({
    page,
}) => {
    await openApp(page);

    await selectScenario(page, "http-400");

    const badRequest = await requestApi(page, rankingUrl);

    expect(badRequest.status).toBe(400);
    expect(badRequest.data).toMatchObject({
        error: { code: "SCENARIO_BAD_REQUEST" },
    });

    await selectScenario(page, "http-500");

    const serverError = await requestApi(page, rankingUrl);

    expect(serverError.status).toBe(500);
    expect(serverError.data).toMatchObject({
        error: { code: "SCENARIO_SERVER_ERROR" },
    });
});

test("offline scenario produces a network failure", async ({ page }) => {
    await openApp(page);

    await selectScenario(page, "offline");

    const failed = await page.evaluate(async (url) => {
        try {
            await fetch(url);
            return false;
        } catch {
            return true;
        }
    }, rankingUrl);

    expect(failed).toBe(true);

    await resetScenario(page);

    const recovered = await requestApi(page, rankingUrl);

    expect(recovered.status).toBe(200);
});

test("out-of-order scenario delivers page two first", async ({ page }) => {
    await openApp(page);

    await selectScenario(page, "out-of-order");

    const result = await page.evaluate(async (url) => {
        const completionOrder: number[] = [];

        const fetchPage = async (pageNumber: number) => {
            const path = url.replace("page=1", `page=${pageNumber}`);

            const response = await fetch(path);
            const data = await response.json();

            completionOrder.push(pageNumber);

            return {
                status: response.status,
                data,
            };
        };

        const [first, second] = await Promise.all([fetchPage(1), fetchPage(2)]);

        return { completionOrder, first, second };
    }, rankingUrl);

    expect(result.completionOrder).toEqual([2, 1]);

    expect(result.first.data).toMatchObject({
        page: 1,
        items: [
            { matchId: "fixture-001" },
            { matchId: "fixture-002" },
            { matchId: "fixture-003" },
        ],
    });

    expect(result.second.data).toMatchObject({
        page: 2,
        items: [
            { matchId: "fixture-004" },
            { matchId: "fixture-005" },
            { matchId: "fixture-006" },
        ],
    });
});
