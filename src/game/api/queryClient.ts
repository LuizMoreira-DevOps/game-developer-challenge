import { QueryClient } from "@tanstack/react-query";
import axios from "axios";

function shouldRetryQuery(failureCount: number, error: unknown): boolean {
    if (failureCount >= 2) {
        return false;
    }

    if (!axios.isAxiosError(error)) {
        return false;
    }

    if (!error.response) {
        return true;
    }

    const status = error.response.status;

    return status === 408 || status === 429 || status >= 500;
}

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 15_000,
            retry: shouldRetryQuery,
            retryDelay: (attempt) => Math.min(300 * 2 ** attempt, 1500),
            refetchOnWindowFocus: false,
        },
        mutations: {
            retry: false,
        },
    },
});
