import type { PlayerMovementInput } from "../core/PlayerState";
import type { GameInput } from "./GameInput";

const FORWARD_KEYS = new Set(["KeyW", "ArrowUp"]);

const LEFT_KEYS = new Set(["KeyA", "ArrowLeft"]);

const RIGHT_KEYS = new Set(["KeyD", "ArrowRight"]);

const BACKWARD_KEYS = new Set(["KeyS", "ArrowDown"]);

export class KeyboardInput implements GameInput {
    private readonly pressedKeys = new Set<string>();
    private target: Window | null = null;

    private readonly handleKeyDown = (event: KeyboardEvent): void => {
        if (!this.isMovementKey(event.code)) {
            return;
        }

        event.preventDefault();
        this.pressedKeys.add(event.code);
    };

    private readonly handleKeyUp = (event: KeyboardEvent): void => {
        if (!this.isMovementKey(event.code)) {
            return;
        }

        event.preventDefault();
        this.pressedKeys.delete(event.code);
    };

    public start(target: Window = window): void {
        if (this.target) {
            return;
        }

        this.target = target;

        target.addEventListener("keydown", this.handleKeyDown);
        target.addEventListener("keyup", this.handleKeyUp);
    }

    public stop(): void {
        if (!this.target) {
            return;
        }

        this.target.removeEventListener("keydown", this.handleKeyDown);

        this.target.removeEventListener("keyup", this.handleKeyUp);

        this.target = null;
        this.pressedKeys.clear();
    }

    public getMovementInput(): PlayerMovementInput {
        return {
            forward: this.hasAnyPressed(FORWARD_KEYS),
            turnLeft: this.hasAnyPressed(LEFT_KEYS),
            turnRight: this.hasAnyPressed(RIGHT_KEYS),
        };
    }

    private hasAnyPressed(keys: ReadonlySet<string>): boolean {
        return [...keys].some((key) => this.pressedKeys.has(key));
    }

    private isMovementKey(code: string): boolean {
        return (
            FORWARD_KEYS.has(code) ||
            LEFT_KEYS.has(code) ||
            RIGHT_KEYS.has(code) ||
            BACKWARD_KEYS.has(code)
        );
    }
}
