import { expect, test } from "@playwright/test";

test("published game, canvas, ranking and history", async ({
    page,
}, testInfo) => {
    const url = testInfo.project.use.baseURL;

    if (!url) {
        throw new Error("Missing production baseURL.");
    }

    const errors: string[] = [];

    page.on("pageerror", (error) => {
        errors.push(error.message);
    });

    await page.goto(url);

    await expect(
        page.getByRole("heading", { name: "Main Menu" }),
    ).toBeVisible({ timeout: 20000 });

    await page.getByRole("button", {
        name: "Ranking",
    }).click();

    await expect(page.getByText("Captain Ada")).toBeVisible({
        timeout: 15000,
    });

    await page.getByRole("button", {
        name: "Main Menu",
    }).click();

    await page.getByRole("button", {
        name: "Match History",
    }).click();

    await expect(
        page.getByRole("heading", { name: "Match History" }),
    ).toBeVisible();

    await expect(
        page.getByText("No completed matches recorded yet."),
    ).toBeVisible({ timeout: 15000 });

    await page.getByRole("button", {
        name: "Main Menu",
    }).click();

    await page.getByRole("button", {
        name: "Play",
        exact: true,
    }).click();

    await expect(
        page.getByTestId("game-canvas-container")
            .locator("canvas"),
    ).toBeVisible({ timeout: 20000 });

    expect(errors).toEqual([]);
});