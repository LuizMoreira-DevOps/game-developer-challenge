import { Assets, Container, Sprite, TilingSprite } from "pixi.js";

import type { GameplayConfig } from "../config/gameplayConfig";
import { createIslandVisual } from "./createIslandVisual";
import { gameAssetUrls } from "./gameAssetManifest";

export async function createGameScene(
    stage: Container,
    config: Readonly<GameplayConfig>,
    isDisposed: () => boolean,
) {
    const waterTexture = await Assets.load(gameAssetUrls.water);

    if (isDisposed()) {
        return null;
    }

    const islandVisual = await createIslandVisual();

    if (isDisposed()) {
        islandVisual.destroy({ children: true });
        return null;
    }

    let textures;

    try {
        textures = await Promise.all([
            Assets.load(gameAssetUrls.player),
            Assets.load(gameAssetUrls.chaser),
            Assets.load(gameAssetUrls.shooter),
            Assets.load(gameAssetUrls.explosion),
            Assets.load(gameAssetUrls.playerWorn),
            Assets.load(gameAssetUrls.playerTorn),
            Assets.load(gameAssetUrls.chaserWorn),
            Assets.load(gameAssetUrls.chaserTorn),
            Assets.load(gameAssetUrls.smallFire),
            Assets.load(gameAssetUrls.largeFire),
        ]);
    } catch (error) {
        islandVisual.destroy({ children: true });
        throw error;
    }

    if (isDisposed()) {
        islandVisual.destroy({ children: true });
        return null;
    }

    const [
        playerTexture,
        chaserTexture,
        shooterTexture,
        explosionTexture,
        playerWornTexture,
        playerTornTexture,
        chaserWornTexture,
        chaserTornTexture,
        smallFireTexture,
        largeFireTexture,
    ] = textures;

    const sea = new TilingSprite({
        texture: waterTexture,
        width: config.arenaWidth,
        height: config.arenaHeight,
    });

    const projectileLayer = new Container();
    const enemyLayer = new Container();

    const playerSprite = new Sprite(playerTexture);
    playerSprite.anchor.set(0.5);

    // Preserve the original display order.
    stage.addChild(
        sea,
        islandVisual,
        projectileLayer,
        enemyLayer,
        playerSprite,
    );

    return {
        sea,
        islandVisual,
        projectileLayer,
        enemyLayer,
        playerSprite,
        chaserTexture,
        shooterTexture,
        explosionTexture,
        damageTextures: {
            player: [playerWornTexture, playerTornTexture] as const,
            chaser: [chaserWornTexture, chaserTornTexture] as const,
            smallFire: smallFireTexture,
            largeFire: largeFireTexture,
        },
    };
}
