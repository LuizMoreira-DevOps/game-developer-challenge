import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";

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
            <App />
        </StrictMode>,
    );
}

void bootstrap();
