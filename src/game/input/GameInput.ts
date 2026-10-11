import type { PlayerMovementInput } from "../core/PlayerState";

export interface GameInput {
    getMovementInput(): PlayerMovementInput;
}
