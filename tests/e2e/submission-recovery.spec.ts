import { expect, test, type Page } from "@playwright/test";

import {
    RULESET_VERSION,
    type MatchRecord,
    type PlayerIdentity,
} from "../../src/game/api/contracts";
import { PLAYER_STORAGE_KEY } from "../../src/game/api/playerIdentity";
import { PENDING_MATCHES_STORAGE_KEY } from "../../src/game/api/pendingMatches";
import { SUBMISSION_RECEIPTS_STORAGE_KEY } from "../../src/game/api/submissionReceipts";
import { MATCH_STORAGE_KEYS } from "../../src/game/state/matchPersistence";
import { MOCK_MATCH_STORAGE_KEY } from "../../src/mocks/matchRepository";
import { MOCK_SCENARIO_STORAGE_KEY } from "../../src/mocks/networkScenarios";

async function openMenu(page: Page): Promise<void> {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(
        page.getByRole("heading", { name: "Main Menu" }),
    ).toBeVisible();
}

async function readStoredArray(page: Page, key: string): Promise<unknown[]> {
    return page.evaluate((storageKey) => {
        const raw = localStorage.getItem(storageKey);
        const parsed: unknown = JSON.parse(raw ?? "[]");

        return Array.isArray(parsed) ? parsed : [];
    }, key);
}

function createMatch(
    matchId: string,
    player: PlayerIdentity,
    score: number,
    elapsedSeconds: number,
    startedAt: string,
): MatchRecord {
    return {
        matchId,
        playerId: player.id,
        playerName: player.name,
        score,
        elapsedSeconds,
        endReason: "destroyed",
        matchDurationSeconds: 90,
        enemySpawnIntervalSeconds: 5,
        rulesetVersion: RULESET_VERSION,
        startedAt,
        finishedAt: new Date(
            Date.parse(startedAt) + elapsedSeconds * 1000,
        ).toISOString(),
    };
}

test("recovers two pending matches without duplicates", async ({ page }) => {
    await openMenu(page);

    const player = await page.evaluate((key) => {
        const raw = localStorage.getItem(key);

        if (!raw) {
            throw new Error("Player identity was not initialized.");
        }

        return JSON.parse(raw) as PlayerIdentity;
    }, PLAYER_STORAGE_KEY);

    const matches = [
        createMatch(
            "pending-recovery-001",
            player,
            12,
            45,
            "2026-10-11T10:00:00.000Z",
        ),
        createMatch(
            "pending-recovery-002",
            player,
            19,
            60,
            "2026-10-11T11:00:00.000Z",
        ),
    ];

    await page.evaluate(
        ({ scenarioKey, pendingKey, records }) => {
            localStorage.setItem(scenarioKey, "offline");
            localStorage.setItem(pendingKey, JSON.stringify(records));
        },
        {
            scenarioKey: MOCK_SCENARIO_STORAGE_KEY,
            pendingKey: PENDING_MATCHES_STORAGE_KEY,
            records: matches,
        },
    );

    await page.reload({ waitUntil: "domcontentloaded" });

    await expect(
        page.getByRole("heading", { name: "Main Menu" }),
    ).toBeVisible();

    expect(
        await readStoredArray(page, PENDING_MATCHES_STORAGE_KEY),
    ).toHaveLength(2);

    // Restore the simulated API and trigger synchronization.
    await page.evaluate((scenarioKey) => {
        localStorage.removeItem(scenarioKey);
        window.dispatchEvent(new Event("online"));
    }, MOCK_SCENARIO_STORAGE_KEY);

    await expect
        .poll(
            async () =>
                (await readStoredArray(page, PENDING_MATCHES_STORAGE_KEY))
                    .length,
            { timeout: 15000 },
        )
        .toBe(0);

    const receipts = await readStoredArray(
        page,
        SUBMISSION_RECEIPTS_STORAGE_KEY,
    );

    expect([...receipts].sort()).toEqual([
        "pending-recovery-001",
        "pending-recovery-002",
    ]);

    // Verify the shared API contains exactly two records.
    const history = await page.evaluate(async (playerId) => {
        const url = new URL("/api/matches", location.origin);

        url.searchParams.set("playerId", playerId);
        url.searchParams.set("page", "1");
        url.searchParams.set("pageSize", "10");

        const response = await fetch(url);

        return (await response.json()) as {
            totalItems: number;
            items: Array<{ matchId: string }>;
        };
    }, player.id);

    expect(history.totalItems).toBe(2);

    expect(history.items.map((match) => match.matchId).sort()).toEqual([
        "pending-recovery-001",
        "pending-recovery-002",
    ]);

    await page.reload({ waitUntil: "domcontentloaded" });

    await expect(
        page.getByRole("heading", { name: "Main Menu" }),
    ).toBeVisible();

    expect(
        await readStoredArray(page, PENDING_MATCHES_STORAGE_KEY),
    ).toHaveLength(0);
});

test("timeout after saving recovers without a duplicate", async ({ page }) => {
    test.setTimeout(45000);

    await openMenu(page);

    const matchId = "timeout-after-save-001";

    await page.evaluate(
        ({ scenarioKey, completedKey, result }) => {
            localStorage.setItem(scenarioKey, "post-timeout-after-save");

            localStorage.setItem(completedKey, JSON.stringify(result));
        },
        {
            scenarioKey: MOCK_SCENARIO_STORAGE_KEY,
            completedKey: MATCH_STORAGE_KEYS.completed,
            result: {
                id: matchId,
                status: "completed",
                reason: "destroyed",
                score: 23,
                elapsedSeconds: 45,
                remainingSeconds: 45,
                durationSeconds: 90,
                enemySpawnIntervalSeconds: 5,
                startedAt: "2026-10-11T12:00:00.000Z",
                finishedAt: "2026-10-11T12:00:45.000Z",
            },
        },
    );

    // The app reconstructs the pending record and sends it.
    await page.reload({ waitUntil: "domcontentloaded" });

    await page
        .getByRole("button", {
            name: "View Last Result",
        })
        .click();

    const status = page.getByRole("status", {
        name: "Submission status",
    });

    // Axios times out, even though MSW saved the record.
    await expect(status).toContainText("Pending", {
        timeout: 25000,
    });

    const savedBeforeRetry = await readStoredArray(
        page,
        MOCK_MATCH_STORAGE_KEY,
    );

    expect(
        savedBeforeRetry.filter(
            (value) =>
                typeof value === "object" &&
                value !== null &&
                "matchId" in value &&
                value.matchId === matchId,
        ),
    ).toHaveLength(1);

    // Retry the same payload after restoring normal responses.
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

    expect(
        await readStoredArray(page, PENDING_MATCHES_STORAGE_KEY),
    ).toHaveLength(0);

    const savedAfterRetry = await readStoredArray(page, MOCK_MATCH_STORAGE_KEY);

    expect(
        savedAfterRetry.filter(
            (value) =>
                typeof value === "object" &&
                value !== null &&
                "matchId" in value &&
                value.matchId === matchId,
        ),
    ).toHaveLength(1);

    await page.reload({ waitUntil: "domcontentloaded" });

    await page
        .getByRole("button", {
            name: "View Last Result",
        })
        .click();

    await expect(
        page.getByRole("status", {
            name: "Submission status",
        }),
    ).toContainText("Synced");
});
