import { expect, test, type Page } from "@playwright/test";

async function ensureMatchPlaying(page: Page): Promise<void> {
    await page.goto("/", {
        waitUntil: "domcontentloaded",
    });

    await page.bringToFront();

    await page
        .getByRole("button", {
            name: "Play",
            exact: true,
        })
        .click();

    await expect(
        page.getByTestId("game-canvas-container").locator("canvas"),
    ).toBeVisible({ timeout: 15_000 });

    const status = page.getByRole("status", {
        name: "Match status",
    });

    await expect(status).toHaveText(/^(Playing|Paused)$/, {
        timeout: 15_000,
    });

    const resumeButton = page.getByRole("button", {
        name: "Resume",
        exact: true,
    });

    if (await resumeButton.isVisible()) {
        await resumeButton.click();
    }

    await expect(status).toHaveText("Playing");
}

test("HUD exposes health, score, timer and keyboard controls", async ({
    page,
}) => {
    await ensureMatchPlaying(page);

    await expect(
        page.getByRole("status", { name: "Player health" }),
    ).toBeVisible();

    await expect(
        page.getByRole("status", { name: "Score", exact: true }),
    ).toBeVisible();

    await expect(
        page.getByRole("status", { name: "Remaining time" }),
    ).toBeAttached();

    await expect(
        page.getByRole("status", { name: "Remaining time" }),
    ).toHaveText(/^\d+$/);

    const keyboardHint = page.getByLabel("Keyboard controls");

    await expect(keyboardHint).toContainText("Forward");
    await expect(keyboardHint).toContainText("Space");
    await expect(keyboardHint).toContainText("Left broadside");
    await expect(keyboardHint).toContainText("Right broadside");
});

test("mobile controls are visible, responsive and respect pause", async ({
    page,
}, testInfo) => {
    test.skip(
        testInfo.project.name !== "chromium-mobile",
        "Touch UI is tested on the mobile project.",
    );

    await ensureMatchPlaying(page);

    const labels = [
        "Move forward",
        "Rotate left",
        "Rotate right",
        "Fire front cannon",
        "Fire left broadside",
        "Fire right broadside",
    ];

    for (const label of labels) {
        const control = page.getByRole("button", {
            name: label,
            exact: true,
        });

        await expect(control).toBeVisible();
        await expect(control).toBeEnabled();
    }

    const forwardButton = page.getByRole("button", {
        name: "Move forward",
        exact: true,
    });

    await expect(forwardButton).toHaveCSS("touch-action", "none");

    const hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth + 1;
    });

    expect(hasHorizontalOverflow).toBe(false);

    await forwardButton.tap();

    await page
        .getByRole("button", {
            name: "Pause",
            exact: true,
        })
        .click();

    await expect(page.getByRole("status", { name: "Match status" })).toHaveText(
        "Paused",
    );

    for (const label of labels) {
        await expect(
            page.getByRole("button", {
                name: label,
                exact: true,
            }),
        ).toBeDisabled();
    }

    await page
        .getByRole("button", {
            name: "Resume",
            exact: true,
        })
        .click();

    await expect(page.getByRole("status", { name: "Match status" })).toHaveText(
        "Playing",
    );

    for (const label of labels) {
        await expect(
            page.getByRole("button", {
                name: label,
                exact: true,
            }),
        ).toBeEnabled();
    }
});

test("mobile supports simultaneous movement and firing touches", async ({
    page,
}, testInfo) => {
    test.skip(
        testInfo.project.name !== "chromium-mobile",
        "Multitouch is tested on the mobile project.",
    );

    await ensureMatchPlaying(page);

    const forward = page.getByRole("button", {
        name: "Move forward",
        exact: true,
    });

    const fire = page.getByRole("button", {
        name: "Fire front cannon",
        exact: true,
    });

    const touchControls = page.getByTestId("touch-controls");

    await touchControls.scrollIntoViewIfNeeded();

    await expect(forward).toBeVisible();
    await expect(fire).toBeVisible();
    await expect(forward).toBeEnabled();
    await expect(fire).toBeEnabled();
    await expect(forward).toBeInViewport();
    await expect(fire).toBeInViewport();

    const forwardBox = await forward.boundingBox();
    const fireBox = await fire.boundingBox();

    if (!forwardBox || !fireBox) {
        throw new Error("Touch controls must have visible bounding boxes.");
    }

    const forwardPoint = {
        x: forwardBox.x + forwardBox.width / 2,
        y: forwardBox.y + forwardBox.height / 2,
        id: 1,
    };

    const firePoint = {
        x: fireBox.x + fireBox.width / 2,
        y: fireBox.y + fireBox.height / 2,
        id: 2,
    };

    const session = await page.context().newCDPSession(page);

    try {
        // Finger 1: start moving forward.
        await session.send("Input.dispatchTouchEvent", {
            type: "touchStart",
            touchPoints: [forwardPoint],
        });

        await expect(forward).toHaveAttribute("data-pressed", "true");
        await expect(fire).toHaveAttribute("data-pressed", "false");

        // Finger 2: start firing while finger 1 remains pressed.
        await session.send("Input.dispatchTouchEvent", {
            type: "touchStart",
            touchPoints: [firePoint],
        });

        await expect(forward).toHaveAttribute("data-pressed", "true");
        await expect(fire).toHaveAttribute("data-pressed", "true");

        // Release finger 1 while keeping finger 2 pressed.
        await session.send("Input.dispatchTouchEvent", {
            type: "touchEnd",
            touchPoints: [forwardPoint],
        });

        await expect(forward).toHaveAttribute("data-pressed", "false");
        await expect(fire).toHaveAttribute("data-pressed", "true");

        // Release finger 2.
        await session.send("Input.dispatchTouchEvent", {
            type: "touchEnd",
            touchPoints: [firePoint],
        });

        await expect(forward).toHaveAttribute("data-pressed", "false");
        await expect(fire).toHaveAttribute("data-pressed", "false");
    } finally {
        await session.detach();
    }
});
