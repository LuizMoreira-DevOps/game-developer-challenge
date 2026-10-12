import { expect, test, type Page } from "@playwright/test";

async function openGame(page: Page): Promise<void> {
    await page.goto("/", {
        waitUntil: "domcontentloaded",
    });

    await expect(
        page.getByRole("heading", { name: "Main Menu" }),
    ).toBeVisible();

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
        page.getByRole("status", {
            name: "Match status",
        }),
    ).toContainText("Playing");
}

async function checkCanvasSize(page: Page): Promise<void> {
    const canvas = page.getByTestId("game-canvas-container").locator("canvas");

    await expect
        .poll(async () => {
            return canvas.evaluate((element) => {
                const rect = element.getBoundingClientRect();
                const parent = element.parentElement;

                if (!parent) {
                    return Infinity;
                }

                return Math.abs(
                    rect.width - parent.getBoundingClientRect().width,
                );
            });
        })
        .toBeLessThan(2);

    const dimensions = await canvas.evaluate((element) => {
        const elementCanvas = element as HTMLCanvasElement;

        return {
            cssWidth: elementCanvas.clientWidth,
            cssHeight: elementCanvas.clientHeight,
            pixelWidth: elementCanvas.width,
            pixelHeight: elementCanvas.height,
            dpr: window.devicePixelRatio,
        };
    });

    expect(dimensions.cssWidth).toBeGreaterThan(0);
    expect(dimensions.cssHeight).toBeGreaterThan(0);

    expect(
        Math.abs(dimensions.pixelWidth - dimensions.cssWidth * dimensions.dpr),
    ).toBeLessThanOrEqual(2);

    expect(
        Math.abs(
            dimensions.pixelHeight - dimensions.cssHeight * dimensions.dpr,
        ),
    ).toBeLessThanOrEqual(2);
}

test("canvas preserves responsive sizing and DPR", async ({ page }) => {
    await openGame(page);

    await checkCanvasSize(page);

    await page.setViewportSize({
        width: 800,
        height: 600,
    });

    await checkCanvasSize(page);

    await page.setViewportSize({
        width: 390,
        height: 740,
    });

    await checkCanvasSize(page);

    await expect(
        page.getByTestId("game-canvas-container").locator("canvas"),
    ).toHaveCount(1);
});

test("menu and options expose accessible controls", async ({ page }) => {
    await page.goto("/", {
        waitUntil: "domcontentloaded",
    });

    const mainMenu = page.getByRole("navigation", {
        name: "Main navigation",
    });

    await expect(mainMenu).toBeVisible();

    const play = page.getByRole("button", {
        name: "Play",
        exact: true,
    });

    await play.focus();
    await expect(play).toBeFocused();

    await page
        .getByRole("button", {
            name: "Options",
        })
        .click();

    const duration = page.getByLabel("Match duration (seconds)");

    const spawnInterval = page.getByLabel("Enemy spawn interval (seconds)");

    await expect(duration).toBeVisible();
    await expect(spawnInterval).toBeVisible();

    await duration.fill("10");

    await page
        .getByRole("button", {
            name: "Save Options",
        })
        .click();

    await expect(page.getByRole("alert")).toContainText("Choose a duration");

    await duration.fill("90");

    await spawnInterval.fill("5");

    await page
        .getByRole("button", {
            name: "Save Options",
        })
        .click();

    await expect(
        page.getByRole("heading", {
            name: "Main Menu",
        }),
    ).toBeVisible();
});

test("mobile touch controls respond after viewport resize", async ({
    page,
}, testInfo) => {
    test.skip(
        testInfo.project.name !== "chromium-mobile",
        "Touch behavior is covered by the mobile project.",
    );

    await openGame(page);

    await page.setViewportSize({
        width: 390,
        height: 740,
    });

    await checkCanvasSize(page);

    const forward = page.getByRole("button", {
        name: "Move forward",
    });

    await expect(forward).toBeEnabled();

    await forward.scrollIntoViewIfNeeded();

    const bounds = await forward.boundingBox();

    expect(bounds).not.toBeNull();

    if (!bounds) {
        throw new Error("Touch button has no layout box.");
    }

    const point = {
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2,
        id: 1,
    };

    const session = await page.context().newCDPSession(page);

    try {
        await session.send("Input.dispatchTouchEvent", {
            type: "touchStart",
            touchPoints: [point],
        });

        await expect(forward).toHaveAttribute("data-pressed", "true");
    } finally {
        await session.send("Input.dispatchTouchEvent", {
            type: "touchEnd",
            touchPoints: [],
        });

        await session.detach();
    }

    await expect(forward).toHaveAttribute("data-pressed", "false");
});
