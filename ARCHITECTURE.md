# Pirate Battle Architecture

## Overview

Pirate Battle separates application UI, game simulation, runtime coordination, and rendering.

The current runtime flow is:

```text
React
  |
  v
PixiGameCanvas
  |
  v
GameRuntime
  |         |
  v         v
Simulation  Renderer
  |         |
  +-----> Snapshot
             |
             v
           PixiJS
```

React is responsible for mounting and unmounting the game surface.
Continuous game updates do not use React state.

## Game Simulation

`GameSimulation` contains game-state rules that do not depend on React or PixiJS.

The simulation receives delta time in seconds:
`update(deltaSeconds)`

This allows simulation behavior to depend on elapsed time instead of frame count.

The current simulation manages:

- elapsed match time
- running state
- paused state
- match duration

Future gameplay rules will build on this simulation boundary.

## Game Runtime

`GameRuntime` coordinates simulation updates and rendering.

For each update:

1. The simulation receives delta time.
2. The simulation state is updated.
3. A snapshot is produced.
4. The renderer receives the snapshot.

The runtime does not contain PixiJS-specific rendering logic.

## Rendering

`PixiGameRenderer` implements the renderer contract used by `GameRuntime`.

PixiJS owns:

- the game canvas
- the stage
- continuously rendered game objects

React does not re-render for every game frame.

The PixiJS ticker provides frame timing, which is converted from milliseconds to seconds before being passed to the runtime.

## React Integration

`PixiGameCanvas` is the lifecycle boundary between React and the game runtime.

React mounts the container.

PixiJS creates and owns the canvas inside that container.

The component handles asynchronous PixiJS initialization safely under React Strict Mode.

Cleanup removes ticker callbacks, stops the runtime, removes the canvas, and destroys PixiJS children.

## Responsive Canvas

The PixiJS application resizes to its container.

Rendering resolution uses the browser device pixel ratio together with automatic density handling.

This keeps the displayed canvas responsive while maintaining an appropriate backing-buffer resolution.

## Gameplay Configuration

Gameplay values are centralized through the typed `GameplayConfig` contract.

The default configuration currently contains:

- match duration
- enemy spawn interval

Future matches will use a configuration snapshot so active gameplay does not change when persisted options are modified.

## Testing

The current test coverage verifies:

- simulation updates using delta time
- paused simulation does not advance
- runtime forwards simulation snapshots to the renderer
- the application renders
- the PixiJS canvas mounts
- only one canvas exists
- device pixel ratio is respected
- the canvas responds to viewport changes

Playwright executes the suite using Chromium desktop and mobile projects.
