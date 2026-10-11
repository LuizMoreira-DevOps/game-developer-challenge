import type { ProjectileState } from "./ProjectileState";

export function updateProjectiles(
    projectiles: ProjectileState[],
    deltaSeconds: number,
): ProjectileState[] {
    for (const projectile of projectiles) {
        const distance = projectile.speed * deltaSeconds;

        projectile.x += Math.sin(projectile.rotation) * distance;

        projectile.y -= Math.cos(projectile.rotation) * distance;

        projectile.remainingLifetimeSeconds -= deltaSeconds;
    }

    return projectiles.filter(
        (projectile) => projectile.remainingLifetimeSeconds > 0,
    );
}
