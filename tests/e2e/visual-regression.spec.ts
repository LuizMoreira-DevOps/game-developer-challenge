import { expect, test } from "@playwright/test";
import { MATCH_STORAGE_KEYS } from "../../src/game/state/matchPersistence";

test.use({
    locale: "en-US",
    timezoneId: "UTC",
    colorScheme: "light",
    deviceScaleFactor: 1,
});

test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
        testInfo.project.name !== "chromium-desktop",
        "Versioned desktop visual baselines.",
    );

    await page.goto("/");
    await expect(
        page.getByRole("heading", { name: "Main Menu" }),
    ).toBeVisible();
});

test("main menu visual baseline", async ({ page }) => {
    await expect(page.locator(".app-panel")).toHaveScreenshot(
        "main-menu.png",
        {
            animations: "disabled",
            maxDiffPixelRatio: 0.03,
        },
    );
});

test("paused arena visual baseline", async ({ page }) => {
    await page.getByRole("button", {
        name: "Play",
        exact: true,
    }).click();

    await page.bringToFront();

    const canvas = page
        .getByTestId("game-canvas-container")
        .locator("canvas");

    await expect(canvas).toBeVisible({ timeout: 20000 });

    const resume = page.getByRole("button", {
        name: "Resume",
        exact: true,
    });

    if (await resume.isVisible()) {
        await resume.click();
    }

    await page.getByRole("button", {
        name: "Pause",
        exact: true,
    }).click();

    await expect(
        page.getByRole("status", { name: "Match status" }),
    ).toContainText("Paused");

    await expect(canvas).toHaveScreenshot("paused-arena.png", {
        animations: "disabled",
        maxDiffPixelRatio: 0.05,
    });
});

test("match result visual baseline", async ({ page }) => {
    await page.evaluate((key) => {
        localStorage.setItem(
            key,
            JSON.stringify({
                id: "visual-fixture",
                status: "completed",
                reason: "time",
                score: 12,
                elapsedSeconds: 90,
                remainingSeconds: 0,
                durationSeconds: 90,
                enemySpawnIntervalSeconds: 5,
                startedAt: "2026-10-11T10:00:00.000Z",
                finishedAt: "2026-10-11T10:01:30.000Z",
            }),
        );
    }, MATCH_STORAGE_KEYS.completed);

    await page.reload();

    await page.getByRole("button", {
        name: "View Last Result",
    }).click();

    await expect(
        page.getByRole("heading", { name: "Match Result" }),
    ).toBeVisible();

    await expect(page.locator(".app-panel")).toHaveScreenshot(
        "match-result.png",
        {
            animations: "disabled",
            mask: [
                page.getByRole("status", {
                    name: "Submission status",
                }),
            ],
            maxDiffPixelRatio: 0.03,
        },
    );
});