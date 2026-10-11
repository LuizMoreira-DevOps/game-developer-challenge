import type { PlayerMovementInput } from "../core/PlayerState";
import type { GameInput } from "./GameInput";
import type { PlayerWeaponInput } from "./PlayerWeaponInput";

export type TouchAction =
    | "forward"
    | "turnLeft"
    | "turnRight"
    | "fireFront"
    | "fireLeftBroadside"
    | "fireRightBroadside";

export class TouchInput implements GameInput {
    private readonly pointers = new Map<number, TouchAction>();

    public press(action: TouchAction, pointerId: number): void {
        this.pointers.set(pointerId, action);
    }

    public release(pointerId: number): void {
        this.pointers.delete(pointerId);
    }

    public isPressed(action: TouchAction): boolean {
        for (const pressedAction of this.pointers.values()) {
            if (pressedAction === action) {
                return true;
            }
        }

        return false;
    }

    public getMovementInput(): PlayerMovementInput {
        return {
            forward: this.isPressed("forward"),
            turnLeft: this.isPressed("turnLeft"),
            turnRight: this.isPressed("turnRight"),
        };
    }

    public getWeaponInput(): PlayerWeaponInput {
        return {
            fireFront: this.isPressed("fireFront"),
            fireLeftBroadside: this.isPressed("fireLeftBroadside"),
            fireRightBroadside: this.isPressed("fireRightBroadside"),
        };
    }

    public clear(): void {
        this.pointers.clear();
    }
}
