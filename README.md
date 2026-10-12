# Pirate Battle

A single-player, top-down naval shooter built with React, TypeScript and PixiJS.

Navigate the arena, avoid an island, fight enemy ships and earn points before the match timer expires or your ship is destroyed.

**Live game:** https://luizmoreira-devops.github.io/game-developer-challenge/

**Original technical challenge:** [README.CHALLENGE.md](README.CHALLENGE.md)

## Features

- Real-time naval combat with keyboard and touch input.
- Front cannon and left/right three-projectile broadsides.
- Chaser enemies that pursue and collide with the player.
- Shooter enemies that approach and fire projectiles.
- Collision detection for ships, projectiles and the island.
- Configurable match duration and enemy spawn interval.
- Manual pause and automatic pause on focus or visibility loss.
- Local match persistence and recovery of pending submissions.
- Paginated Ranking and Match History with simulated REST APIs.
- Reproducible network failure scenarios using MSW.
- Desktop/mobile Playwright tests and visual regression baselines.

## Technology stack

| Responsibility             | Technology              |
| -------------------------- | ----------------------- |
| Application UI             | React 19                |
| Language                   | TypeScript, strict mode |
| Gameplay rendering         | PixiJS 8                |
| HTTP client                | Axios                   |
| Remote state and mutations | TanStack Query 5        |
| Mock REST APIs             | MSW 3                   |
| E2E and visual tests       | Playwright              |
| Development and build      | Vite 8                  |
| Code quality               | ESLint and TypeScript   |
| Deployment                 | GitHub Pages            |

## Requirements

- Node.js 24
- npm
- A modern browser with JavaScript and canvas support

No private backend, API key, account or database is required.

## Quick start

Clone the repository and install its locked dependencies:

```bash
git clone https://github.com/LuizMoreira-DevOps/game-developer-challenge.git
cd game-developer-challenge

npm ci
npm run dev
```

Open http://localhost:5173/.

For the exact address reported by Vite, consult the terminal output.

## Available commands

| Command                      | Purpose                                |
| ---------------------------- | -------------------------------------- |
| `npm run dev`                | Start the Vite development server      |
| `npm run build`              | Type-check and build production assets |
| `npm run preview`            | Preview the production build           |
| `npm run lint`               | Run ESLint                             |
| `npm run typecheck`          | Run TypeScript project checks          |
| `npm run test:e2e`           | Run the Playwright E2E suite           |
| `npx playwright show-report` | Open the latest E2E HTML report        |

Install Playwright's Chromium browser before running tests on a clean machine:

```bash
npx playwright install chromium
```

On a Linux CI environment, browser system dependencies can be installed with:

```bash
npx playwright install --with-deps chromium
```

### Production preview

```bash
npm run build
npm run preview
```

The production preview uses Vite's default local preview address unless another port is supplied.

### GitHub Pages build

The deployment workflow uses the repository base path:

```bash
npm run build -- --base=/game-developer-challenge/
```

Do not use that base path for an ordinary root-level localhost preview unless the preview server is configured accordingly.

## Game controls

| Action               | Keyboard            |
| -------------------- | ------------------- |
| Move forward         | `W` or `ArrowUp`    |
| Rotate left          | `A` or `ArrowLeft`  |
| Rotate right         | `D` or `ArrowRight` |
| Fire front cannon    | `Space` or `F`      |
| Fire left broadside  | `Q`                 |
| Fire right broadside | `E`                 |

Movement and weapons are designed to work simultaneously.

The gameplay interface also provides touch controls for movement, rotation and firing. Pause and Home controls are available in the HUD.

**Known input limitation:** the `ArrowLeft + ArrowUp + Space` combination remains tracked in [issue #37](https://github.com/LuizMoreira-DevOps/game-developer-challenge/issues/37). Use `F` as the front cannon alternative when affected.

## Match rules

- Destroying an enemy with player attacks earns **1 point**.
- A Chaser that destroys itself by colliding with the player does not earn a point.
- The match ends when the timer expires or player health reaches zero.
- The island blocks ship movement and projectiles.
- Every projectile applies damage at most once.
- Cooldowns, timers, movement and spawning use simulation delta time.
- Pausing suspends the simulation.
- Restarting creates a new match with restored game state.

## Options and gameplay configuration

The Options screen exposes:

| Option               |    Default |  Supported range |
| -------------------- | ---------: | ---------------: |
| Match duration       | 90 seconds | 60 à 180 seconds |
| Enemy spawn interval |  5 seconds |   1 à 30 seconds |

Values must be whole numbers within the supported ranges.

Options are stored in browser `localStorage`. Each new match receives an immutable configuration snapshot, so changing options does not alter an active match.

Other balance parameters live in:

`src/game/config/gameplayConfig.ts`

These include movement speed, rotation speed, health, collision radii, projectile damage, projectile lifetime, weapon cooldowns, enemy speeds and Shooter attack range.

## Ranking and Match History

Ranking and Match History use REST-shaped endpoints:

| Method | Endpoint       | Purpose                                           |
| ------ | -------------- | ------------------------------------------------- |
| `GET`  | `/api/ranking` | Paginated ranking filtered by match configuration |
| `GET`  | `/api/matches` | Paginated history for one player                  |
| `POST` | `/api/matches` | Register a completed match                        |

The deployed application prefixes those endpoints with the Vite base path.

Axios sends requests, TanStack Query manages cached server-shaped state, and MSW intercepts the requests.

Ranking uses deterministic sorting and distinguishes match configurations by duration, spawn interval and ruleset version.

Submitted match IDs are used as idempotency keys. Successful submissions and pending records are stored locally for refresh and retry recovery.

**Important:** the mock repository is local to each browser profile. It is not a globally shared leaderboard or a production backend.

## Environment variables

No `.env` file is required for normal development, gameplay or deployment.

| Setting           | Required | Purpose                                                          |
| ----------------- | -------- | ---------------------------------------------------------------- |
| `PERFORMANCE_URL` | No       | Override the Playwright performance suite's target URL           |
| `CI`              | No       | Automatically supplied by CI to enable CI-specific test behavior |

Vite's `BASE_URL` is determined by the build's `--base` option. GitHub Pages uses `/game-developer-challenge/`.

No private API secrets are needed.

## Simulating network conditions

MSW runs in development and in the published build.

Open your browser's DevTools console, then select a scenario:

```javascript
localStorage.setItem("pirate-battle:mock-scenario:v1", "ranking-error");

location.reload();
```

Supported scenarios:

| Scenario                  | Behavior                                                   |
| ------------------------- | ---------------------------------------------------------- |
| `success`                 | Normal mock responses                                      |
| `empty`                   | Empty ranking/history results                              |
| `latency`                 | Fixed 700 ms response delay                                |
| `latency-variable`        | Deterministic 200â€“1,200 ms delays; fixed seed 42         |
| `out-of-order`            | Page 1 delayed 900 ms; other pages delayed 60 ms           |
| `timeout`                 | Delay beyond Axios's 6-second timeout                      |
| `network-error`           | Simulated network failure                                  |
| `http-400`                | Simulated HTTP 400                                         |
| `http-500`                | Simulated HTTP 500                                         |
| `ranking-error`           | Ranking requests return HTTP 500                           |
| `history-error`           | History requests return HTTP 500                           |
| `offline`                 | Simulated network failure                                  |
| `post-timeout-after-save` | Match is saved, but its response exceeds the Axios timeout |

Replace `ranking-error` with the desired scenario.

### Variable latency (fixed seed 42)

Select `latency-variable` and reload to restart the deterministic sequence:

```javascript
localStorage.setItem("pirate-battle:mock-scenario:v1", "latency-variable");
location.reload();
```

A 32-bit LCG assigns integer delays from 200 through 1,200 ms, starting with
452, 288, 777 and 422 ms for seed `42`. The seed is fixed in
`src/mocks/networkScenarios.ts` (`VARIABLE_LATENCY_SEED`); no `Math.random()` is
used. Each valid ranking, history or submission request consumes one value
synchronously before awaiting its delay. Successful mock responses expose
`X-Mock-Delay-Ms` and `X-Mock-Latency-Seed` for reproducible test assertions.

Reload, or call the module's `setNetworkScenario` / `resetNetworkScenario`, to
restart the sequence. Direct localStorage changes should be followed by reload.
Replay the same ordered requests, awaiting each response before sending the
next, in a clean browser context without pending submissions or background
refetches. Concurrent request arrival order and wall-clock scheduling are not
guaranteed by the seed; use `out-of-order` for its explicit page-order scenario.

### Restore normal network behavior

```javascript
localStorage.removeItem("pirate-battle:mock-scenario:v1");

location.reload();
```

Resetting the scenario does **not** delete previously confirmed matches.

### Reproduce a Ranking failure

1. Select `ranking-error` in DevTools.
2. Reload.
3. Open Ranking.
4. Observe the accessible error message.
5. Select `success` and reload.
6. Open Ranking again.

### Reproduce a timeout after saving

1. Set the scenario to `post-timeout-after-save`.
2. Start and complete a match.
3. The mock repository saves the result, but the response arrives after the Axios timeout.
4. Change the scenario to `success` and reload.
5. The pending submission is recovered and retried with the original match ID.
6. The mock API returns the existing record instead of creating a duplicate.

The submission recovery process also retries pending records when connectivity returns, when the page becomes visible and periodically while the page is visible.

### Reset mock records

To clear confirmed mock match records while keeping gameplay options:

```javascript
localStorage.removeItem("pirate-battle:mock-confirmed-matches:v1");

location.reload();
```

For a completely clean demonstration, clear the site's browser storage using DevTools. This also removes player identity, completed match results and pending submission data.

**Warning:** clearing site data deletes local match history and pending records for that browser.

## Testing

### Full E2E suite

```bash
npm run test:e2e
```

Or:

```bash
npx playwright test --workers=2 --reporter=line
```

The main suite uses Chromium desktop and a mobile Chromium device profile.

### Visual regression

```bash
npx playwright test tests/e2e/visual-regression.spec.ts --project=chromium-desktop
```

Only regenerate baselines after reviewing intentional UI changes:

```bash
npx playwright test tests/e2e/visual-regression.spec.ts --project=chromium-desktop --update-snapshots
```

### HTML reports and traces

```bash
npx playwright show-report
```

Playwright is configured to capture traces on the first retry during E2E runs. The performance suite retains traces on failures.

Local report generation is configured. Publication of reports and traces as GitHub Actions artifacts remains a separate CI delivery task.

## Performance profiling

Run an optimized build first:

```bash
npm run build
```

Profile 180 seconds of active gameplay:

```bash
npx playwright test --config=playwright.performance.config.ts three-minute.profile.ts --reporter=line
```

The three-minute profile uses `SPAWN_INTERVAL_SECONDS`, defaulting to **5**.
It accepts integers from 1 through 30 and records the interval in the JSON
attachment and filename. Compare normal and increased load using PowerShell:

```powershell
npm run build

$env:SPAWN_INTERVAL_SECONDS = "5"
npx playwright test --config=playwright.performance.config.ts three-minute.profile.ts --reporter=line --output=test-results-performance-5s

$env:SPAWN_INTERVAL_SECONDS = "1"
npx playwright test --config=playwright.performance.config.ts three-minute.profile.ts --reporter=line --output=test-results-performance-1s

Remove-Item Env:SPAWN_INTERVAL_SECONDS
```

Separate output directories preserve both runs. Compare FPS, p95 frame time,
entity/projectile counts and heap samples only on the same browser/machine.

Profile memory and canvas cleanup across five completed matches:

```bash
npx playwright test --config=playwright.performance.config.ts five-complete-matches.profile.ts --reporter=line
```

Run the public smoke test in PowerShell:

```powershell
$env:PERFORMANCE_URL="https://luizmoreira-devops.github.io/game-developer-challenge/"

npx playwright test --config=playwright.performance.config.ts public-smoke.profile.ts --reporter=line

Remove-Item Env:PERFORMANCE_URL
```

The performance tests can take several minutes.

**60 FPS is a target, not a claimed achievement.** The recorded measurements and their limitations are available in [docs/PERFORMANCE.md](docs/PERFORMANCE.md).

## Deployment

The GitHub Pages workflow is located at:

`.github/workflows/deploy.yml`

A successful merge into `main` triggers the production build and deployment.

The production environment uses the same MSW mocks and browser-local storage model as development.

The published build must be smoke-tested after significant changes.

## Project documentation

- [ARCHITECTURE.md](ARCHITECTURE.md): system responsibilities, gameplay lifecycle, collisions, persistence, APIs and design decisions.
- [docs/SETUP.md](docs/SETUP.md): setup, troubleshooting, scenarios and deployment operations.
- [docs/PERFORMANCE.md](docs/PERFORMANCE.md): measured performance, memory observations and profiling limitations.
- [README.CHALLENGE.md](README.CHALLENGE.md): original technical challenge, preserved without content changes.
- [AGENTS.md](AGENTS.md): project engineering and collaboration rules.

## Known limitations

- The ArrowLeft + ArrowUp + Space input defect is tracked in issue #37.
- Previously recorded performance measurements are below the 60 FPS target.
- Fresh profiling measurements are required after major rendering changes.
- Ranking and history are isolated per browser, not shared between users.
- Variable mock latency is deterministic with fixed seed 42; arbitrary concurrent response order is not guaranteed.
- Further mobile accessibility and responsive-layout verification may be required.
- Asset rights remain subject to the terms under which the original challenge materials were supplied.

## Asset attribution

The visual and audio materials under `assets/` were supplied with the Jungle Gaming technical challenge.

They include spritesheets, individual sprites, tiles, interface components, reference artwork and WAV sound effects.

No independent commercial-use grant is asserted by this README. Confirm the applicable license or obtain permission before redistributing these materials outside the challenge context.

## Enemy spawn distribution

`GameplayConfig.enemySpawnDistribution` accepts `"uniform"` (default) and
`"perimeter"`. Uniform keeps the original sampling unchanged. Perimeter uses
rejection sampling within a border band whose width is 10% of the smaller
usable arena dimension (after subtracting the enemy radius at both ends).
Both enforce arena limits, island clearance and the same minimum player
distance. After 100 unsuccessful attempts they return no enemy rather than
spawning in an invalid position. Configure this in code; the menu still exposes
only match duration and spawn interval.
