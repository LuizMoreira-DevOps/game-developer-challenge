import { Assets, Container, Sprite } from "pixi.js";

import tile6Url from "../../../assets/png/default/tiles/tile_6.png";
import tile7Url from "../../../assets/png/default/tiles/tile_7.png";
import tile8Url from "../../../assets/png/default/tiles/tile_8.png";
import tile9Url from "../../../assets/png/default/tiles/tile_9.png";

import tile22Url from "../../../assets/png/default/tiles/tile_22.png";
import tile23Url from "../../../assets/png/default/tiles/tile_23.png";
import tile24Url from "../../../assets/png/default/tiles/tile_24.png";
import tile25Url from "../../../assets/png/default/tiles/tile_25.png";

import tile38Url from "../../../assets/png/default/tiles/tile_38.png";
import tile39Url from "../../../assets/png/default/tiles/tile_39.png";
import tile40Url from "../../../assets/png/default/tiles/tile_40.png";
import tile41Url from "../../../assets/png/default/tiles/tile_41.png";

import tile54Url from "../../../assets/png/default/tiles/tile_54.png";
import tile55Url from "../../../assets/png/default/tiles/tile_55.png";
import tile56Url from "../../../assets/png/default/tiles/tile_56.png";
import tile57Url from "../../../assets/png/default/tiles/tile_57.png";

const TILE_SIZE = 64;
const ISLAND_SCALE = 0.75;

const islandTileUrls = [
    [tile6Url, tile7Url, tile8Url, tile9Url],
    [tile22Url, tile23Url, tile24Url, tile25Url],
    [tile38Url, tile39Url, tile40Url, tile41Url],
    [tile54Url, tile55Url, tile56Url, tile57Url],
];

export async function createIslandVisual(): Promise<Container> {
    const container = new Container();

    const columns = islandTileUrls[0].length;
    const urls = islandTileUrls.flat();

    // Load all island textures concurrently.
    const textures = await Promise.all(urls.map((url) => Assets.load(url)));

    // Preserve the original tile order and positions.
    textures.forEach((texture, index) => {
        const row = Math.floor(index / columns);
        const column = index % columns;

        const sprite = new Sprite(texture);

        sprite.x = column * TILE_SIZE;
        sprite.y = row * TILE_SIZE;

        container.addChild(sprite);
    });

    const islandSize = TILE_SIZE * columns;

    container.pivot.set(islandSize / 2, islandSize / 2);

    container.scale.set(ISLAND_SCALE);

    return container;
}
