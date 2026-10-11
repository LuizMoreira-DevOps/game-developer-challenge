export const SUBMISSION_RECEIPTS_STORAGE_KEY =
    "pirate-battle:submission-receipts:v1";

type ReceiptStorage = Pick<Storage, "getItem" | "setItem">;

export function readSubmissionReceipts(
    storage: ReceiptStorage = localStorage,
): string[] {
    try {
        const raw = storage.getItem(SUBMISSION_RECEIPTS_STORAGE_KEY);

        if (!raw) {
            return [];
        }

        const parsed: unknown = JSON.parse(raw);

        if (!Array.isArray(parsed)) {
            return [];
        }

        return [
            ...new Set(
                parsed.filter(
                    (value): value is string =>
                        typeof value === "string" && value.trim().length > 0,
                ),
            ),
        ];
    } catch {
        return [];
    }
}

export function markMatchConfirmed(
    matchId: string,
    storage: ReceiptStorage = localStorage,
): void {
    if (!matchId.trim()) {
        throw new RangeError("Match ID is required.");
    }

    const confirmed = readSubmissionReceipts(storage);

    if (confirmed.includes(matchId)) {
        return;
    }

    storage.setItem(
        SUBMISSION_RECEIPTS_STORAGE_KEY,
        JSON.stringify([...confirmed, matchId]),
    );
}

export function isMatchConfirmed(
    matchId: string,
    storage: ReceiptStorage = localStorage,
): boolean {
    return readSubmissionReceipts(storage).includes(matchId);
}
