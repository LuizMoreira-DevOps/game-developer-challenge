import { expect, test, type Page } from "@playwright/test";

async function startGame(page: Page): Promise<void> {
    await page.goto("/", {
        waitUntil: "domcontentloaded",
    });

    await expect(
        page.getByRole("heading", { name: "Main Menu" }),
    ).toBeVisible();

    // Avoid enemy spawning during the short visual test.
    await page.getByRole("button", { name: "Options" }).click();

    await page.getByLabel("Enemy spawn interval (seconds)").fill("30");

    await page.getByRole("button", { name: "Save Options" }).click();

    await page
        .getByRole("button", {
            name: "Play",
            exact: true,
        })
        .click();

    await page.bringToFront();

    const canvas = page.getByTestId("game-canvas-container").locator("canvas");

    await expect(canvas).toBeVisible({
        timeout: 15000,
    });

    const resume = page.getByRole("button", {
        name: "Resume",
        exact: true,
    });

    if (await resume.isVisible()) {
        await resume.click();
    }

    await expect(
        page.getByRole("status", {
            name: "Match status",
        }),
    ).toContainText("Playing");
}

test("movement and rotation update the real canvas", async ({ page }) => {
    await startGame(page);

    const canvas = page.getByTestId("game-canvas-container").locator("canvas");

    const before = await canvas.screenshot();

    const timer = page.getByRole("status", {
        name: "Remaining time",
    });

    const initialTime = Number(await timer.textContent());

    await page.keyboard.down("ArrowUp");
    await page.keyboard.down("ArrowLeft");

    try {
        await expect
            .poll(async () => Number(await timer.textContent()), {
                timeout: 6000,
            })
            .toBeLessThan(initialTime);

        const after = await canvas.screenshot();

        // Real input must produce a visible canvas change.
        expect(after.equals(before)).toBe(false);
    } finally {
        await page.keyboard.up("ArrowLeft");
        await page.keyboard.up("ArrowUp");
    }

    await expect(
        page.getByRole("status", {
            name: "Match status",
        }),
    ).toContainText("Playing");

    await expect(canvas).toHaveCount(1);
});

test("front cannon input keeps combat operational", async ({ page }) => {
    await startGame(page);

    const gameContainer = page.getByTestId("game-canvas-container");

    const canvas = gameContainer.locator("canvas");

    await expect(canvas).toBeVisible();

    // Confirm the simulation starts without player projectiles.
    await expect(gameContainer).toHaveAttribute(
        "data-player-projectile-count",
        "0",
    );

    // Hold the firing key while the simulation processes frames.
    await page.keyboard.down("f");

    try {
        // Verify actual projectile creation, not a screenshot difference.
        await expect
            .poll(
                async () =>
                    Number(
                        await gameContainer.getAttribute(
                            "data-player-projectile-count",
                        ),
                    ),
                {
                    message: "Front cannon must create a player projectile",
                    timeout: 5000,
                    intervals: [20, 50, 100],
                },
            )
            .toBeGreaterThan(0);
    } finally {
        await page.keyboard.up("f");
    }

    await expect(
        page.getByRole("status", {
            name: "Match status",
        }),
    ).toContainText("Playing");

    await expect(canvas).toHaveCount(1);
});
