import { expect, test } from "@playwright/test";

import type { BrowserPerformanceDiagnostics } from "../../src/game/diagnostics/BrowserPerformanceDiagnostics";

const REQUIRED_SECONDS = 180;

test("profiles 180 seconds of real gameplay", async ({ page }) => {
    test.setTimeout(390_000);

    await page.goto("/?profile=1", {
        waitUntil: "domcontentloaded",
    });

    await expect(
        page.getByRole("heading", { name: "Main Menu" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Options" }).click();

    await page.getByLabel("Match duration (seconds)").fill("180");

    await page.getByLabel("Enemy spawn interval (seconds)").fill("1");

    await page.getByRole("button", { name: "Save Options" }).click();

    await page.bringToFront();

    const cdp = await page.context().newCDPSession(page);

    const samples: Array<{
        activeSeconds: number;
        averageFps: number;
        p95FrameTimeMs: number;
        maxEntityCount: number;
        maxProjectileCount: number;
        heapUsedBytes: number;
    }> = [];

    const startedAt = Date.now();

    try {
        while (true) {
            expect(
                Date.now() - startedAt,
                "Profiling exceeded the safety limit",
            ).toBeLessThan(360_000);

            const play = page.getByRole("button", {
                name: "Play",
                exact: true,
            });

            const playAgain = page.getByRole("button", {
                name: "Play Again",
            });

            const resume = page.getByRole("button", {
                name: "Resume",
                exact: true,
            });

            if (await play.isVisible()) {
                await play.click();
            } else if (await playAgain.isVisible()) {
                await playAgain.click();
            } else if (await resume.isVisible()) {
                await resume.click();
            }

            await page.waitForTimeout(2000);

            const report = await page.evaluate(() => {
                const gameWindow = window as Window & {
                    __pirateBattleProfile?: BrowserPerformanceDiagnostics;
                };

                return gameWindow.__pirateBattleProfile?.getReport() ?? null;
            });

            expect(
                report,
                "BrowserPerformanceDiagnostics must be enabled",
            ).not.toBeNull();

            if (!report) {
                throw new Error(
                    "Missing performance diagnostics. Check PixiGameCanvas integration.",
                );
            }

            const heap = await cdp.send("Runtime.getHeapUsage");

            samples.push({
                activeSeconds: report.activeSeconds,
                averageFps: report.averageFps,
                p95FrameTimeMs: report.p95FrameTimeMs,
                maxEntityCount: report.maxEntityCount,
                maxProjectileCount: report.maxProjectileCount,
                heapUsedBytes: heap.usedSize,
            });

            if (report.activeSeconds >= REQUIRED_SECONDS) {
                expect(report.frames).toBeGreaterThan(0);
                expect(report.averageFps).toBeGreaterThan(0);
                expect(report.p95FrameTimeMs).toBeGreaterThan(0);
                expect(report.maxEntityCount).toBeGreaterThan(0);

                await test.info().attach("180-second-performance.json", {
                    body: JSON.stringify(
                        {
                            environment: "Chromium production preview",
                            report,
                            samples,
                        },
                        null,
                        2,
                    ),
                    contentType: "application/json",
                });

                console.table([report]);
                break;
            }
        }
    } finally {
        await cdp.detach();
    }
});
