import { expect, test } from "@playwright/test";

import {
    circlesOverlap,
    type CircleCollider,
} from "../../src/game/core/collision/circleOverlap";

import { resolveCircleOverlap } from "../../src/game/core/collision/resolveCircleOverlap";

const island: CircleCollider = {
    x: 640,
    y: 360,
    radius: 96,
};

test("detects overlapping circles", () => {
    const player: CircleCollider = {
        x: 540,
        y: 360,
        radius: 32,
    };

    expect(circlesOverlap(player, island)).toBe(true);
});

test("does not detect separated circles", () => {
    const player: CircleCollider = {
        x: 400,
        y: 360,
        radius: 32,
    };

    expect(circlesOverlap(player, island)).toBe(false);
});

test("allows circles to touch without overlapping", () => {
    const player: CircleCollider = {
        x: 512,
        y: 360,
        radius: 32,
    };

    expect(circlesOverlap(player, island)).toBe(false);
});

test("detects overlap from another direction", () => {
    const player: CircleCollider = {
        x: 640,
        y: 250,
        radius: 32,
    };

    expect(circlesOverlap(player, island)).toBe(true);
});

test("pushes an overlapping circle outside the obstacle", () => {
    const player: CircleCollider = {
        x: 540,
        y: 360,
        radius: 32,
    };

    const resolved = resolveCircleOverlap(player, island);

    expect(resolved.x).toBeCloseTo(512);
    expect(resolved.y).toBeCloseTo(360);
});

test("keeps a separated circle unchanged", () => {
    const player: CircleCollider = {
        x: 400,
        y: 360,
        radius: 32,
    };

    const resolved = resolveCircleOverlap(player, island);

    expect(resolved).toEqual({
        x: 400,
        y: 360,
    });
});

test("resolves overlap from a diagonal direction", () => {
    const player: CircleCollider = {
        x: 560,
        y: 280,
        radius: 32,
    };

    const resolved = resolveCircleOverlap(player, island);

    const deltaX = resolved.x - island.x;
    const deltaY = resolved.y - island.y;

    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    expect(distance).toBeCloseTo(128);
});
