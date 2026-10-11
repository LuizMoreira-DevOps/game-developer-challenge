export interface PlayerState {
    x: number;
    y: number;
    rotation: number;
    health: number;
}

export interface PlayerMovementInput {
    forward: boolean;
    turnLeft: boolean;
    turnRight: boolean;
}
