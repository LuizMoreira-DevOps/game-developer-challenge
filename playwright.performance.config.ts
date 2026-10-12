import { env } from "node:process";
import { defineConfig } from "@playwright/test";

const publishedURL = env.PERFORMANCE_URL;

export default defineConfig({
    testDir: "./tests/performance",
    testMatch: "**/*.profile.ts",

    fullyParallel: false,
    workers: 1,
    retries: 0,

    // Allows the five complete matches to finish.
    timeout: 15 * 60 * 1000,

    expect: {
        timeout: 15000,
    },

    reporter: [
        ["line"],
        [
            "html",
            {
                outputFolder: "playwright-report-performance",
                open: "never",
            },
        ],
    ],

    use: {
        baseURL: publishedURL ?? "http://127.0.0.1:4173",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
    },

    webServer: publishedURL
        ? undefined
        : {
              command:
                  "npm run preview -- --host 127.0.0.1 --port 4173 --strictPort",
              url: "http://127.0.0.1:4173",
              reuseExistingServer: false,
              timeout: 60000,
          },
});
