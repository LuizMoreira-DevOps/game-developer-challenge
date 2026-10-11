import { expect, test, type Page } from "@playwright/test";

import { MATCH_STORAGE_KEYS } from "../../src/game/state/matchPersistence";
import { MOCK_SCENARIO_STORAGE_KEY } from "../../src/mocks/networkScenarios";

async function openMenu(page: Page) {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(
        page.getByRole("heading", { name: "Main Menu" }),
    ).toBeVisible();
}

test("ranking displays results and supports pagination", async ({ page }) => {
    await openMenu(page);

    await page.getByRole("button", { name: "Ranking" }).click();

    await expect(page.getByText("Captain Ada")).toBeVisible();

    await expect(page.getByText("Page 1 of 2")).toBeVisible();

    await page.getByRole("button", { name: "Next" }).click();

    await expect(page.getByText("Captain Dennis")).toBeVisible();

    await expect(page.getByText("Page 2 of 2")).toBeVisible();
});

test("ranking error can recover without restarting", async ({ page }) => {
    await openMenu(page);

    await page.evaluate((key) => {
        localStorage.setItem(key, "ranking-error");
    }, MOCK_SCENARIO_STORAGE_KEY);

    await page.getByRole("button", { name: "Ranking" }).click();

    await expect(page.getByRole("alert")).toContainText(
        "Ranking is temporarily unavailable.",
        {
            timeout: 15000,
        },
    );

    await page.evaluate((key) => {
        localStorage.removeItem(key);
    }, MOCK_SCENARIO_STORAGE_KEY);

    await page
        .getByRole("button", {
            name: "Refresh Ranking",
        })
        .click();

    await expect(page.getByText("Captain Ada")).toBeVisible();
});

test("match history displays an empty state for a new player", async ({
    page,
}) => {
    await openMenu(page);

    await page
        .getByRole("button", {
            name: "Match History",
        })
        .click();

    await expect(
        page.getByText("No completed matches recorded yet."),
    ).toBeVisible();
});

test("an offline completed match is recovered and synced", async ({ page }) => {
    await openMenu(page);

    await page.evaluate(
        ({ scenarioKey, completedKey }) => {
            localStorage.setItem(scenarioKey, "offline");

            localStorage.setItem(
                completedKey,
                JSON.stringify({
                    id: "recovery-ui-test-001",
                    status: "completed",
                    reason: "destroyed",
                    score: 12,
                    elapsedSeconds: 45,
                    remainingSeconds: 45,
                    durationSeconds: 90,
                    enemySpawnIntervalSeconds: 5,
                    startedAt: "2026-10-11T10:00:00.000Z",
                    finishedAt: "2026-10-11T10:00:45.000Z",
                }),
            );
        },
        {
            scenarioKey: MOCK_SCENARIO_STORAGE_KEY,
            completedKey: MATCH_STORAGE_KEYS.completed,
        },
    );

    await page.reload({ waitUntil: "domcontentloaded" });

    await page
        .getByRole("button", {
            name: "View Last Result",
        })
        .click();

    const status = page.getByRole("status", {
        name: "Submission status",
    });

    await expect(status).toContainText("Pending");

    await page.evaluate((key) => {
        localStorage.removeItem(key);
    }, MOCK_SCENARIO_STORAGE_KEY);

    await page
        .getByRole("button", {
            name: "Retry Submission",
        })
        .click();

    await expect(status).toContainText("Synced", {
        timeout: 15000,
    });

    await page.reload({ waitUntil: "domcontentloaded" });

    await page
        .getByRole("button", {
            name: "View Last Result",
        })
        .click();

    await expect(
        page.getByRole("status", { name: "Submission status" }),
    ).toContainText("Synced");

    await page
        .getByRole("button", {
            name: "Main Menu",
        })
        .click();

    await page
        .getByRole("button", {
            name: "Match History",
        })
        .click();

    await expect(page.getByRole("cell", { name: "12" })).toBeVisible();
});
