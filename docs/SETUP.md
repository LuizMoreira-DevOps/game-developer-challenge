# Pirate Battle: Setup and Operations

## Requirements

Node.js 24 and npm. No private API keys or backend are required.

## Local development

npm ci
npm run dev

## Quality and production

npm run typecheck
npm run lint
npm run build
npm run preview

## Tests

npx playwright install chromium
npx playwright test
npx playwright show-report

Generate desktop visual baselines:

npx playwright test tests/e2e/visual-regression.spec.ts --project=chromium-desktop --update-snapshots

## Controls

W / ArrowUp: forward
A / ArrowLeft: rotate left
D / ArrowRight: rotate right
Space / F: front cannon
Q: left broadside
E: right broadside

Touch controls appear on supported touch devices.

## Gameplay options

Match duration: 60-180 seconds.
Enemy spawn interval: 1-30 seconds.
Options persist after refresh and apply to new matches.

## MSW scenarios

The default network scenario is success.

In browser DevTools, choose a scenario:

localStorage.setItem("pirate-battle:mock-scenario:v1", "ranking-error");
location.reload();

Other supported scenarios include empty, latency, out-of-order,
timeout, network-error, http-400, http-500, history-error,
offline and post-timeout-after-save.

Reset the scenario:

localStorage.removeItem("pirate-battle:mock-scenario:v1");
location.reload();

Confirmed mock records are stored under:
pirate-battle:mock-confirmed-matches:v1

Clearing site data resets the local demonstration state.

## Deployment

GitHub Pages uses the /game-developer-challenge/ base path.
The build is published by .github/workflows/deploy.yml on main.

The MSW worker and requests must use the deployment base path.
Verify gameplay, Ranking, Match History and refresh after deploy.

## Environment

No .env file or secrets are required for local gameplay.
PERFORMANCE_URL is optional when testing a published build.

## Performance testing

npx playwright test --config=playwright.performance.config.ts three-minute.profile.ts

npx playwright test --config=playwright.performance.config.ts five-complete-matches.profile.ts

## Known limitations

Issue #37 tracks the ArrowLeft + ArrowUp + Space input defect.
Front cannon input using F is supported.