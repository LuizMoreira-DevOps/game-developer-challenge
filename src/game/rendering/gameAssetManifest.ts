import { islandTileUrls } from "./createIslandVisual";

import waterTileUrl from "../../../assets/png/default/tiles/tile_73.png";

import playerShipUrl from "../../../assets/png/default/ships/ship_2.png";
import chaserShipUrl from "../../../assets/png/default/ships/ship_3.png";
import shooterShipUrl from "../../../assets/png/default/ships/ship_22.png";

import explosionUrl from "../../../assets/png/default/effects/explosion_1.png";

import playerWornUrl from "../../../assets/png/default/ships/ship_8.png";
import playerTornUrl from "../../../assets/png/default/ships/ship_14.png";

import chaserWornUrl from "../../../assets/png/default/ships/ship_9.png";
import chaserTornUrl from "../../../assets/png/default/ships/ship_15.png";

import smallFireUrl from "../../../assets/png/default/effects/fire_2.png";
import largeFireUrl from "../../../assets/png/default/effects/fire_1.png";

export const gameAssetUrls = {
    water: waterTileUrl,
    player: playerShipUrl,
    chaser: chaserShipUrl,
    shooter: shooterShipUrl,
    explosion: explosionUrl,
    playerWorn: playerWornUrl,
    playerTorn: playerTornUrl,
    chaserWorn: chaserWornUrl,
    chaserTorn: chaserTornUrl,
    smallFire: smallFireUrl,
    largeFire: largeFireUrl,
} as const;

export const requiredGameAssetUrls = [
    ...islandTileUrls.flat(),
    ...Object.values(gameAssetUrls),
];
