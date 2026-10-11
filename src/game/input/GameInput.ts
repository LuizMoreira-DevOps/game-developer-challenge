import type { PlayerMovementInput } from "../core/PlayerState";
import type { PlayerWeaponInput } from "./PlayerWeaponInput";

export interface GameInput {
    getMovementInput(): PlayerMovementInput;
    getWeaponInput(): PlayerWeaponInput;
}

export interface GameInput {
    getMovementInput(): PlayerMovementInput;
    getWeaponInput(): PlayerWeaponInput;
    clear(): void;
}
