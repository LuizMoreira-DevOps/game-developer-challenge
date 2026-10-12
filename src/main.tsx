import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";

import App from "./App";
import { queryClient } from "./game/api/queryClient";

async function enableMocking() {
    const { worker } = await import("./mocks/browser");

    await worker.start({
        onUnhandledFrame: "bypass",
        serviceWorker: {
            url: `${import.meta.env.BASE_URL}mockServiceWorker.js`,
            options: {
                scope: import.meta.env.BASE_URL,
            },
        },
    });
}

async function bootstrap() {
    try {
        await enableMocking();
    } catch (error: unknown) {
        // Keep offline gameplay available even if MSW cannot start.
        console.error("Mock API unavailable:", error);
    }

    createRoot(document.getElementById("root")!).render(
        <StrictMode>
            <QueryClientProvider client={queryClient}>
                <App />
            </QueryClientProvider>
        </StrictMode>,
    );
}

void bootstrap();
