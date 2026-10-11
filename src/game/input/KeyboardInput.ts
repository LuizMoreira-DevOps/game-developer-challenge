import type { PlayerMovementInput } from "../core/PlayerState";
import type { GameInput } from "./GameInput";
import type { PlayerWeaponInput } from "./PlayerWeaponInput";

const FORWARD_KEYS = new Set(["KeyW", "ArrowUp"]);
const LEFT_KEYS = new Set(["KeyA", "ArrowLeft"]);
const RIGHT_KEYS = new Set(["KeyD", "ArrowRight"]);
const BACKWARD_KEYS = new Set(["KeyS", "ArrowDown"]);

const FIRE_FRONT_KEYS = new Set(["Space", "KeyF"]);
const FIRE_LEFT_BROADSIDE_KEYS = new Set(["KeyQ"]);
const FIRE_RIGHT_BROADSIDE_KEYS = new Set(["KeyE"]);

export class KeyboardInput implements GameInput {
    private readonly pressedKeys = new Set<string>();
    private target: Window | null = null;

    private readonly handleKeyDown = (event: KeyboardEvent): void => {
        if (!this.isHandledKey(event.code)) {
            return;
        }

        event.preventDefault();
        this.pressedKeys.add(event.code);
    };

    private readonly handleKeyUp = (event: KeyboardEvent): void => {
        if (!this.isHandledKey(event.code)) {
            return;
        }

        event.preventDefault();
        this.pressedKeys.delete(event.code);
    };

    private readonly handleBlur = (): void => {
        this.clear();
    };

    public start(target: Window = window): void {
        if (this.target) {
            return;
        }

        this.target = target;

        target.addEventListener("keydown", this.handleKeyDown);

        target.addEventListener("keyup", this.handleKeyUp);

        target.addEventListener("blur", this.handleBlur);
    }

    public stop(): void {
        if (!this.target) {
            return;
        }

        this.target.removeEventListener("keydown", this.handleKeyDown);

        this.target.removeEventListener("keyup", this.handleKeyUp);

        this.target.removeEventListener("blur", this.handleBlur);

        this.target = null;
        this.clear();
    }

    public clear(): void {
        this.pressedKeys.clear();
    }

    public getMovementInput(): PlayerMovementInput {
        return {
            forward: this.hasAnyPressed(FORWARD_KEYS),
            turnLeft: this.hasAnyPressed(LEFT_KEYS),
            turnRight: this.hasAnyPressed(RIGHT_KEYS),
        };
    }

    public getWeaponInput(): PlayerWeaponInput {
        return {
            fireFront: this.hasAnyPressed(FIRE_FRONT_KEYS),

            fireLeftBroadside: this.hasAnyPressed(FIRE_LEFT_BROADSIDE_KEYS),

            fireRightBroadside: this.hasAnyPressed(FIRE_RIGHT_BROADSIDE_KEYS),
        };
    }

    private hasAnyPressed(keys: ReadonlySet<string>): boolean {
        return [...keys].some((key) => this.pressedKeys.has(key));
    }

    private isHandledKey(code: string): boolean {
        return (
            FORWARD_KEYS.has(code) ||
            LEFT_KEYS.has(code) ||
            RIGHT_KEYS.has(code) ||
            BACKWARD_KEYS.has(code) ||
            FIRE_FRONT_KEYS.has(code) ||
            FIRE_LEFT_BROADSIDE_KEYS.has(code) ||
            FIRE_RIGHT_BROADSIDE_KEYS.has(code)
        );
    }
}
