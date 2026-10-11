import { expect, test } from "@playwright/test";

import type { Page } from "@playwright/test";

async function ensureMatchPlaying(page: Page): Promise<void> {
    await expect(
        page.getByTestId("game-canvas-container").locator("canvas"),
    ).toBeVisible({ timeout: 15000 });

    await page.bringToFront();

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
    await page.goto("/");
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
    await page.goto("/");
    await ensureMatchPlaying(page);

    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();

    await page.evaluate(() => {
        window.dispatchEvent(new Event("blur"));
        window.dispatchEvent(new Event("focus"));
    });

    await expect(
        page.getByRole("status", { name: "Match status" }),
    ).toContainText("Paused");

    await page.getByRole("button", { name: "Resume" }).click();

    await expect(
        page.getByRole("status", { name: "Match status" }),
    ).toContainText("Playing");
});

test("hidden document pauses the match", async ({ page }) => {
    await page.goto("/");
    await ensureMatchPlaying(page);

    // Aguarda a inicialização real do jogo.
    await expect(
        page.getByTestId("game-canvas-container").locator("canvas"),
    ).toBeVisible({ timeout: 15000 });

    await page.bringToFront();

    const pauseButton = page.getByRole("button", {
        name: "Pause",
        exact: true,
    });

    const resumeButton = page.getByRole("button", {
        name: "Resume",
        exact: true,
    });

    const matchStatus = page.getByRole("status", {
        name: "Match status",
    });

    // A partida pode ter sido pausada por perda de foco
    // enquanto o navegador inicializava.
    if (await resumeButton.isVisible()) {
        await resumeButton.click();
    }

    // Garante que o teste começa com a partida ativa.
    await expect(pauseButton).toBeVisible();
    await expect(matchStatus).toContainText("Playing");

    // Simula a aba tornando-se invisível.
    await page.evaluate(() => {
        Object.defineProperty(document, "hidden", {
            configurable: true,
            value: true,
        });

        document.dispatchEvent(new Event("visibilitychange"));

        Reflect.deleteProperty(document, "hidden");
    });

    await expect(matchStatus).toContainText("Paused");
    await expect(resumeButton).toBeVisible();

    // A retomada deve continuar exigindo ação explícita.
    await expect(matchStatus).toContainText("Paused");

    await resumeButton.click();

    await expect(matchStatus).toContainText("Playing");
});
