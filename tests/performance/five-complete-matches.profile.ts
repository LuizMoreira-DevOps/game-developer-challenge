import { expect, test } from "@playwright/test";

test("five completed matches record memory and release canvases", async ({
    page,
}) => {
    test.setTimeout(540_000);

    await page.goto("/", {
        waitUntil: "domcontentloaded",
    });

    await expect(
        page.getByRole("heading", { name: "Main Menu" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Options" }).click();

    await page.getByLabel("Match duration (seconds)").fill("60");

    await page.getByLabel("Enemy spawn interval (seconds)").fill("30");

    await page
        .getByRole("button", {
            name: "Save Options",
        })
        .click();

    await page.bringToFront();

    const cdp = await page.context().newCDPSession(page);

    const results: Array<{
        cycle: number;
        outcome: string;
        heapUsedBytes: number;
        canvasCount: number;
    }> = [];

    try {
        for (let cycle = 1; cycle <= 5; cycle++) {
            const play = page.getByRole("button", {
                name: cycle === 1 ? "Play" : "Play Again",
                exact: true,
            });

            await play.click();

            const canvas = page
                .getByTestId("game-canvas-container")
                .locator("canvas");

            await expect(canvas).toBeVisible({
                timeout: 20000,
            });

            const resume = page.getByRole("button", {
                name: "Resume",
                exact: true,
            });

            if (await resume.isVisible()) {
                await resume.click();
            }

            const matchResult = page.getByRole("heading", {
                name: "Match Result",
            });

            // A real match lasts at most 60 active seconds.
            await expect(matchResult).toBeVisible({
                timeout: 90000,
            });

            // React must unmount the PixiJS canvas.
            await expect(page.locator("canvas")).toHaveCount(0);

            await cdp.send("HeapProfiler.collectGarbage");

            const heap = await cdp.send("Runtime.getHeapUsage");

            const outcome = await matchResult
                .locator("..")
                .locator("p")
                .first()
                .textContent();

            expect(outcome).toMatch(/Time's up|Ship destroyed/);

            results.push({
                cycle,
                outcome: outcome?.trim() ?? "Unknown",
                heapUsedBytes: heap.usedSize,
                canvasCount: await page.locator("canvas").count(),
            });
        }

        const heapGrowthBytes =
            results[4].heapUsedBytes - results[0].heapUsedBytes;

        await test.info().attach("five-complete-matches-memory.json", {
            body: JSON.stringify(
                {
                    results,
                    heapGrowthBytes,
                    note: "JavaScript heap does not include all GPU texture memory. A positive delta alone does not prove a memory leak.",
                },
                null,
                2,
            ),
            contentType: "application/json",
        });

        console.table(
            results.map((result) => ({
                cycle: result.cycle,
                outcome: result.outcome,
                heapMB: (result.heapUsedBytes / 1024 / 1024).toFixed(2),
                canvasCount: result.canvasCount,
            })),
        );
    } finally {
        await cdp.detach();
    }
});
