import type { PlayerMovementInput } from "../core/PlayerState";
import type { GameInput } from "./GameInput";
import type { PlayerWeaponInput } from "./PlayerWeaponInput";

export class CompositeGameInput implements GameInput {
    private readonly inputs: readonly GameInput[];

    public constructor(inputs: readonly GameInput[]) {
        this.inputs = inputs;
    }

    public getMovementInput(): PlayerMovementInput {
        const states = this.inputs.map((input) => input.getMovementInput());

        return {
            forward: states.some((state) => state.forward),
            turnLeft: states.some((state) => state.turnLeft),
            turnRight: states.some((state) => state.turnRight),
        };
    }

    public getWeaponInput(): PlayerWeaponInput {
        const states = this.inputs.map((input) => input.getWeaponInput());

        return {
            fireFront: states.some((state) => state.fireFront),
            fireLeftBroadside: states.some((state) => state.fireLeftBroadside),
            fireRightBroadside: states.some(
                (state) => state.fireRightBroadside,
            ),
        };
    }

    public clear(): void {
        for (const input of this.inputs) {
            input.clear();
        }
    }
}
