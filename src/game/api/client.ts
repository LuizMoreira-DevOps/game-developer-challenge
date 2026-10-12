import axios from "axios";

import type {
    HistoryParams,
    MatchHistoryResponse,
    RankingParams,
    RankingResponse,
    SubmitMatchRequest,
    SubmitMatchResponse,
} from "./contracts";

export const apiClient = axios.create({
    baseURL: `${import.meta.env.BASE_URL}api/`,
    timeout: 6000,
    headers: {
        Accept: "application/json",
    },
});

export async function fetchRanking(
    params: RankingParams,
    signal?: AbortSignal,
): Promise<RankingResponse> {
    const response = await apiClient.get<RankingResponse>("/ranking", {
        params,
        signal,
    });

    return response.data;
}

export async function fetchMatchHistory(
    params: HistoryParams,
    signal?: AbortSignal,
): Promise<MatchHistoryResponse> {
    const response = await apiClient.get<MatchHistoryResponse>("/matches", {
        params,
        signal,
    });

    return response.data;
}

export async function submitCompletedMatch(
    match: SubmitMatchRequest,
): Promise<SubmitMatchResponse> {
    const response = await apiClient.post<SubmitMatchResponse>(
        "/matches",
        match,
        {
            headers: {
                "Idempotency-Key": match.matchId,
            },
        },
    );

    return response.data;
}
