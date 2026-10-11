import { expect, test } from "@playwright/test";

import { defaultGameplayConfig } from "../../src/game/config/gameplayConfig";
import type {
    PlayerMovementInput,
    PlayerState,
} from "../../src/game/core/PlayerState";
import { updatePlayerMovement } from "../../src/game/core/updatePlayerMovement";

const idleInput: PlayerMovementInput = {
    forward: false,
    turnLeft: false,
    turnRight: false,
};

test("moves the player forward using delta time", () => {
    const player: PlayerState = {
        x: 100,
        y: 200,
        rotation: 0,
    };

    updatePlayerMovement(
        player,
        {
            ...idleInput,
            forward: true,
        },
        defaultGameplayConfig,
        0.5,
    );

    expect(player.x).toBeCloseTo(100);
    expect(player.y).toBeCloseTo(110);
});

test("rotates the player to the right using delta time", () => {
    const player: PlayerState = {
        x: 0,
        y: 0,
        rotation: 0,
    };

    updatePlayerMovement(
        player,
        {
            ...idleInput,
            turnRight: true,
        },
        defaultGameplayConfig,
        0.5,
    );

    expect(player.rotation).toBeCloseTo(Math.PI / 2);
});

test("rotates the player to the left using delta time", () => {
    const player: PlayerState = {
        x: 0,
        y: 0,
        rotation: 0,
    };

    updatePlayerMovement(
        player,
        {
            ...idleInput,
            turnLeft: true,
        },
        defaultGameplayConfig,
        0.5,
    );

    expect(player.rotation).toBeCloseTo(-Math.PI / 2);
});

test("keeps the player inside the top arena boundary", () => {
    const player: PlayerState = {
        x: 200,
        y: 40,
        rotation: 0,
    };

    updatePlayerMovement(
        player,
        {
            ...idleInput,
            forward: true,
        },
        defaultGameplayConfig,
        1,
    );

    expect(player.y).toBe(defaultGameplayConfig.playerCollisionRadius);
});

test("keeps the player inside the bottom arena boundary", () => {
    const player: PlayerState = {
        x: 200,
        y: 680,
        rotation: Math.PI,
    };

    updatePlayerMovement(
        player,
        {
            ...idleInput,
            forward: true,
        },
        defaultGameplayConfig,
        1,
    );

    expect(player.y).toBe(
        defaultGameplayConfig.arenaHeight -
            defaultGameplayConfig.playerCollisionRadius,
    );
});

test("keeps the player inside the left arena boundary", () => {
    const player: PlayerState = {
        x: 40,
        y: 200,
        rotation: -Math.PI / 2,
    };

    updatePlayerMovement(
        player,
        {
            ...idleInput,
            forward: true,
        },
        defaultGameplayConfig,
        1,
    );

    expect(player.x).toBe(defaultGameplayConfig.playerCollisionRadius);
});

test("keeps the player inside the right arena boundary", () => {
    const player: PlayerState = {
        x: 1240,
        y: 200,
        rotation: Math.PI / 2,
    };

    updatePlayerMovement(
        player,
        {
            ...idleInput,
            forward: true,
        },
        defaultGameplayConfig,
        1,
    );

    expect(player.x).toBe(
        defaultGameplayConfig.arenaWidth -
            defaultGameplayConfig.playerCollisionRadius,
    );
});
