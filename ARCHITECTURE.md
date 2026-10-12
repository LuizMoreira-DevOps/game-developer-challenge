# Pirate Battle Architecture

## 1. Overview

Pirate Battle is a browser-based, single-player naval shooter built with React, TypeScript, PixiJS, Axios, TanStack Query and Mock Service Worker (MSW).

The architecture separates the gameplay simulation from rendering, input, React UI, local persistence and REST-shaped data integration.

The application does not require a private backend or database.

### Technology responsibilities

| Layer          | Technology                | Responsibility                                |
| -------------- | ------------------------- | --------------------------------------------- |
| Application UI | React                     | Screens, forms, HUD, dialogs and navigation   |
| Domain model   | TypeScript                | Gameplay rules and data contracts             |
| Rendering      | PixiJS                    | Ocean, island, ships, projectiles and effects |
| Input          | KeyboardInput, TouchInput | Player commands                               |
| HTTP           | Axios                     | Mock API communication                        |
| Remote state   | TanStack Query            | Queries, mutations, caching and invalidation  |
| Mock server    | MSW                       | Ranking/history REST endpoints                |
| Persistence    | localStorage              | Options, identity, results and mock records   |
| Tests          | Playwright                | E2E, visual regression and profiling          |

## 2. Runtime composition

The main gameplay data flow is:

```text
React App
  |
  +-- Match options and local persistence
  |
  +-- PixiGameCanvas
        |
        +-- PixiJS Application + ticker
        |
        +-- CompositeGameInput
        |     +-- KeyboardInput
        |     +-- TouchInput
        |
        +-- GameRuntime
        |     +-- GameSimulation
        |           +-- Player movement
        |           +-- Weapon cooldowns
        |           +-- CombatSystem
        |           +-- EnemySystem
        |           +-- Spawn scheduling
        |
        +-- GameSimulationSnapshot
        |
        +-- PixiGameRenderer
              +-- Player and enemy sprites
              +-- Health indicators
              +-- Projectiles and effects
```

React owns application navigation and semantic UI elements.

GameSimulation owns the authoritative combat state.

PixiGameRenderer translates simulation snapshots into PixiJS display objects.

React is not used to render every combat frame. The HUD updates when its displayed values change, such as health, score, whole seconds remaining or match state.

## 3. Simulation lifecycle

GameRuntime provides the interface between input, GameSimulation and GameRenderer.

Its principal operations are:

- `start()`: clear input and initialize a new simulation.
- `update(deltaSeconds)`: read input, advance the simulation, obtain a snapshot and render it.
- `pause()`: clear input and suspend simulation advancement.
- `resume()`: clear input and allow advancement again.
- `stop()`: clear input and end simulation execution.

The PixiJS ticker supplies elapsed time in milliseconds. PixiGameCanvas converts it into seconds before calling GameRuntime.

GameSimulation uses elapsed seconds for movement, cooldowns, projectile travel, enemy spawning and match duration.

A simulation update executes the following operations:

1. Validate elapsed time and determine the active simulation step.
2. Move and rotate the player.
3. Resolve the player's overlap with the island.
4. Advance weapon cooldowns and process player attacks.
5. Resolve projectile travel, impacts, damage and kills.
6. Stop immediately if the player is destroyed or match time expires.
7. Advance surviving enemies and process their attacks.
8. Apply Chaser collision damage.
9. Add enemy projectiles.
10. Generate scheduled enemies.

The remaining match duration is clamped to zero.

After a match ends, gameplay systems stop advancing and a completion snapshot is sent to React.

### Match reset

Starting another match creates a new session and config snapshot.

A simulation reset restores:

- Player health and starting position.
- Score and timer.
- Weapon cooldowns.
- Enemy and projectile collections.
- Entity ID counters.
- Spawn scheduling.
- Running and paused state.

React uses the session ID to identify the PixiGameCanvas instance for each match.

## 4. Gameplay configuration and balance

The typed `GameplayConfig` interface and default values are defined in:

`src/game/config/gameplayConfig.ts`

Important default values include:

| Parameter                  |                Default |
| -------------------------- | ---------------------: |
| Match duration             |             90 seconds |
| Spawn interval             |              5 seconds |
| Arena dimensions           | 1280 x 720 world units |
| Player movement speed      |       180 units/second |
| Player rotation speed      |      PI radians/second |
| Player health              |                    100 |
| Front cannon cooldown      |            0.4 seconds |
| Broadside cooldown         |            1.2 seconds |
| Broadside projectile count |                      3 |
| Projectile speed           |       520 units/second |
| Projectile lifetime        |            1.5 seconds |
| Projectile damage          |                     25 |
| Chaser health              |                     50 |
| Shooter health             |                     75 |
| Chaser speed               |       110 units/second |
| Shooter speed              |        85 units/second |
| Shooter attack range       |              260 units |
| Shooter attack cooldown    |            1.5 seconds |
| Enemy projectile damage    |                     10 |
| Chaser collision damage    |                     25 |

The Options screen exposes match duration (60â€“180 seconds) and spawn interval (1â€“30 seconds).

`createMatchSession()` combines these values with the default gameplay configuration and freezes the resulting configuration snapshot.

This ensures that an active match does not change when saved options are modified for a future match.

### Balance decisions

- The front cannon launches one projectile.
- Each broadside launches three projectiles.
- Broadside cooldowns are longer than the front cannon cooldown.
- Chasers prioritize pursuit and impact damage.
- Shooters use slower movement and ranged attacks.
- The two enemy types alternate after successful spawns.
- A player-caused enemy kill awards one point.
- A Chaser destroyed by collision with the player awards no point.

These parameters provide a simple, predictable baseline rather than an adaptive difficulty system.

### Spawn placement

EnemySystem samples candidate positions within the arena and rejects positions that:

- Fall outside the allowed enemy radius.
- Overlap the island.
- Fall within the minimum safe distance of the player.

The spawn routine allows up to 100 attempts before returning no enemy.

The implementation uses injected randomness for deterministic simulation tests. `enemySpawnDistribution` selects `uniform` (the unchanged default sampler) or `perimeter` (rejection sampling within a border band covering 10% of the smaller usable arena dimension). Both use the same island, arena and player-distance validation and the same 100-attempt limit. This configuration is code-only; the Options screen still exposes two fields.

## 5. Movement and collision detection

Player movement and rotation are resolved by `updatePlayerMovement`.

The arena has explicit world dimensions and a central island collider.

### Ship/island overlap

`resolveCircleOverlap` separates circular collision shapes. It is used to prevent the player and enemies from occupying the island.

The collision geometry is intentionally simpler than the visual silhouettes.

### Projectile impacts

`CombatSystem` performs segment-to-circle intersection tests between a projectile's previous and next position.

This reduces the risk of projectiles passing through a target when the simulation step is relatively large.

Potential targets include:

- The island.
- Enemy ships for player-owned projectiles.
- The player for enemy-owned projectiles.

A projectile is consumed by its first relevant impact and therefore cannot apply repeated damage after collision.

Projectiles are also removed when their lifetime expires or their position leaves the arena.

Destroyed enemies are filtered from the active simulation and stop moving, shooting and participating in collision resolution.

### Known geometry limitation

The current simulation contains one blocking island.

Additional visible islands should not be introduced as solid gameplay terrain without corresponding collision geometry and spawn validation.

## 6. Enemy behavior

`EnemySystem` implements two enemy types.

### Chaser

The Chaser rotates toward the player and advances to close the distance.

Its collision with the player causes configured impact damage and destroys the Chaser without awarding player score.

### Shooter

The Shooter rotates toward the player, approaches its engagement range and launches enemy projectiles according to its cooldown.

Both enemy types:

- Have finite health.
- Rotate using time-based steps.
- Respect arena and island collision constraints.
- Are removed when destroyed.
- Participate only while the match is active.

## 7. Input and pause behavior

The application combines independent input providers using `CompositeGameInput`.

### KeyboardInput

Supported commands:

| Input          | Action          |
| -------------- | --------------- |
| W / ArrowUp    | Forward         |
| A / ArrowLeft  | Turn left       |
| D / ArrowRight | Turn right      |
| Space / F      | Front cannon    |
| Q              | Left broadside  |
| E              | Right broadside |

Keyboard state is represented by a set of active key codes.

### TouchInput

TouchControls sends movement and weapon input to TouchInput.

Controls are intended to support simultaneous movement and attacks.

Input state is cleared when the game pauses or stops.

### Pause lifecycle

Gameplay pauses when:

- The player requests pause.
- The browser window loses focus.
- The page becomes hidden.

During pause, the simulation does not advance, and elapsed match time and cooldowns do not accumulate.

Resuming requires a player action. The game must not automatically restart after the tab becomes visible.

Known keyboard limitation: issue #37 tracks a problematic ArrowLeft + ArrowUp + Space combination.

## 8. PixiJS rendering

`PixiGameCanvas.tsx` owns PixiJS application initialization and teardown.

`PixiGameRenderer.ts` translates the current GameSimulationSnapshot into visual objects.

Visual elements include:

- Tiled animated ocean.
- Central island assembled from tile sprites.
- Player ship.
- Distinct Chaser and Shooter ship textures.
- Player and enemy projectiles.
- Ship health bars.
- Damage flashes and explosion effects.

The renderer maintains maps keyed by entity ID so visual objects can be reused while an entity remains alive.

When an entity leaves the simulation, its corresponding visual object is removed and destroyed.

Temporary explosion sprites are destroyed after their defined lifetime.

### Asset loading

PixiGameCanvas loads required textures before starting gameplay.

It displays progress, handles failures and offers retry or return-to-menu actions.

PixiJS Assets manages texture loading and reuse.

### Resize and DPR

The renderer initializes with the browser device pixel ratio and uses PixiJS auto-density.

A ResizeObserver responds to container changes. Stage scaling is derived from the relationship between CSS viewport size and the fixed simulation world dimensions.

The intended behavior is to preserve world proportions rather than stretch ships, islands or collision geometry.

Responsive layout and input coordinate mapping are covered by Playwright tests.

The current implementation uses a fixed 1280 x 720 simulation world. On viewports with different proportions, the visible world may be centered with unused surrounding space depending on the renderer and CSS configuration.

Portrait and landscape are both target layouts. The mobile accessibility test covers 390 Ã— 740, 740 Ã— 390 and 320 Ã— 568 in one match. Browser/device validation is still pending; neither orientation is declared verified by this change. See [ACCESSIBILITY.md](ACCESSIBILITY.md). Dynamic devicePixelRatio changes after initialization require additional device-level verification.

## 9. Resource lifecycle

A gameplay instance is responsible for the resources it creates.

Cleanup includes:

- Removing ticker callbacks.
- Disconnecting ResizeObserver.
- Stopping keyboard listeners.
- Clearing touch state.
- Removing blur and visibility handlers.
- Stopping the runtime.
- Destroying owned visual objects.
- Destroying the PixiJS application and canvas.
- Clearing renderer-managed entity maps and temporary effects.

Initialization checks for an already-disposed component during asynchronous operations.

A cleanup guard avoids executing the same runtime cleanup more than once.

These decisions support React Strict Mode and repeated game entry/exit cycles.

Cleanup is verified by Playwright lifecycle tests, but zero remaining canvases alone does not establish the absence of every possible memory or GPU-resource leak.

## 10. Local persistence

Match-related data is stored in localStorage.

### Storage keys

| Key                                       | Purpose                       |
| ----------------------------------------- | ----------------------------- |
| `pirate-battle:options:v1`                | Saved gameplay options        |
| `pirate-battle:active-match:v1`           | Active session metadata       |
| `pirate-battle:last-completed:v1`         | Last completed match          |
| `pirate-battle:last-abandoned:v1`         | Last abandoned session        |
| `pirate-battle:player:v1`                 | Browser-local player identity |
| `pirate-battle:pending-matches:v1`        | Pending submissions           |
| `pirate-battle:submission-receipts:v1`    | Confirmed match IDs           |
| `pirate-battle:mock-confirmed-matches:v1` | Confirmed mock API records    |
| `pirate-battle:mock-scenario:v1`          | Selected network scenario     |

Saved options are validated on reading. Invalid or corrupted values fall back to supported defaults where the implementation defines a fallback.

### Match completion and abandonment

A completed match is recorded only after the simulation has ended with a valid end reason.

Completion persists the result and clears the active session metadata.

Leaving an active match or reloading the application marks that session as abandoned.

Abandoned matches are not submitted to Ranking or Match History.

## 11. Ranking and Match History integration

### REST-shaped API

The typed contracts are defined in:

`src/game/api/contracts.ts`

Supported endpoints:

| Method | Endpoint       | Description            |
| ------ | -------------- | ---------------------- |
| GET    | `/api/ranking` | Paged Ranking          |
| GET    | `/api/matches` | Paged player History   |
| POST   | `/api/matches` | Submit completed match |

The request base path comes from Vite's `BASE_URL`, allowing the same API layer to operate under the GitHub Pages subdirectory.

Axios uses a 6000 ms request timeout.

### MatchRecord contract

A completed record contains:

- matchId
- playerId
- playerName
- score
- elapsedSeconds
- endReason
- matchDurationSeconds
- enemySpawnIntervalSeconds
- rulesetVersion
- startedAt
- finishedAt

The current ruleset version is `"1"`.

The POST request supplies the match ID through the `Idempotency-Key` header.

### Pagination and ranking order

The current screens use five records per page.

Ranking is filtered by:

- Match duration.
- Enemy spawn interval.
- Ruleset version.

Ranking order is deterministic:

1. Higher score first.
2. Lower elapsed time first.
3. Earlier completion timestamp first.
4. Lexicographically smaller match ID first.

History is filtered by playerId and sorted by the most recent completion timestamp first, with match ID as a tie-breaker.

The current player's entries can be highlighted using their player ID.

### TanStack Query cache

The QueryClient uses:

- `staleTime`: 15 seconds.
- Query retries for selected transient failures.
- Exponential retry delays up to 1500 ms.
- No automatic refetch on window focus.

Ranking cache keys include configuration, ruleset version and page.

History cache keys include player ID and page.

Both screens request fresh data on mount.

Axios receives query AbortSignals so canceled queries can stop their corresponding HTTP requests.

### Query error behavior

The UI distinguishes:

- Initial loading.
- Empty results.
- Refreshing in the background.
- Request failure.
- Cached results remaining available when a refresh fails.

MSW API failures do not stop gameplay or options navigation.

## 12. Submission idempotency and recovery

`usePendingMatchSync` coordinates submissions using TanStack Query mutations.

A completed match is first stored in the pending queue.

The submission process sends the record using its original match ID.

### Successful submission

When the server-shaped response confirms the same match ID:

1. A local confirmation receipt is written.
2. The matching pending record is removed.
3. Pending-count state is updated.
4. Ranking and History queries are invalidated.

This order protects against losing confirmation data during refresh.

### Retry behavior

The mutation does not use automatic TanStack Query mutation retries.

Recovery is explicitly coordinated by the pending-sync logic.

Pending records are retried:

- During application initialization.
- On the browser `online` event.
- When a hidden page becomes visible.
- Every 30 seconds while the page is visible and pending records exist.
- When the player uses the Retry action.

An in-flight synchronization guard prevents overlapping queue processing and requests another pass when needed.

### Idempotency

The mock repository indexes persisted records by matchId.

Submitting an identical record again returns the existing record with `created: false`.

Submitting the same matchId with conflicting data results in HTTP 409.

The `post-timeout-after-save` scenario confirms that a response can fail after storage without creating duplicate records on retry.

Pending submissions do not block starting another game.

## 13. Mock Service Worker

MSW intercepts ranking and history requests at the network layer.

The mock service worker starts during application bootstrap and is configured using Vite's BASE_URL.

This is necessary for GitHub Pages deployment under `/game-developer-challenge/`.

### Repository model

The mock repository combines:

- Deterministic fixture records.
- Confirmed browser-local records.

The mock API is not a shared production service.

Different browsers or cleared storage may display different history data.

### Network scenarios

`src/mocks/networkScenarios.ts` defines:

- `success`
- `empty`
- `latency`
- `out-of-order`
- `timeout`
- `network-error`
- `http-400`
- `http-500`
- `ranking-error`
- `history-error`
- `offline`
- `post-timeout-after-save`

Scenarios are selected through a localStorage key and are read by the handlers.

The latency and out-of-order scenarios currently use fixed delays, making them repeatable but not equivalent to arbitrary network jitter.

See [docs/SETUP.md](docs/SETUP.md) for reproduction commands.

## 14. Testing

The main Playwright configuration includes:

- Desktop Chromium.
- Mobile Chromium.
- Automated Vite development server.
- HTML reporting.
- Traces on the first retry.
- Visual baselines stored in the repository.

The E2E suite covers gameplay, navigation, persistence, network failure recovery, input, responsiveness, lifecycle and visual regression.

Deterministic simulation tests use controllable randomness and time where needed.

Performance testing uses a separate Playwright configuration.

Test files are organized under:

- `tests/e2e/`
- `tests/performance/`

See [docs/PERFORMANCE.md](docs/PERFORMANCE.md).

## 15. Performance and profiling

The project targets 60 FPS, but previously recorded profiling runs did not reach that target.

Instrumentation records:

- Active gameplay time.
- Frames and average FPS.
- P95 frame time.
- Entity counts.
- Projectile counts.

The five-match lifecycle test samples JavaScript heap and confirms canvas cleanup after each completed match.

Performance metrics are observational and depend on the browser, hardware, workload and rendering revision.

A new profiling run is required after material visual changes.

## 16. Known limitations and future work

- Issue #37: ArrowLeft + ArrowUp + Space input behavior.
- 60 FPS remains an optimization target.
- Historic profiling lacks recorded CPU, GPU and exact display resolution.
- The current simulation has one blocking island.
- Enemy spawn distribution is configured in code; the Options screen exposes only duration and spawn interval.
- The mock API persists per browser rather than using a shared server.
- `latency-variable` uses a deterministic 200â€“1,200 ms sequence with fixed seed 42. Replay requires the same request order; concurrent arrival order is not guaranteed.
- Some accessibility details, including dialog focus behavior, require further validation.
- Mobile orientation verification is tracked in [ACCESSIBILITY.md](ACCESSIBILITY.md); dynamic DPR verification is still needed.
- Browser-local mock data does not provide cross-device consistency.
- Asset licensing must be confirmed for redistribution beyond the supplied challenge context.
- CI artifact publication is a separate delivery concern until configured.

## 17. Supporting documentation

- [README.md](README.md): project overview, setup, controls, environment variables, network failures and commands.
- [docs/SETUP.md](docs/SETUP.md): setup, troubleshooting and deployment operations.
- [docs/PERFORMANCE.md](docs/PERFORMANCE.md): recorded profiling evidence and limitations.
- [README.CHALLENGE.md](README.CHALLENGE.md): original technical challenge specification, preserved without changes.
- [AGENTS.md](AGENTS.md): project engineering conventions.
