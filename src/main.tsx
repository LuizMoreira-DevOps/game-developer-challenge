import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";

import App from "./App";
import { queryClient } from "./game/api/queryClient";

async function enableMocking() {
    const { worker } = await import("./mocks/browser");

    await worker.start({
        onUnhandledFrame: "bypass",
    });
}

async function bootstrap() {
    await enableMocking();

    createRoot(document.getElementById("root")!).render(
        <StrictMode>
            <QueryClientProvider client={queryClient}>
                <App />
            </QueryClientProvider>
        </StrictMode>,
    );
}

void bootstrap();
