export type EnemyType = "chaser" | "shooter";

export interface EnemyState {
    id: number;
    type: EnemyType;
    x: number;
    y: number;
    rotation: number;
    health: number;
    attackCooldownSeconds: number;
}
