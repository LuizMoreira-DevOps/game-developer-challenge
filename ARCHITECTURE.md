# Pirate Battle Architecture

## Overview

Pirate Battle is a single-player naval shooter built with React,
TypeScript, PixiJS, Axios, TanStack Query and MSW.

React owns screens, forms and semantic controls. PixiJS renders
the arena and combat objects. GameSimulation owns gameplay rules.

## Runtime flow

React App
  -> PixiGameCanvas
  -> GameRuntime
  -> GameSimulation + CompositeGameInput
  -> GameSimulationSnapshot
  -> PixiGameRenderer (PixiJS)

The simulation advances using delta time in seconds.
React does not render once per game frame.

## Gameplay

GameSimulation coordinates player movement, weapons, collision
resolution, enemies, projectiles, health, score and match duration.

CombatSystem resolves projectile impacts and damage.
EnemySystem provides Chaser and Shooter behavior.

GameplayConfig centralizes balance values. Each match receives
an immutable configuration snapshot. Options allow durations
from 60 to 180 seconds and spawn intervals from 1 to 30 seconds.

## Rendering and resources

PixiGameCanvas owns PixiJS initialization and teardown.
PixiGameRenderer maintains visual objects corresponding to the
current simulation snapshot.

Assets are loaded before gameplay. Asset failures allow retry
or return to the menu.

Unmounting stops input and simulation, removes ticker callbacks
and canvas resources, and destroys owned render objects.
React Strict Mode initialization and cleanup are supported.

The canvas adjusts to its container and device pixel ratio.

## Input

KeyboardInput and TouchInput feed CompositeGameInput.
Movement and weapons can be activated simultaneously.

Manual pause, loss of focus and tab visibility suspend gameplay.
Resuming requires player interaction.

## Local persistence

Match options, completed results and abandoned match metadata
are stored locally. Reloading or leaving active gameplay abandons
that session without recording a completed match.

## Ranking and history

Axios communicates with REST-shaped mock endpoints.
TanStack Query handles remote-state caching and synchronization.

MSW intercepts requests in development and published builds.
Handlers share typed contracts and fixtures with the application.

Ranking is filtered by match configuration and has deterministic
sorting and pagination.

Completed match submissions use the match ID as an idempotency
key. Pending submissions and confirmation receipts support
retries, refresh and recovery without duplicate records.

Records are stored locally per browser, not in a shared server.
This is intentional because the challenge requires mock APIs.

## Network scenarios

src/mocks/networkScenarios.ts defines reproducible success,
empty, latency, timeout, HTTP error, connection failure and
out-of-order response scenarios.

## Testing and profiling

Playwright tests cover gameplay, lifecycle, API recovery,
desktop/mobile layout and visual regression.

Production profiling collects average FPS, p95 frame time
and peak entity counts.

See docs/SETUP.md and docs/PERFORMANCE.md.

## Known limitations

The ArrowLeft + ArrowUp + Space combination remains tracked
in issue #37. The F key works as an alternative.

60 FPS is the performance target, not a measured achievement.
Further profiling and optimization are planned after deployment.

Challenge-provided assets are used under the terms applicable
to their original distribution.