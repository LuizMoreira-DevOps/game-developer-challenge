import { expect, test, type Page } from "@playwright/test";

async function ensureMatchPlaying(page: Page): Promise<void> {
    await page.goto("/", {
        waitUntil: "domcontentloaded",
    });

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
}

test("HUD exposes health, score, timer and keyboard controls", async ({
    page,
}) => {
    await ensureMatchPlaying(page);

    await expect(
        page.getByRole("status", { name: "Player health" }),
    ).toBeVisible();

    await expect(page.getByRole("status", { name: "Score" })).toBeVisible();

    await expect(
        page.getByRole("status", { name: "Remaining time" }),
    ).toBeVisible();

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
        await expect(
            page.getByRole("button", {
                name: label,
                exact: true,
            }),
        ).toBeVisible();
    }

    const forwardButton = page.getByRole("button", {
        name: "Move forward",
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

    await expect(forwardButton).toBeDisabled();

    await page
        .getByRole("button", {
            name: "Resume",
            exact: true,
        })
        .click();

    await expect(forwardButton).toBeEnabled();
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
    });

    const fire = page.getByRole("button", {
        name: "Fire front cannon",
    });

    const forwardBox = await forward.boundingBox();
    const fireBox = await fire.boundingBox();

    expect(forwardBox).not.toBeNull();
    expect(fireBox).not.toBeNull();

    if (!forwardBox || !fireBox) {
        throw new Error("Touch controls have no layout boxes.");
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
        await session.send("Input.dispatchTouchEvent", {
            type: "touchStart",
            touchPoints: [forwardPoint],
        });

        await expect(forward).toHaveAttribute("data-pressed", "true");

        await session.send("Input.dispatchTouchEvent", {
            type: "touchStart",
            touchPoints: [firePoint],
        });

        await expect(forward).toHaveAttribute("data-pressed", "true");

        await expect(fire).toHaveAttribute("data-pressed", "true");

        // Release forward while keeping the firing finger pressed.
        await session.send("Input.dispatchTouchEvent", {
            type: "touchEnd",
            touchPoints: [forwardPoint],
        });

        await expect(forward).toHaveAttribute("data-pressed", "false");
        await expect(fire).toHaveAttribute("data-pressed", "true");
    } finally {
        await session.send("Input.dispatchTouchEvent", {
            type: "touchEnd",
            touchPoints: [],
        });

        await session.detach();
    }

    await expect(fire).toHaveAttribute("data-pressed", "false");
});
