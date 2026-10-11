export interface CircleCollider {
    x: number;
    y: number;
    radius: number;
}

export function circlesOverlap(
    first: CircleCollider,
    second: CircleCollider,
): boolean {
    const deltaX = second.x - first.x;
    const deltaY = second.y - first.y;

    const distanceSquared = deltaX * deltaX + deltaY * deltaY;

    const combinedRadius = first.radius + second.radius;

    return distanceSquared < combinedRadius * combinedRadius;
}
