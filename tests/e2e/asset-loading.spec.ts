import { expect, test, type Page } from "@playwright/test";

// These tests intercept network requests directly.
// MSW is not required for asset-loading scenarios.
test.use({
    serviceWorkers: "block",
});

// Match the PNG file without matching Vite's "?import" module.
const ISLAND_TEXTURE = /\/tile_6(?:-[^/?]+)?\.png$/;

async function openMenu(page: Page): Promise<void> {
    await page.goto("/", {
        waitUntil: "domcontentloaded",
    });

    await expect(
        page.getByRole("heading", {
            name: "Main Menu",
        }),
    ).toBeVisible({
        timeout: 15000,
    });
}

async function startMatch(page: Page): Promise<void> {
    await page
        .getByRole("button", {
            name: "Play",
            exact: true,
        })
        .click();
}

test("recovers from a failed texture download", async ({ page }) => {
    await openMenu(page);

    let failedRequests = 0;

    // Fail only the first matching texture request.
    await page.route(ISLAND_TEXTURE, async (route) => {
        if (failedRequests === 0) {
            failedRequests++;

            await route.fulfill({
                status: 404,
                contentType: "text/plain",
                body: "Texture unavailable",
            });

            return;
        }

        await route.continue();
    });

    // Start the match only once.
    await startMatch(page);

    // Verify that Playwright intercepted the texture.
    await expect
        .poll(() => failedRequests, {
            message: "The PNG failure must be intercepted",
            timeout: 10000,
        })
        .toBe(1);

    // Verify the application displays a recoverable error.
    await expect(page.getByRole("alert")).toContainText(
        "Game assets could not be loaded.",
        {
            timeout: 15000,
        },
    );

    // Combat must not start after an asset-loading failure.
    await expect(
        page.getByRole("status", {
            name: "Match status",
        }),
    ).not.toContainText("Playing");

    // Retry loading without returning to the main menu.
    await page
        .getByRole("button", {
            name: "Retry Loading",
        })
        .click();

    // The retry must initialize exactly one canvas.
    const canvas = page.getByTestId("game-canvas-container").locator("canvas");

    await expect(canvas).toHaveCount(1, {
        timeout: 15000,
    });

    // Gameplay must recover successfully.
    await expect(
        page.getByRole("status", {
            name: "Match status",
        }),
    ).toContainText("Playing", {
        timeout: 15000,
    });

    // The error recovery interface must disappear.
    await expect(
        page.getByRole("button", {
            name: "Retry Loading",
        }),
    ).toHaveCount(0);

    // Exit the recovered match.
    await page
        .getByRole("button", {
            name: "Exit to Menu",
        })
        .click();

    await expect(
        page.getByRole("heading", {
            name: "Main Menu",
        }),
    ).toBeVisible();

    // PixiJS must remove the canvas after unmounting.
    await expect(page.locator("canvas")).toHaveCount(0);
});

test("returns safely to the menu after an asset failure", async ({ page }) => {
    await openMenu(page);

    let failedRequests = 0;

    // Keep the required texture unavailable.
    await page.route(ISLAND_TEXTURE, async (route) => {
        failedRequests++;

        await route.fulfill({
            status: 404,
            contentType: "text/plain",
            body: "Texture unavailable",
        });
    });

    await startMatch(page);

    // Confirm the texture request was intercepted.
    await expect
        .poll(() => failedRequests, {
            message: "The PNG failure must be intercepted",
            timeout: 10000,
        })
        .toBeGreaterThan(0);

    // The application must present an error.
    await expect(page.getByRole("alert")).toContainText(
        "Game assets could not be loaded.",
        {
            timeout: 15000,
        },
    );

    // Return without retrying.
    await page
        .getByRole("button", {
            name: "Return to Menu",
        })
        .click();

    await expect(
        page.getByRole("heading", {
            name: "Main Menu",
        }),
    ).toBeVisible();

    // No PixiJS canvas must remain mounted.
    await expect(page.locator("canvas")).toHaveCount(0);
});
