import type { Container } from "pixi.js";

import type { GameplayConfig } from "../config/gameplayConfig";

type ArenaDimensions = Pick<GameplayConfig, "arenaWidth" | "arenaHeight">;

export function observeArenaResize(
    target: HTMLElement,
    stage: Container,
    config: Readonly<ArenaDimensions>,
): () => void {
    const resizeArena = (): void => {
        const scale = Math.min(
            target.clientWidth / config.arenaWidth,
            target.clientHeight / config.arenaHeight,
        );

        const renderedWidth = config.arenaWidth * scale;
        const renderedHeight = config.arenaHeight * scale;

        stage.scale.set(scale);

        stage.position.set(
            (target.clientWidth - renderedWidth) / 2,
            (target.clientHeight - renderedHeight) / 2,
        );
    };

    resizeArena();

    const resizeObserver = new ResizeObserver(resizeArena);
    resizeObserver.observe(target);

    return () => {
        resizeObserver.disconnect();
    };
}
