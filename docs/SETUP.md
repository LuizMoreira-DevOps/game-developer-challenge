# Pirate Battle: Setup and Operations

## 1. Requirements

- Node.js 24
- npm
- Chromium-compatible browser
- Git, for source checkout

No private API keys, private backend, database, cloud account or `.env` file is required to run the application locally.

The production demonstration uses MSW and browser-local persistence.

## 2. Clean checkout

```bash
git clone https://github.com/LuizMoreira-DevOps/game-developer-challenge.git
cd game-developer-challenge

npm ci
```

Use `npm ci` to install the versions resolved by the committed lockfile.

Avoid replacing the lockfile merely to install dependencies.

## 3. Development

```bash
npm run dev
```

Open the localhost URL printed by Vite.

The expected default address is:

http://localhost:5173/

If the port is occupied, use the actual address reported by the development server.

## 4. Quality checks

Run the static checks independently:

```bash
npm run lint
npm run typecheck
```

Build production assets:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

A successful build does not establish that gameplay, responsive layout or mock APIs work correctly. Use the Playwright and browser smoke checks as well.

## 5. Playwright installation

Install Chromium:

```bash
npx playwright install chromium
```

On supported Linux CI environments:

```bash
npx playwright install --with-deps chromium
```

Run all E2E tests:

```bash
npm run test:e2e
```

Run with a concise terminal reporter:

```bash
npx playwright test --workers=2 --reporter=line
```

Run desktop tests only:

```bash
npx playwright test --project=chromium-desktop --reporter=line
```

Run mobile tests only:

```bash
npx playwright test --project=chromium-mobile --reporter=line
```

Run touch-control tests:

```bash
npx playwright test tests/e2e/touch-controls-ui.spec.ts --project=chromium-mobile --reporter=line
```

Open the local HTML report:

```bash
npx playwright show-report
```

### Visual regression

```bash
npx playwright test tests/e2e/visual-regression.spec.ts --project=chromium-desktop
```

Update screenshots only after confirming intended UI changes:

```bash
npx playwright test tests/e2e/visual-regression.spec.ts --project=chromium-desktop --update-snapshots
```

Review changed PNGs before committing.

### Test artifacts

The main Playwright configuration generates HTML reports and traces on the first retry.

CI publication of `playwright-report/` and `test-results/` requires an additional GitHub Actions upload step.

The presence of local reports does not mean they are available for download from GitHub Actions.

## 6. Gameplay controls

| Action          | Input          |
| --------------- | -------------- |
| Forward         | W / ArrowUp    |
| Turn left       | A / ArrowLeft  |
| Turn right      | D / ArrowRight |
| Front cannon    | Space / F      |
| Left broadside  | Q              |
| Right broadside | E              |

On supported touch devices, use the on-screen movement and weapon controls.

The player can pause manually through the HUD.

The game also pauses on loss of focus or tab visibility.

Resume requires explicit player interaction.

Known issue: ArrowLeft + ArrowUp + Space may not fire as expected. Use F while issue #37 remains unresolved.

## 7. Gameplay configuration

Default configuration:

- Match duration: 90 seconds.
- Enemy spawn interval: 5 seconds.
- Player health: 100.
- Arena: 1280 x 720 world units.
- Front cannon: one projectile.
- Broadside: three projectiles.

The Options screen accepts:

- Match duration: 60–180 seconds.
- Enemy spawn interval: 1–30 seconds.

Saved options apply to newly created matches.

The rest of the balance configuration is defined in:

`src/game/config/gameplayConfig.ts`

## 8. Mock API operation

MSW intercepts requests to Ranking and Match History.

The application uses Axios for requests and TanStack Query for query caching, mutations, error management and invalidation.

Endpoints:

```text
GET  /api/ranking
GET  /api/matches
POST /api/matches
```

Requests in a GitHub Pages production build include the deployment base path.

### Mock service worker

The worker is registered during application bootstrap.

Worker URL:

```text
${BASE_URL}mockServiceWorker.js
```

The service worker must be served under the same base path as the application.

If the game works but Ranking/History fail:

1. Open browser DevTools.
2. Check the Console for worker registration errors.
3. Check Network for requests to `/api/ranking` and `/api/matches`, including any deployment prefix.
4. Confirm the worker file is accessible.
5. Confirm the selected MSW scenario is not intentionally failing requests.
6. Reload after correcting the issue.

Failure to start MSW should not prevent offline gameplay from loading.

## 9. Network scenarios

The selected scenario is stored under:

`pirate-battle:mock-scenario:v1`

Open DevTools > Console and enter:

```javascript
localStorage.setItem("pirate-battle:mock-scenario:v1", "success");

location.reload();
```

Available scenarios:

| Scenario                | Behavior                                    |
| ----------------------- | ------------------------------------------- |
| success                 | Standard responses                          |
| empty                   | Empty ranking/history lists                 |
| latency                 | Fixed 700 ms delay                          |
| out-of-order            | 900 ms for page 1; 60 ms for other pages    |
| timeout                 | 7000 ms delay                               |
| network-error           | Network failure                             |
| http-400                | HTTP 400                                    |
| http-500                | HTTP 500                                    |
| ranking-error           | HTTP 500 on Ranking queries                 |
| history-error           | HTTP 500 on History queries                 |
| offline                 | Network failure                             |
| post-timeout-after-save | Match persists, but POST response times out |

Axios currently has a 6000 ms timeout.

### Switching scenarios

Example:

```javascript
localStorage.setItem("pirate-battle:mock-scenario:v1", "http-500");

location.reload();
```

### Resetting the scenario

```javascript
localStorage.removeItem("pirate-battle:mock-scenario:v1");

location.reload();
```

Normal behavior is selected when the key is absent or invalid.

## 10. Reproducing error and recovery cases

### Empty Ranking

1. Select `empty`.
2. Reload.
3. Open Ranking.
4. Confirm the empty-state message is visible.
5. Reset the scenario.

### Ranking unavailable

1. Select `ranking-error`.
2. Reload.
3. Open Ranking.
4. Confirm the failure message appears.
5. Return to `success`.
6. Reload and open Ranking again.

### History unavailable

1. Select `history-error`.
2. Reload.
3. Open Match History.
4. Confirm the error message appears.
5. Return to `success`.
6. Reload and verify recovery.

### Slow Ranking

1. Select `latency`.
2. Reload.
3. Open Ranking.
4. Observe the loading state before the response arrives.
5. Reset to `success`.

### Out-of-order responses

1. Select `out-of-order`.
2. Reload.
3. Open Ranking.
4. Navigate between pages.
5. Verify the displayed page and results remain consistent.
6. Reset to `success`.

This scenario uses deterministic, page-specific delays.

### Timeout after a successful save

1. Select `post-timeout-after-save`.
2. Reload.
3. Start and complete a match.
4. Wait for the registration timeout.
5. Observe that the record remains pending locally.
6. Switch to `success`.
7. Reload.
8. Allow the pending submission recovery to run.
9. Verify the match appears only once in History and Ranking.

The matching POST request uses the original match ID as an idempotency key.

### Offline submission recovery

1. Select `offline`.
2. Reload.
3. Complete a match.
4. Observe the pending registration state.
5. Return to `success`.
6. Reload or trigger a retry.
7. Verify that registration is confirmed.

Pending submissions are also retried on reconnect, when the document becomes visible, and periodically while the page is visible.

## 11. Browser-local persistence

Important storage keys:

| Key                                       | Purpose                   |
| ----------------------------------------- | ------------------------- |
| `pirate-battle:options:v1`                | Saved Options             |
| `pirate-battle:player:v1`                 | Player identity           |
| `pirate-battle:active-match:v1`           | Active session            |
| `pirate-battle:last-completed:v1`         | Latest completed match    |
| `pirate-battle:last-abandoned:v1`         | Latest abandoned match    |
| `pirate-battle:pending-matches:v1`        | Pending API submissions   |
| `pirate-battle:submission-receipts:v1`    | Confirmed submissions     |
| `pirate-battle:mock-confirmed-matches:v1` | Confirmed mock records    |
| `pirate-battle:mock-scenario:v1`          | Selected network scenario |

### Clear confirmed records only

```javascript
localStorage.removeItem("pirate-battle:mock-confirmed-matches:v1");

location.reload();
```

### Reset the entire local demonstration

Use DevTools > Application > Storage > Clear site data.

This deletes player identity, options, local History, pending submissions and local mock records.

Do not clear site data when testing pending-submission recovery.

## 12. Production deployment

Public URL:

https://luizmoreira-devops.github.io/game-developer-challenge/

The deployment workflow is:

`.github/workflows/deploy.yml`

The workflow installs dependencies, builds for GitHub Pages and uploads `dist/`.

Required Vite base path:

```text
/game-developer-challenge/
```

Manual build:

```bash
npm run build -- --base=/game-developer-challenge/
```

The deployment process must keep the MSW worker and API URLs under the same base path.

After publishing, verify:

1. The public URL opens directly.
2. Reloading the public URL still loads the game.
3. The main menu and Options screen work.
4. The arena initializes.
5. Ranking loads fixture records.
6. Match History loads.
7. A completed match is registered locally.
8. Pending submissions recover after simulated failure.
9. No unexpected JavaScript errors appear in the browser Console.

## 13. Public smoke test

PowerShell:

```powershell
$env:PERFORMANCE_URL="https://luizmoreira-devops.github.io/game-developer-challenge/"

npx playwright test --config=playwright.performance.config.ts public-smoke.profile.ts --reporter=line

Remove-Item Env:PERFORMANCE_URL
```

The public smoke test must run against the version actually deployed.

## 14. Performance tests

First create the production bundle:

```bash
npm run build
```

Three-minute profile:

```bash
npx playwright test --config=playwright.performance.config.ts three-minute.profile.ts --reporter=line
```

Five completed matches:

```bash
npx playwright test --config=playwright.performance.config.ts five-complete-matches.profile.ts --reporter=line
```

The performance configuration uses a local production preview on port 4173 unless PERFORMANCE_URL is set.

View the performance HTML report:

```bash
npx playwright show-report playwright-report-performance
```

See [PERFORMANCE.md](PERFORMANCE.md) for metrics, limitations and environment-recording requirements.

## 15. Troubleshooting

### The page is blank

- Inspect the browser Console.
- Verify `npm ci` completed.
- Rebuild the application.
- Check the Vite base path.
- Check for failed asset requests.

### A gameplay asset fails

- Inspect the Console and Network tabs.
- Verify the asset URL.
- Use the game's Retry Loading control.
- Return to the menu if retry is unsuccessful.

### Ranking or History stays unavailable

- Confirm MSW is registered.
- Reset the network scenario to `success`.
- Confirm local storage is available.
- Inspect the intercepted request and HTTP response.

### Playwright cannot launch Chromium

```bash
npx playwright install chromium
```

On Linux CI, install browser system dependencies.

### Visual snapshots differ

- Confirm the browser project.
- Verify that the expected UI state is stable.
- Check viewport and browser versions.
- Review the actual/diff images.
- Regenerate baselines only for intended visual changes.

### Performance measurements differ

- Compare hardware and browser versions.
- Record viewport dimensions and DPR.
- Verify that the browser stayed foregrounded.
- Use the same match configuration and source commit.
- Repeat measurements rather than relying on one sample.

## 16. Known limitations

- Issue #37 tracks a keyboard combination defect.
- The mock API is browser-local and not globally shared.
- The 60 FPS performance target has not been demonstrated by the historical measurements.
- New performance figures are required after significant rendering changes.
- Mock latency scenarios are currently fixed rather than randomized.
- Mobile orientation, focus management and some accessibility details need continued verification.
- Asset reuse outside the original challenge context requires confirmation of applicable rights.

## 17. Documentation

- [README.md](../README.md): project guide.
- [ARCHITECTURE.md](../ARCHITECTURE.md): technical architecture.
- [PERFORMANCE.md](PERFORMANCE.md): measured performance.
- [README.CHALLENGE.md](../README.CHALLENGE.md): original challenge.
- [AGENTS.md](../AGENTS.md): project conventions.
