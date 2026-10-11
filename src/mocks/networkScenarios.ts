import { delay, HttpResponse } from "msw";

export const MOCK_SCENARIO_STORAGE_KEY = "pirate-battle:mock-scenario:v1";

export const networkScenarios = [
    "success",
    "empty",
    "latency",
    "out-of-order",
    "timeout",
    "network-error",
    "http-400",
    "http-500",
    "ranking-error",
    "history-error",
    "offline",
    "post-timeout-after-save",
] as const;

export type NetworkScenario = (typeof networkScenarios)[number];

export type MockApiOperation = "ranking" | "history" | "submit";

export function getNetworkScenario(): NetworkScenario {
    try {
        const stored = localStorage.getItem(MOCK_SCENARIO_STORAGE_KEY);

        return (
            networkScenarios.find((scenario) => scenario === stored) ??
            "success"
        );
    } catch {
        return "success";
    }
}

export function setNetworkScenario(scenario: NetworkScenario): void {
    localStorage.setItem(MOCK_SCENARIO_STORAGE_KEY, scenario);
}

export function resetNetworkScenario(): void {
    localStorage.removeItem(MOCK_SCENARIO_STORAGE_KEY);
}

function scenarioError(
    status: number,
    code: string,
    message: string,
): Response {
    return HttpResponse.json(
        {
            error: {
                code,
                message,
            },
        },
        { status },
    );
}

export async function applyScenarioBefore(
    operation: MockApiOperation,
    page = 1,
): Promise<Response | null> {
    const scenario = getNetworkScenario();

    switch (scenario) {
        case "latency":
            await delay(700);
            return null;

        case "out-of-order":
            await delay(page === 1 ? 900 : 60);
            return null;

        case "timeout":
            // Axios currently times out after 6000 ms.
            await delay(7000);
            return null;

        case "network-error":
        case "offline":
            return HttpResponse.error();

        case "http-400":
            return scenarioError(
                400,
                "SCENARIO_BAD_REQUEST",
                "Simulated HTTP 400 response.",
            );

        case "http-500":
            return scenarioError(
                500,
                "SCENARIO_SERVER_ERROR",
                "Simulated HTTP 500 response.",
            );

        case "ranking-error":
            return operation === "ranking"
                ? scenarioError(
                      500,
                      "RANKING_UNAVAILABLE",
                      "Ranking is temporarily unavailable.",
                  )
                : null;

        case "history-error":
            return operation === "history"
                ? scenarioError(
                      500,
                      "HISTORY_UNAVAILABLE",
                      "Match history is temporarily unavailable.",
                  )
                : null;

        case "success":
        case "empty":
        case "post-timeout-after-save":
            return null;
    }
}

export async function applyScenarioAfterSubmit(): Promise<void> {
    if (getNetworkScenario() === "post-timeout-after-save") {
        // The record is already saved, but the response arrives
        // after the Axios timeout. Retrying must be idempotent.
        await delay(7000);
    }
}
