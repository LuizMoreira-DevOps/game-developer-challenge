import { expect, test, type Page } from "@playwright/test";

type ListenerCounts = Record<string, number>;

type CycleResult = {
    cycle: number;
    heapUsedBytes: number;
    activeListeners: ListenerCounts;
    canvasCount: number;
};

async function getListenerCounts(page: Page): Promise<ListenerCounts> {
    return page.evaluate(() => {
        const monitored = window as typeof window & {
            __pirateListenerCounts: () => Record<string, number>;
        };

        return monitored.__pirateListenerCounts();
    });
}

test("cleans up resources across five gameplay cycles", async ({ page }) => {
    test.setTimeout(120_000);

    // Install diagnostics before the application loads.
    await page.addInitScript(() => {
        const watchedTypes = new Set([
            "keydown",
            "keyup",
            "blur",
            "visibilitychange",
            "pointerup",
            "pointercancel",
        ]);

        type ListenerEntry = {
            listener: EventListenerOrEventListenerObject;
            capture: boolean;
        };

        const active = new Map<string, ListenerEntry[]>();

        function patch(target: Window | Document, targetName: string): void {
            const originalAdd = target.addEventListener.bind(target);

            const originalRemove = target.removeEventListener.bind(target);

            const keyFor = (type: string) => `${targetName}:${type}`;

            const isCapture = (options?: boolean | AddEventListenerOptions) =>
                typeof options === "boolean"
                    ? options
                    : (options?.capture ?? false);

            target.addEventListener = ((
                type: string,
                listener: EventListenerOrEventListenerObject | null,
                options?: boolean | AddEventListenerOptions,
            ) => {
                if (watchedTypes.has(type) && listener) {
                    const key = keyFor(type);
                    const entries = active.get(key) ?? [];
                    const capture = isCapture(options);

                    if (
                        !entries.some(
                            (entry) =>
                                entry.listener === listener &&
                                entry.capture === capture,
                        )
                    ) {
                        entries.push({ listener, capture });
                        active.set(key, entries);
                    }
                }

                if (listener === null) {
                    return;
                }

                originalAdd(type, listener, options);
            }) as typeof target.addEventListener;

            target.removeEventListener = ((
                type: string,
                listener: EventListenerOrEventListenerObject | null,
                options?: boolean | EventListenerOptions,
            ) => {
                if (watchedTypes.has(type) && listener) {
                    const key = keyFor(type);
                    const capture = isCapture(options);

                    const entries = active.get(key) ?? [];

                    active.set(
                        key,
                        entries.filter(
                            (entry) =>
                                entry.listener !== listener ||
                                entry.capture !== capture,
                        ),
                    );
                }

                if (listener === null) {
                    return;
                }

                originalRemove(type, listener, options);
            }) as typeof target.removeEventListener;
        }

        patch(window, "window");
        patch(document, "document");

        Object.defineProperty(window, "__pirateListenerCounts", {
            value: () => {
                const result: Record<string, number> = {};

                for (const target of ["window", "document"]) {
                    for (const type of watchedTypes) {
                        const key = `${target}:${type}`;

                        result[key] = active.get(key)?.length ?? 0;
                    }
                }

                return result;
            },
        });
    });

    await page.goto("/", {
        waitUntil: "domcontentloaded",
    });

    const menu = page.getByRole("heading", {
        name: "Main Menu",
    });

    const play = page.getByRole("button", {
        name: "Play",
        exact: true,
    });

    const canvas = page.getByTestId("game-canvas-container").locator("canvas");

    const status = page.getByRole("status", {
        name: "Match status",
    });

    await expect(menu).toBeVisible();

    const baselineListeners = await getListenerCounts(page);

    // Chromium-only diagnostics; both configured projects use Chromium.
    const cdp = await page.context().newCDPSession(page);

    const results: CycleResult[] = [];

    for (let cycle = 1; cycle <= 5; cycle++) {
        await play.click();
        await page.bringToFront();

        await expect(canvas).toHaveCount(1, {
            timeout: 15000,
        });

        await expect(canvas).toBeVisible();

        const resume = page.getByRole("button", {
            name: "Resume",
            exact: true,
        });

        // Browser focus changes may automatically pause gameplay.
        if (await resume.isVisible()) {
            await resume.click();
        }

        await expect(status).toContainText("Playing");

        // Exercise real gameplay input.
        await page.keyboard.press("w");
        await page.keyboard.press("f");

        // Exercise pause and resume listeners.
        await page
            .getByRole("button", {
                name: "Pause",
                exact: true,
            })
            .click();

        await expect(status).toContainText("Paused");

        await resume.click();

        await expect(status).toContainText("Playing");

        await page
            .getByRole("button", {
                name: "Exit to Menu",
            })
            .click();

        await expect(menu).toBeVisible();

        // PixiJS must remove its canvas on unmount.
        await expect(canvas).toHaveCount(0);
        await expect(page.locator("canvas")).toHaveCount(0);

        // All gameplay-specific listeners must be removed.
        const listeners = await getListenerCounts(page);

        expect(listeners, `Listener leak after cycle ${cycle}`).toEqual(
            baselineListeners,
        );

        // Collect garbage before obtaining the heap measurement.
        await cdp.send("HeapProfiler.collectGarbage");

        const heap = await cdp.send("Runtime.getHeapUsage");

        results.push({
            cycle,
            heapUsedBytes: heap.usedSize,
            activeListeners: listeners,
            canvasCount: 0,
        });
    }

    // Save evidence in the Playwright HTML report.
    await test.info().attach("resource-lifecycle.json", {
        body: JSON.stringify(
            {
                baselineListeners,
                cycles: results,
                heapGrowthAfterWarmupBytes:
                    results[4].heapUsedBytes - results[0].heapUsedBytes,
            },
            null,
            2,
        ),
        contentType: "application/json",
    });

    console.table(
        results.map((result) => ({
            cycle: result.cycle,
            heapMB: (result.heapUsedBytes / 1024 / 1024).toFixed(2),
            canvasCount: result.canvasCount,
        })),
    );

    await cdp.detach();
});
