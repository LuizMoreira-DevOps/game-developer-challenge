import { expect, test, type Page } from "@playwright/test";

import { MATCH_STORAGE_KEYS } from "../../src/game/state/matchPersistence";

async function openMenu(page: Page): Promise<void> {
    await page.goto("/", {
        waitUntil: "domcontentloaded",
    });

    await expect(
        page.getByRole("heading", { name: "Main Menu" }),
    ).toBeVisible();
}

async function startGame(page: Page): Promise<void> {
    await page
        .getByRole("button", {
            name: "Play",
            exact: true,
        })
        .click();

    await page.bringToFront();

    await expect(
        page.getByTestId("game-canvas-container").locator("canvas"),
    ).toBeVisible({ timeout: 15000 });

    const resume = page.getByRole("button", {
        name: "Resume",
        exact: true,
    });

    if (await resume.isVisible()) {
        await resume.click();
    }

    await expect(
        page.getByRole("status", { name: "Match status" }),
    ).toContainText("Playing");
}

test("navigates between the menu and application screens", async ({ page }) => {
    await openMenu(page);

    await expect(page.getByLabel("Gameplay controls")).toContainText(
        "Space / F",
    );

    await page.getByRole("button", { name: "Ranking" }).click();

    await expect(page.getByRole("heading", { name: "Ranking" })).toBeVisible();

    await page.getByRole("button", { name: "Main Menu" }).click();

    await page
        .getByRole("button", {
            name: "Match History",
        })
        .click();

    await expect(
        page.getByRole("heading", { name: "Match History" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Main Menu" }).click();

    await expect(
        page.getByRole("heading", { name: "Main Menu" }),
    ).toBeVisible();
});

test("saves options across reloads and applies them to the next match", async ({
    page,
}) => {
    await openMenu(page);

    await page.getByRole("button", { name: "Options" }).click();

    await page.getByLabel("Match duration (seconds)").fill("120");

    await page.getByLabel("Enemy spawn interval (seconds)").fill("3");

    await page
        .getByRole("button", {
            name: "Save Options",
        })
        .click();

    await expect(
        page.getByRole("heading", { name: "Main Menu" }),
    ).toBeVisible();

    await page.reload({ waitUntil: "domcontentloaded" });

    await page.getByRole("button", { name: "Options" }).click();

    await expect(page.getByLabel("Match duration (seconds)")).toHaveValue(
        "120",
    );

    await expect(page.getByLabel("Enemy spawn interval (seconds)")).toHaveValue(
        "3",
    );

    await page.getByRole("button", { name: "Cancel" }).click();

    await startGame(page);

    const activeConfig = await page.evaluate((key) => {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw).config : null;
    }, MATCH_STORAGE_KEYS.active);

    expect(activeConfig).toMatchObject({
        matchDurationSeconds: 120,
        enemySpawnIntervalSeconds: 3,
    });

    const remainingTime = Number(
        await page
            .getByRole("status", {
                name: "Remaining time",
            })
            .textContent(),
    );

    expect(remainingTime).toBeGreaterThan(100);
});

test("active match retains its snapshot after saved options change", async ({
    page,
}) => {
    await openMenu(page);

    await page.getByRole("button", { name: "Options" }).click();

    await page.getByLabel("Match duration (seconds)").fill("180");

    await page
        .getByRole("button", {
            name: "Save Options",
        })
        .click();

    await startGame(page);

    await page.evaluate((key) => {
        localStorage.setItem(
            key,
            JSON.stringify({
                matchDurationSeconds: 60,
                enemySpawnIntervalSeconds: 15,
            }),
        );
    }, MATCH_STORAGE_KEYS.options);

    const activeConfig = await page.evaluate((key) => {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw).config : null;
    }, MATCH_STORAGE_KEYS.active);

    expect(activeConfig.matchDurationSeconds).toBe(180);
    expect(activeConfig.enemySpawnIntervalSeconds).toBe(5);

    const remainingTime = Number(
        await page
            .getByRole("status", {
                name: "Remaining time",
            })
            .textContent(),
    );

    expect(remainingTime).toBeGreaterThan(160);
});

test("refresh marks an active match as abandoned", async ({ page }) => {
    await openMenu(page);
    await startGame(page);

    const activeId = await page.evaluate((key) => {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw).id : null;
    }, MATCH_STORAGE_KEYS.active);

    expect(activeId).not.toBeNull();

    await page.reload({ waitUntil: "domcontentloaded" });

    await expect(
        page.getByRole("heading", { name: "Main Menu" }),
    ).toBeVisible();

    const persisted = await page.evaluate(
        (keys) => ({
            active: localStorage.getItem(keys.active),
            abandoned: localStorage.getItem(keys.abandoned),
            completed: localStorage.getItem(keys.completed),
        }),
        MATCH_STORAGE_KEYS,
    );

    expect(persisted.active).toBeNull();
    expect(persisted.completed).toBeNull();
    expect(JSON.parse(persisted.abandoned ?? "null")).toMatchObject({
        id: activeId,
        status: "abandoned",
    });
});

test("Exit to Menu abandons the match and permits a clean restart", async ({
    page,
}) => {
    await openMenu(page);
    await startGame(page);

    const firstId = await page.evaluate((key) => {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw).id : null;
    }, MATCH_STORAGE_KEYS.active);

    await page
        .getByRole("button", {
            name: "Exit to Menu",
        })
        .click();

    await expect(
        page.getByRole("heading", { name: "Main Menu" }),
    ).toBeVisible();

    const abandonedId = await page.evaluate((key) => {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw).id : null;
    }, MATCH_STORAGE_KEYS.abandoned);

    expect(abandonedId).toBe(firstId);

    await startGame(page);

    const secondId = await page.evaluate((key) => {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw).id : null;
    }, MATCH_STORAGE_KEYS.active);

    expect(secondId).not.toBe(firstId);

    await expect(page.getByRole("status", { name: "Score" })).toHaveText("0");
});

test("last completed result survives reload and opens its screen", async ({
    page,
}) => {
    await openMenu(page);

    // Seed the completed result once.
    await page.evaluate(
        ({ key, result }) => {
            localStorage.setItem(key, JSON.stringify(result));
        },
        {
            key: MATCH_STORAGE_KEYS.completed,
            result: {
                id: "finished-fixture",
                status: "completed",
                reason: "time",
                score: 12,
                elapsedSeconds: 90,
                remainingSeconds: 0,
                durationSeconds: 90,
                enemySpawnIntervalSeconds: 5,
                startedAt: "2026-10-11T10:00:00.000Z",
                finishedAt: "2026-10-11T10:01:30.000Z",
            },
        },
    );

    // Reload to force the application to read from localStorage.
    await page.reload({ waitUntil: "domcontentloaded" });

    await expect(
        page.getByRole("heading", {
            name: "Last Completed Match",
        }),
    ).toBeVisible();

    await page
        .getByRole("button", {
            name: "View Last Result",
        })
        .click();

    await expect(
        page.getByRole("heading", { name: "Match Result" }),
    ).toBeVisible();

    await expect(page.getByRole("status", { name: "Final score" })).toHaveText(
        "12",
    );

    await page
        .getByRole("button", {
            name: "Main Menu",
        })
        .click();

    // No fixture is reinjected on this second reload.
    await page.reload({ waitUntil: "domcontentloaded" });

    await expect(
        page.getByRole("button", {
            name: "View Last Result",
        }),
    ).toBeVisible();
});
