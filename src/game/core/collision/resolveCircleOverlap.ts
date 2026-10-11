import type { CircleCollider } from "./circleOverlap";

export interface ResolvedPosition {
    x: number;
    y: number;
}

export function resolveCircleOverlap(
    moving: CircleCollider,
    obstacle: CircleCollider,
): ResolvedPosition {
    const deltaX = moving.x - obstacle.x;
    const deltaY = moving.y - obstacle.y;

    const minimumDistance = moving.radius + obstacle.radius;

    const distanceSquared = deltaX * deltaX + deltaY * deltaY;

    if (distanceSquared >= minimumDistance * minimumDistance) {
        return {
            x: moving.x,
            y: moving.y,
        };
    }

    const distance = Math.sqrt(distanceSquared);

    if (distance === 0) {
        return {
            x: obstacle.x + minimumDistance,
            y: obstacle.y,
        };
    }

    const normalX = deltaX / distance;
    const normalY = deltaY / distance;

    return {
        x: obstacle.x + normalX * minimumDistance,
        y: obstacle.y + normalY * minimumDistance,
    };
}
