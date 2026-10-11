import { RULESET_VERSION, type MatchRecord } from "../game/api/contracts";

interface FixtureData {
    readonly id: string;
    readonly playerId: string;
    readonly playerName: string;
    readonly score: number;
    readonly elapsedSeconds: number;
    readonly duration: number;
    readonly spawnInterval: number;
    readonly finishedAt: string;
}

const fixtureData: readonly FixtureData[] = [
    {
        id: "fixture-001",
        playerId: "player-ada",
        playerName: "Captain Ada",
        score: 18,
        elapsedSeconds: 90,
        duration: 90,
        spawnInterval: 5,
        finishedAt: "2026-10-01T12:00:00.000Z",
    },
    {
        id: "fixture-002",
        playerId: "player-grace",
        playerName: "Captain Grace",
        score: 14,
        elapsedSeconds: 72,
        duration: 90,
        spawnInterval: 5,
        finishedAt: "2026-10-02T12:00:00.000Z",
    },
    {
        id: "fixture-003",
        playerId: "player-alan",
        playerName: "Captain Alan",
        score: 14,
        elapsedSeconds: 84,
        duration: 90,
        spawnInterval: 5,
        finishedAt: "2026-10-03T12:00:00.000Z",
    },
    {
        id: "fixture-004",
        playerId: "player-linus",
        playerName: "Captain Linus",
        score: 11,
        elapsedSeconds: 65,
        duration: 90,
        spawnInterval: 5,
        finishedAt: "2026-10-04T12:00:00.000Z",
    },
    {
        id: "fixture-005",
        playerId: "player-margaret",
        playerName: "Captain Margaret",
        score: 9,
        elapsedSeconds: 80,
        duration: 90,
        spawnInterval: 5,
        finishedAt: "2026-10-05T12:00:00.000Z",
    },
    {
        id: "fixture-006",
        playerId: "player-dennis",
        playerName: "Captain Dennis",
        score: 7,
        elapsedSeconds: 60,
        duration: 90,
        spawnInterval: 5,
        finishedAt: "2026-10-06T12:00:00.000Z",
    },
    {
        id: "fixture-007",
        playerId: "player-ada",
        playerName: "Captain Ada",
        score: 25,
        elapsedSeconds: 120,
        duration: 120,
        spawnInterval: 3,
        finishedAt: "2026-10-07T12:00:00.000Z",
    },
    {
        id: "fixture-008",
        playerId: "player-grace",
        playerName: "Captain Grace",
        score: 21,
        elapsedSeconds: 110,
        duration: 120,
        spawnInterval: 3,
        finishedAt: "2026-10-08T12:00:00.000Z",
    },
];

export const matchFixtures: readonly MatchRecord[] = fixtureData.map(
    (fixture) => ({
        matchId: fixture.id,
        playerId: fixture.playerId,
        playerName: fixture.playerName,
        score: fixture.score,
        elapsedSeconds: fixture.elapsedSeconds,
        endReason:
            fixture.elapsedSeconds >= fixture.duration ? "time" : "destroyed",
        matchDurationSeconds: fixture.duration,
        enemySpawnIntervalSeconds: fixture.spawnInterval,
        rulesetVersion: RULESET_VERSION,
        startedAt: new Date(
            Date.parse(fixture.finishedAt) - fixture.elapsedSeconds * 1000,
        ).toISOString(),
        finishedAt: fixture.finishedAt,
    }),
);
