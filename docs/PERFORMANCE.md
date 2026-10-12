# Pirate Battle Performance and Test Evidence

## 1. Purpose

This document records the available performance measurements, test evidence, resource-lifecycle observations and known limitations of Pirate Battle.

The objective is to make results reproducible without presenting targets as achievements or historical measurements as current results.

**Target:** 60 FPS in a documented reference environment.

**Current status:** the historical measurements did not reach 60 FPS. New measurements are required after the visual redesign.

## 2. Measurement scope

Two types of profiling are available:

1. Three-minute gameplay profiling.
2. Memory and resource cleanup across five completed matches.

The profiles run through Playwright using a Vite production build and Chromium.

Test implementation:

- [three-minute.profile.ts](../tests/performance/three-minute.profile.ts)
- [five-complete-matches.profile.ts](../tests/performance/five-complete-matches.profile.ts)
- [public-smoke.profile.ts](../tests/performance/public-smoke.profile.ts)

Configuration:

[playwright.performance.config.ts](../playwright.performance.config.ts)

The browser should remain foregrounded during measurements to avoid background throttling.

## 3. Historical three-minute measurements

These measurements were recorded before the latest visual redesign.

They are retained as historical evidence rather than claimed as current-version performance.

| Metric            | Normal load | Increased spawn load |
| ----------------- | ----------: | -------------------: |
| Active gameplay   |    182.05 s |             181.58 s |
| Frames            |       7,856 |                7,407 |
| Average FPS       |       43.14 |                40.69 |
| P95 frame time    |     28.4 ms |              31.2 ms |
| Peak entities     |           3 |                   13 |
| Peak projectiles  |           1 |                    3 |
| Playwright result |        PASS |                 PASS |

### Interpretation

The 60 FPS target was not reached in either run.

The increased-spawn workload recorded a lower average FPS and higher P95 frame time.

These results demonstrate that profiling instrumentation worked and that the specified gameplay duration was measured.

They do not establish performance on all machines, browser versions or display resolutions.

### Missing original environment metadata

The original measurements did not record:

- CPU model.
- GPU model.
- RAM capacity.
- Exact browser version.
- Exact viewport and display resolution.
- Device pixel ratio.
- Operating system build.
- Precise source commit used for profiling.

These details must not be guessed or reconstructed from unrelated screenshots.

The original report described the environment as Chromium running a production preview, with the browser foregrounded.

## 4. Historical five-match memory results

Five completed 60-second matches were measured.

The test recorded zero remaining canvas elements after each match.

JavaScript heap after garbage collection:

| Cycle | Heap after GC | Remaining canvases |
| ----: | ------------: | -----------------: |
|     1 |      6.77 MiB |                  0 |
|     2 |      7.06 MiB |                  0 |
|     3 |      7.24 MiB |                  0 |
|     4 |      7.33 MiB |                  0 |
|     5 |      7.54 MiB |                  0 |

The recorded increase between the first and fifth sample was approximately 814,280 bytes.

### Interpretation

The absence of retained canvas elements is positive evidence of DOM/canvas cleanup.

The increasing heap measurements are not sufficient to prove a memory leak.

Additional analysis is required because:

- JavaScript heap measurements do not capture all GPU texture memory.
- Browser allocation and garbage collection may vary across runs.
- Framework caches can remain allocated intentionally.
- A limited number of cycles cannot establish a long-term memory trend.

## 5. Functional and E2E validation

The initial historical profiling document recorded:

- 237 Playwright tests passed.
- 3 tests skipped.
- 0 failed.

A later verified Quality run after additional E2E coverage recorded:

- 240 Playwright tests passed.
- 6 tests skipped.
- 0 failed.

These are results from separate test-suite revisions. They are not performance measurements.

The project's Quality workflow runs:

```bash
npm ci
npm run lint
npm run typecheck
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```

It also starts a production preview as a smoke check.

Visual regression baselines are stored under:

`tests/e2e/visual-regression.spec.ts-snapshots/`

### Reports and trace availability

Playwright is configured to generate an HTML report.

E2E traces are configured for the first retry.

Performance traces are retained on test failure.

At the time this document was prepared, GitHub Actions did not upload the Playwright HTML report and trace directory as downloadable Quality workflow artifacts.

The corresponding CI configuration must be completed before claiming that CI evidence is published.

## 6. Reproducing the performance tests

Use Node.js 24 and npm.

Install dependencies and Chromium:

```bash
npm ci
npx playwright install chromium
```

Build the production bundle:

```bash
npm run build
```

The performance configuration starts its own local preview server at:

`http://127.0.0.1:4173`

### Three-minute gameplay profile

```bash
npx playwright test --config=playwright.performance.config.ts three-minute.profile.ts --reporter=line
```

The automated profile configures a 180-second match and a 1-second enemy spawn interval.

It samples browser performance diagnostics and JavaScript heap usage.

The test attaches a JSON report named:

`180-second-performance.json`

The collected report includes average FPS, P95 frame time, peak entities and peak projectiles.

### Five-match resource profile

```bash
npx playwright test --config=playwright.performance.config.ts five-complete-matches.profile.ts --reporter=line
```

This profile runs five completed matches, samples JavaScript heap after garbage collection and verifies the removal of canvas elements.

The test attaches:

`five-complete-matches-memory.json`

### Viewing local performance reports

```bash
npx playwright show-report playwright-report-performance
```

Playwright attachments are generated by successful execution of these profiling tests. They are not automatically committed to the repository.

### Important measurement caveat

The performance tests must be rerun after significant UI or gameplay changes.

If a profiling test fails because an accessible label, screen transition or result markup changed, correct the test to match actual behavior before recording new measurements.

Do not substitute simulated results for real measurements.

## 7. Public deployment smoke test

Public URL:

https://luizmoreira-devops.github.io/game-developer-challenge/

PowerShell:

```powershell
$env:PERFORMANCE_URL="https://luizmoreira-devops.github.io/game-developer-challenge/"

npx playwright test --config=playwright.performance.config.ts public-smoke.profile.ts --reporter=line

Remove-Item Env:PERFORMANCE_URL
```

The public smoke profile verifies application loading, Ranking, Match History, gameplay canvas initialization and uncaught page errors.

A passing local smoke test is not sufficient evidence that the most recently deployed commit passes unless the test was run against that deployed version.

## 8. Required environment metadata for new runs

Record the following information alongside every new profiling result.

| Field                                    | Value                                 |
| ---------------------------------------- | ------------------------------------- |
| Date and time                            | To be recorded                        |
| Git commit SHA                           | To be recorded                        |
| Environment                              | Local production preview / public URL |
| Operating system                         | To be recorded                        |
| CPU                                      | To be recorded                        |
| GPU                                      | To be recorded                        |
| RAM                                      | To be recorded                        |
| Browser and version                      | To be recorded                        |
| Viewport width and height                | To be recorded                        |
| Device pixel ratio                       | To be recorded                        |
| Match duration                           | To be recorded                        |
| Spawn interval                           | To be recorded                        |
| Input behavior during profile            | To be recorded                        |
| Background tabs / competing applications | To be recorded                        |

For Windows, CPU, GPU and RAM can be inspected through Task Manager or Windows System Information.

Browser version can be recorded from the browser's About page.

Viewport and DPR can be inspected with:

```javascript
({
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: window.devicePixelRatio,
});
```

## 9. New performance results

**Status: pending measurement after the latest visual changes.**

| Metric                    | New normal run | New increased-load run |
| ------------------------- | -------------- | ---------------------- |
| Active gameplay           | Pending        | Pending                |
| Average FPS               | Pending        | Pending                |
| P95 frame time            | Pending        | Pending                |
| Peak entities             | Pending        | Pending                |
| Peak projectiles          | Pending        | Pending                |
| Five-match canvas cleanup | Pending        | Pending                |
| JavaScript heap trend     | Pending        | Pending                |

Do not replace these fields until measurements have actually completed.

Attach the generated JSON evidence and record the matching commit SHA.

## 10. Known performance limitations

- Historical FPS results remain below 60.
- The latest renderer revision has not been benchmarked in this document.
- The main application JavaScript bundle triggers Vite's large-chunk warning.
- React state updates are reduced to HUD value changes, but simulation snapshots still create per-frame data.
- Texture and visual effect allocation costs may vary with entity count.
- GPU memory is not directly measured by the existing five-match profile.
- The browser and operating system may affect frame scheduling.
- The currently published mock APIs are browser-local and do not represent backend network performance.

## 11. Next optimization candidates

Measure before applying optimizations.

Potential areas for investigation include:

1. Frame-time spikes during enemy spawning and projectile-heavy combat.
2. Snapshot allocation costs during every ticker update.
3. Reuse of temporary render objects and graphics.
4. Texture loading and GPU resource retention across game sessions.
5. Bundle splitting and lazy loading of non-gameplay screens.
6. Effects and background animation costs.
7. DPR-dependent rendering workload on high-density displays.

Each optimization should be supported by before/after measurements using the same environment and workload.

## 12. Related documentation

- [Project README](../README.md)
- [Architecture](../ARCHITECTURE.md)
- [Setup and operations](SETUP.md)
- [Original challenge](../README.CHALLENGE.md)
