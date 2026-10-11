import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type PointerEvent as ReactPointerEvent,
    type RefObject,
} from "react";

import type { TouchAction, TouchInput } from "../input/TouchInput";

interface TouchControlsProps {
    inputRef: RefObject<TouchInput | null>;
    disabled: boolean;
}

interface TouchButtonProps extends TouchControlsProps {
    action: TouchAction;
    label: string;
    text: string;
}

interface ButtonConfig {
    action: TouchAction;
    label: string;
    text: string;
}

const movementButtons: readonly ButtonConfig[] = [
    {
        action: "turnLeft",
        label: "Rotate left",
        text: "↶ Left",
    },
    {
        action: "forward",
        label: "Move forward",
        text: "↑ Forward",
    },
    {
        action: "turnRight",
        label: "Rotate right",
        text: "↷ Right",
    },
];

const weaponButtons: readonly ButtonConfig[] = [
    {
        action: "fireLeftBroadside",
        label: "Fire left broadside",
        text: "Left cannons",
    },
    {
        action: "fireFront",
        label: "Fire front cannon",
        text: "Front cannon",
    },
    {
        action: "fireRightBroadside",
        label: "Fire right broadside",
        text: "Right cannons",
    },
];

function TouchButton({
    inputRef,
    disabled,
    action,
    label,
    text,
}: TouchButtonProps) {
    const activePointerIds = useRef(new Set<number>());
    const [pressed, setPressed] = useState(false);

    const releasePointer = useCallback(
        (pointerId: number) => {
            if (!activePointerIds.current.delete(pointerId)) {
                return;
            }

            inputRef.current?.release(pointerId);
            setPressed(activePointerIds.current.size > 0);
        },
        [inputRef],
    );

    useEffect(() => {
        const handlePointerEnd = (event: PointerEvent) => {
            releasePointer(event.pointerId);
        };

        window.addEventListener("pointerup", handlePointerEnd);
        window.addEventListener("pointercancel", handlePointerEnd);

        return () => {
            window.removeEventListener("pointerup", handlePointerEnd);
            window.removeEventListener("pointercancel", handlePointerEnd);
        };
    }, [releasePointer]);

    const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
        if (
            disabled ||
            !inputRef.current ||
            (event.pointerType === "mouse" && event.button !== 0)
        ) {
            return;
        }

        event.preventDefault();

        const pointerId = event.pointerId;

        activePointerIds.current.add(pointerId);
        inputRef.current.press(action, pointerId);

        event.currentTarget.setPointerCapture(pointerId);

        setPressed(true);
    };

    const handlePointerEnd = (event: ReactPointerEvent<HTMLButtonElement>) => {
        releasePointer(event.pointerId);
    };

    return (
        <button
            type="button"
            className="touch-control"
            aria-label={label}
            data-pressed={!disabled && pressed}
            disabled={disabled}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            onLostPointerCapture={handlePointerEnd}
            onContextMenu={(event) => event.preventDefault()}
        >
            {text}
        </button>
    );
}

export function TouchControls({ inputRef, disabled }: TouchControlsProps) {
    return (
        <nav
            className="touch-controls"
            aria-label="Touch gameplay controls"
            data-testid="touch-controls"
        >
            <div
                className="touch-controls-group"
                role="group"
                aria-label="Movement controls"
            >
                {movementButtons.map((button) => (
                    <TouchButton
                        key={`${button.action}-${disabled}`}
                        {...button}
                        inputRef={inputRef}
                        disabled={disabled}
                    />
                ))}
            </div>

            <div
                className="touch-controls-group"
                role="group"
                aria-label="Weapon controls"
            >
                {weaponButtons.map((button) => (
                    <TouchButton
                        key={`${button.action}-${disabled}`}
                        {...button}
                        inputRef={inputRef}
                        disabled={disabled}
                    />
                ))}
            </div>
        </nav>
    );
}
