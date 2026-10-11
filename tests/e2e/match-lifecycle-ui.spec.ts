import { expect, test, type Page } from "@playwright/test";

async function ensureMatchPlaying(page: Page): Promise<void> {
    await page.bringToFront();

    await expect(
        page.getByTestId("game-canvas-container").locator("canvas"),
    ).toBeVisible({ timeout: 15000 });

    const resumeButton = page.getByRole("button", {
        name: "Resume",
        exact: true,
    });

    if (await resumeButton.isVisible()) {
        await resumeButton.click();
    }

    await expect(
        page.getByRole("status", { name: "Match status" }),
    ).toContainText("Playing");

    await expect(
        page.getByRole("button", { name: "Pause", exact: true }),
    ).toBeVisible();
}

test("manual pause requires explicit resume", async ({ page }) => {
    await page.goto("/", {
        waitUntil: "domcontentloaded",
    });

    await ensureMatchPlaying(page);

    await page.getByRole("button", { name: "Pause" }).click();

    await expect(
        page.getByRole("status", { name: "Match status" }),
    ).toContainText("Paused");

    await page.getByRole("button", { name: "Resume" }).click();

    await expect(
        page.getByRole("status", { name: "Match status" }),
    ).toContainText("Playing");
});

test("window blur pauses without automatically resuming", async ({ page }) => {
    await page.goto("/", {
        waitUntil: "domcontentloaded",
    });

    await ensureMatchPlaying(page);

    await page.evaluate(() => {
        window.dispatchEvent(new Event("blur"));
        window.dispatchEvent(new Event("focus"));
    });

    const matchStatus = page.getByRole("status", {
        name: "Match status",
    });

    await expect(matchStatus).toContainText("Paused");

    await page.getByRole("button", { name: "Resume" }).click();

    await expect(matchStatus).toContainText("Playing");
});

test("hidden document pauses the match", async ({ page }) => {
    await page.goto("/", {
        waitUntil: "domcontentloaded",
    });

    await ensureMatchPlaying(page);

    const matchStatus = page.getByRole("status", {
        name: "Match status",
    });

    const resumeButton = page.getByRole("button", {
        name: "Resume",
        exact: true,
    });

    await page.evaluate(() => {
        Object.defineProperty(document, "hidden", {
            configurable: true,
            value: true,
        });

        try {
            document.dispatchEvent(new Event("visibilitychange"));
        } finally {
            Reflect.deleteProperty(document, "hidden");
        }
    });

    await expect(matchStatus).toContainText("Paused");
    await expect(resumeButton).toBeVisible();

    // Returning to a visible state must not resume automatically.
    await expect(matchStatus).toContainText("Paused");

    await resumeButton.click();

    await expect(matchStatus).toContainText("Playing");
});
