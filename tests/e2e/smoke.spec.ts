import { expect, test } from "@playwright/test";

test("renders the Pirate Battle application", async ({ page }) => {
    await page.goto("/");

    await expect(
        page.getByRole("heading", {
            name: "Pirate Battle",
            level: 1,
        }),
    ).toBeVisible();

    const gameContainer = page.getByTestId("game-canvas-container");

    await expect(gameContainer).toBeVisible();
    await expect(gameContainer.locator("canvas")).toBeVisible({
        timeout: 15000,
    });

    const canvas = gameContainer.locator("canvas");

    await expect(canvas).toHaveCount(1);

    const dimensions = await canvas.evaluate((element) => {
        const canvasElement = element as HTMLCanvasElement;

        return {
            clientWidth: canvasElement.clientWidth,
            clientHeight: canvasElement.clientHeight,
            pixelWidth: canvasElement.width,
            pixelHeight: canvasElement.height,
            devicePixelRatio: window.devicePixelRatio,
        };
    });

    expect(dimensions.pixelWidth).toBe(
        Math.round(dimensions.clientWidth * dimensions.devicePixelRatio),
    );

    expect(dimensions.pixelHeight).toBe(
        Math.round(dimensions.clientHeight * dimensions.devicePixelRatio),
    );

    await page.setViewportSize({
        width: 800,
        height: 600,
    });

    await expect
        .poll(async () => canvas.evaluate((element) => element.clientWidth))
        .toBeGreaterThan(0);

    const resized = await canvas.evaluate((element) => ({
        canvasWidth: element.clientWidth,
        containerWidth: element.parentElement?.clientWidth ?? 0,
    }));

    expect(resized.canvasWidth).toBe(resized.containerWidth);
});
