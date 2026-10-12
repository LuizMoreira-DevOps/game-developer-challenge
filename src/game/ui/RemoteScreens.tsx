import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchMatchHistory, fetchRanking } from "../api/client";

import { RULESET_VERSION } from "../api/contracts";
import type { MatchOptions } from "../state/matchPersistence";

const PAGE_SIZE = 5;

interface PaginationProps {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
    return (
        <nav
            className="app-actions log-pagination"
            aria-label="Results pagination"
        >
            <button
                type="button"
                className="round-button"
                aria-label="Previous"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
            >
                ‹
            </button>

            <span aria-live="polite">
                Page {page} of {Math.max(1, totalPages)}
            </span>

            <button
                type="button"
                className="round-button"
                aria-label="Next"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
            >
                ›
            </button>
        </nav>
    );
}

interface CaptainLogTabsProps {
    active: "ranking" | "history";
    onRanking: () => void;
    onHistory: () => void;
}

function CaptainLogTabs({ active, onRanking, onHistory }: CaptainLogTabsProps) {
    return (
        <nav className="log-tabs" aria-label="Captain's log sections">
            <button
                type="button"
                className={active === "ranking" ? "is-active" : ""}
                aria-current={active === "ranking" ? "page" : undefined}
                onClick={onRanking}
            >
                Ranking
            </button>

            <button
                type="button"
                className={active === "history" ? "is-active" : ""}
                aria-current={active === "history" ? "page" : undefined}
                onClick={onHistory}
            >
                Match History
            </button>
        </nav>
    );
}

interface RankingScreenProps {
    options: MatchOptions;
    playerId: string;
    onMainMenu: () => void;
    onHistory: () => void;
}

export function RankingScreen({
    options,
    playerId,
    onMainMenu,
    onHistory,
}: RankingScreenProps) {
    const [page, setPage] = useState(1);

    const query = useQuery({
        queryKey: [
            "ranking",
            options.matchDurationSeconds,
            options.enemySpawnIntervalSeconds,
            RULESET_VERSION,
            page,
        ],
        queryFn: ({ signal }) =>
            fetchRanking(
                {
                    matchDurationSeconds: options.matchDurationSeconds,
                    enemySpawnIntervalSeconds:
                        options.enemySpawnIntervalSeconds,
                    rulesetVersion: RULESET_VERSION,
                    page,
                    pageSize: PAGE_SIZE,
                },
                signal,
            ),
        refetchOnMount: "always",
    });

    return (
        <section
            className="app-panel app-panel--log"
            aria-labelledby="ranking-heading"
        >
            <p className="log-brand">Captain's Log</p>

            <h2 id="ranking-heading" className="log-screen-heading">
                Ranking
            </h2>

            <CaptainLogTabs
                active="ranking"
                onRanking={() => setPage(1)}
                onHistory={onHistory}
            />

            <p className="log-description">
                Match: {options.matchDurationSeconds}s{" · "}
                Enemy spawn: {options.enemySpawnIntervalSeconds}s
            </p>

            {query.isPending && <p role="status">Loading ranking...</p>}

            {query.isError && (
                <p role="alert">
                    {query.data
                        ? "Ranking refresh failed. Showing cached results."
                        : "Ranking is temporarily unavailable."}
                </p>
            )}

            {query.isFetching && !query.isPending && (
                <p role="status">Refreshing ranking...</p>
            )}

            {query.data?.items.length === 0 && (
                <p className="log-empty">
                    No ranking results for this configuration.
                </p>
            )}

            {query.data && query.data.items.length > 0 && (
                <div className="remote-table-scroll">
                    <table>
                        <thead>
                            <tr>
                                <th scope="col">Rank</th>
                                <th scope="col">Captain</th>
                                <th scope="col">Score</th>
                                <th scope="col">Time</th>
                            </tr>
                        </thead>

                        <tbody>
                            {query.data.items.map((entry) => {
                                const isCurrentPlayer =
                                    entry.playerId === playerId;

                                return (
                                    <tr
                                        key={entry.matchId}
                                        className={
                                            isCurrentPlayer
                                                ? "is-current-player"
                                                : entry.rank <= 3
                                                  ? "is-top-three"
                                                  : undefined
                                        }
                                    >
                                        <td className="log-rank">
                                            {String(entry.rank).padStart(
                                                2,
                                                "0",
                                            )}
                                        </td>

                                        <td>
                                            {entry.playerName}

                                            {isCurrentPlayer && (
                                                <span className="ranking-you">
                                                    YOU
                                                </span>
                                            )}
                                        </td>

                                        <td className="log-score">
                                            {entry.score}
                                        </td>

                                        <td>
                                            {Math.round(entry.elapsedSeconds)}s
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {query.data && query.data.totalItems > 0 && (
                <Pagination
                    page={page}
                    totalPages={query.data.totalPages}
                    onPageChange={setPage}
                />
            )}

            <div className="app-actions log-actions">
                <button
                    type="button"
                    onClick={() => void query.refetch()}
                    disabled={query.isFetching}
                >
                    Refresh Ranking
                </button>

                <button type="button" onClick={onMainMenu}>
                    Main Menu
                </button>
            </div>
        </section>
    );
}

interface HistoryScreenProps {
    playerId: string;
    onMainMenu: () => void;
    onRanking: () => void;
}

export function HistoryScreen({
    playerId,
    onMainMenu,
    onRanking,
}: HistoryScreenProps) {
    const [page, setPage] = useState(1);

    const query = useQuery({
        queryKey: ["match-history", playerId, page],
        queryFn: ({ signal }) =>
            fetchMatchHistory(
                {
                    playerId,
                    page,
                    pageSize: PAGE_SIZE,
                },
                signal,
            ),
        refetchOnMount: "always",
    });

    return (
        <section
            className="app-panel app-panel--log"
            aria-labelledby="history-heading"
        >
            <p className="log-brand">Captain's Log</p>

            <h2 id="history-heading" className="log-screen-heading">
                Match History
            </h2>

            <CaptainLogTabs
                active="history"
                onRanking={onRanking}
                onHistory={() => setPage(1)}
            />

            <p className="log-description">Your recent battles</p>

            {query.isPending && <p role="status">Loading match history...</p>}

            {query.isError && (
                <p role="alert">
                    {query.data
                        ? "History refresh failed. Showing cached results."
                        : "Match history is temporarily unavailable."}
                </p>
            )}

            {query.isFetching && !query.isPending && (
                <p role="status">Refreshing match history...</p>
            )}

            {query.data?.items.length === 0 && (
                <p className="log-empty">No completed matches recorded yet.</p>
            )}

            {query.data && query.data.items.length > 0 && (
                <div className="remote-table-scroll">
                    <table>
                        <thead>
                            <tr>
                                <th scope="col">Date</th>
                                <th scope="col">Score</th>
                                <th scope="col">Time</th>
                                <th scope="col">Outcome</th>
                                <th scope="col">Configuration</th>
                            </tr>
                        </thead>

                        <tbody>
                            {query.data.items.map((match) => (
                                <tr key={match.matchId}>
                                    <td>
                                        {new Date(
                                            match.finishedAt,
                                        ).toLocaleString()}
                                    </td>

                                    <td className="log-score">{match.score}</td>

                                    <td>{Math.round(match.elapsedSeconds)}s</td>

                                    <td>
                                        {match.endReason === "time"
                                            ? "Time's up"
                                            : "Ship destroyed"}
                                    </td>

                                    <td>
                                        {match.matchDurationSeconds}s{" / "}
                                        {match.enemySpawnIntervalSeconds}s
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {query.data && query.data.totalItems > 0 && (
                <Pagination
                    page={page}
                    totalPages={query.data.totalPages}
                    onPageChange={setPage}
                />
            )}

            <div className="app-actions log-actions">
                <button
                    type="button"
                    onClick={() => void query.refetch()}
                    disabled={query.isFetching}
                >
                    Refresh History
                </button>

                <button type="button" onClick={onMainMenu}>
                    Main Menu
                </button>
            </div>
        </section>
    );
}
