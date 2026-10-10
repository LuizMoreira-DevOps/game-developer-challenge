import { expect, test } from "@playwright/test";

test("renders the Pirate Battle application", async ({ page }) => {
    await page.goto("/");

    await expect(
        page.getByRole("heading", {
            name: "Pirate Battle",
            level: 1,
        }),
    ).toBeVisible();
});
