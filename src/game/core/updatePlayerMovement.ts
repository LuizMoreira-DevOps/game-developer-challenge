import type { GameplayConfig } from "../config/gameplayConfig";
import type { PlayerMovementInput, PlayerState } from "./PlayerState";

export function updatePlayerMovement(
    player: PlayerState,
    input: PlayerMovementInput,
    config: GameplayConfig,
    deltaSeconds: number,
): void {
    const turnDirection = Number(input.turnRight) - Number(input.turnLeft);

    player.rotation +=
        turnDirection * config.playerRotationSpeed * deltaSeconds;

    if (!input.forward) {
        return;
    }

    const distance = config.playerMoveSpeed * deltaSeconds;

    player.x += Math.sin(player.rotation) * distance;

    player.y -= Math.cos(player.rotation) * distance;

    player.x = Math.max(
        config.playerCollisionRadius,
        Math.min(config.arenaWidth - config.playerCollisionRadius, player.x),
    );

    player.y = Math.max(
        config.playerCollisionRadius,
        Math.min(config.arenaHeight - config.playerCollisionRadius, player.y),
    );
}
