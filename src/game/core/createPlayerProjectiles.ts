import type { GameplayConfig } from "../config/gameplayConfig";
import type { PlayerState } from "./PlayerState";
import type { ProjectileState } from "./ProjectileState";

export type PlayerWeaponType = "front" | "leftBroadside" | "rightBroadside";

export function createPlayerProjectiles(
    player: Readonly<PlayerState>,
    weapon: PlayerWeaponType,
    startingId: number,
    config: GameplayConfig,
): ProjectileState[] {
    if (weapon === "front") {
        return [
            createProjectile(
                startingId,
                player.x,
                player.y,
                player.rotation,
                config,
            ),
        ];
    }

    const projectileRotation =
        weapon === "leftBroadside"
            ? player.rotation - Math.PI / 2
            : player.rotation + Math.PI / 2;

    const forwardX = Math.sin(player.rotation);
    const forwardY = -Math.cos(player.rotation);

    const centerIndex = (config.broadsideProjectileCount - 1) / 2;

    return Array.from(
        {
            length: config.broadsideProjectileCount,
        },
        (_, index) => {
            const spacingOffset =
                (index - centerIndex) * config.broadsideProjectileSpacing;

            return createProjectile(
                startingId + index,
                player.x + forwardX * spacingOffset,
                player.y + forwardY * spacingOffset,
                projectileRotation,
                config,
            );
        },
    );
}

function createProjectile(
    id: number,
    x: number,
    y: number,
    rotation: number,
    config: GameplayConfig,
): ProjectileState {
    return {
        id,
        x,
        y,
        rotation,
        speed: config.projectileSpeed,
        damage: config.projectileDamage,
        remainingLifetimeSeconds: config.projectileLifetimeSeconds,
    };
}
