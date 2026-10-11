import { expect, test } from "@playwright/test";

import { KeyboardInput } from "../../src/game/input/KeyboardInput";

class FakeWindow {
    private readonly listeners = new Map<
        string,
        Set<(event: KeyboardEvent) => void>
    >();

    public addEventListener(
        type: string,
        listener: (event: KeyboardEvent) => void,
    ): void {
        const listeners = this.listeners.get(type) ?? new Set();

        listeners.add(listener);
        this.listeners.set(type, listeners);
    }

    public removeEventListener(
        type: string,
        listener: (event: KeyboardEvent) => void,
    ): void {
        this.listeners.get(type)?.delete(listener);
    }

    public dispatchKey(type: "keydown" | "keyup", code: string): void {
        const event = {
            code,
            preventDefault: () => undefined,
        } as KeyboardEvent;

        for (const listener of this.listeners.get(type) ?? []) {
            listener(event);
        }
    }
}

test("stops listening and clears pressed keys", () => {
    const keyboard = new KeyboardInput();
    const target = new FakeWindow();

    keyboard.start(target as unknown as Window);

    target.dispatchKey("keydown", "KeyW");

    expect(keyboard.getMovementInput().forward).toBe(true);

    keyboard.stop();

    expect(keyboard.getMovementInput().forward).toBe(false);

    target.dispatchKey("keydown", "KeyW");

    expect(keyboard.getMovementInput().forward).toBe(false);
});
