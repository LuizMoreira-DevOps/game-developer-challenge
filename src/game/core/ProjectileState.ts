export type ProjectileOwner = "player" | "enemy";

export interface ProjectileState {
    id: number;
    x: number;
    y: number;
    rotation: number;
    speed: number;
    damage: number;
    remainingLifetimeSeconds: number;
    owner: ProjectileOwner;
}
