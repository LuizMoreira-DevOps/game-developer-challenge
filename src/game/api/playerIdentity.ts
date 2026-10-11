import type { PlayerIdentity } from "./contracts";

export const PLAYER_STORAGE_KEY = "pirate-battle:player:v1";

type PlayerStorage = Pick<Storage, "getItem" | "setItem">;

function isPlayerIdentity(value: unknown): value is PlayerIdentity {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return false;
    }

    const player = value as Record<string, unknown>;

    return (
        typeof player.id === "string" &&
        player.id.trim().length > 0 &&
        typeof player.name === "string" &&
        player.name.trim().length > 0
    );
}

export function getOrCreatePlayerIdentity(
    storage: PlayerStorage = localStorage,
): PlayerIdentity {
    try {
        const saved = storage.getItem(PLAYER_STORAGE_KEY);

        if (saved) {
            const parsed: unknown = JSON.parse(saved);

            if (isPlayerIdentity(parsed)) {
                return parsed;
            }
        }
    } catch {
        // Corrupted data falls back to a new identity.
    }

    const player: PlayerIdentity = {
        id: crypto.randomUUID(),
        name: "Captain Player",
    };

    storage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(player));

    return player;
}
