import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import { submitCompletedMatch } from "./client";
import { getOrCreatePlayerIdentity } from "./playerIdentity";
import {
    enqueueCompletedMatch,
    getPendingMatchCount,
    readPendingMatches,
    removePendingMatch,
} from "./pendingMatches";

import type { CompletedMatchResult } from "../state/matchPersistence";

import { markMatchConfirmed } from "./submissionReceipts";

import { readLastCompletedResult } from "../state/matchPersistence";
import { isMatchConfirmed } from "./submissionReceipts";

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "Match submission failed.";
}

export function usePendingMatchSync() {
    const queryClient = useQueryClient();

    const [player] = useState(() => getOrCreatePlayerIdentity());

    const [pendingCount, setPendingCount] = useState(() =>
        getPendingMatchCount(),
    );

    const [isSyncing, setIsSyncing] = useState(false);
    const [syncError, setSyncError] = useState<string | null>(null);

    const inFlightRef = useRef<Promise<void> | null>(null);
    const rerunRequestedRef = useRef(false);

    const { mutateAsync } = useMutation({
        mutationFn: submitCompletedMatch,
        retry: false,
    });

    const syncPendingMatches = useCallback((): Promise<void> => {
        if (inFlightRef.current) {
            rerunRequestedRef.current = true;
            return inFlightRef.current;
        }

        const operation = (async () => {
            setIsSyncing(true);
            setSyncError(null);

            let submittedAny = false;

            try {
                do {
                    rerunRequestedRef.current = false;

                    const pending = readPendingMatches();

                    for (const match of pending) {
                        try {
                            const response = await mutateAsync(match);

                            if (response.match.matchId !== match.matchId) {
                                throw new Error(
                                    "The API confirmed a different match.",
                                );
                            }

                            // Persist the server acknowledgment before removing the
                            // pending record. A refresh between these operations
                            // must never lose the submitted match.
                            markMatchConfirmed(match.matchId);

                            removePendingMatch(match.matchId);

                            submittedAny = true;

                            setPendingCount(getPendingMatchCount());
                        } catch (error: unknown) {
                            // Never discard a match after a failed request.
                            setSyncError(getErrorMessage(error));
                        }
                    }
                } while (rerunRequestedRef.current);

                if (submittedAny) {
                    await Promise.all([
                        queryClient.invalidateQueries({
                            queryKey: ["ranking"],
                        }),
                        queryClient.invalidateQueries({
                            queryKey: ["match-history"],
                        }),
                    ]);
                }
            } finally {
                setPendingCount(getPendingMatchCount());
                setIsSyncing(false);
            }
        })();

        const tracked = operation.finally(() => {
            inFlightRef.current = null;
        });

        inFlightRef.current = tracked;

        return tracked;
    }, [mutateAsync, queryClient]);

    const queueCompletedMatch = useCallback(
        (result: CompletedMatchResult): void => {
            enqueueCompletedMatch(result, player);

            setPendingCount(getPendingMatchCount());

            // Submission happens in the background.
            void syncPendingMatches();
        },
        [player, syncPendingMatches],
    );

    useEffect(() => {
        // Recover a completed match that was saved locally but
        // was not yet added to the submission queue.
        const lastCompleted = readLastCompletedResult();

        if (
            lastCompleted &&
            !isMatchConfirmed(lastCompleted.id) &&
            !readPendingMatches().some(
                (match) => match.matchId === lastCompleted.id,
            )
        ) {
            enqueueCompletedMatch(lastCompleted, player);
        }

        // Recover all pending submissions after reload.
        void syncPendingMatches();

        const handleOnline = () => {
            void syncPendingMatches();
        };

        const handleVisibilityChange = () => {
            if (!document.hidden) {
                void syncPendingMatches();
            }
        };

        window.addEventListener("online", handleOnline);

        document.addEventListener("visibilitychange", handleVisibilityChange);

        // Also supports recovery from simulated outages while
        // navigator.onLine remains true.
        const retryInterval = window.setInterval(() => {
            if (!document.hidden && getPendingMatchCount() > 0) {
                void syncPendingMatches();
            }
        }, 30_000);

        return () => {
            window.removeEventListener("online", handleOnline);

            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange,
            );

            window.clearInterval(retryInterval);
        };
    }, [player, syncPendingMatches]);

    return {
        player,
        pendingCount,
        isSyncing,
        syncError,
        queueCompletedMatch,
        syncPendingMatches,
    };
}
