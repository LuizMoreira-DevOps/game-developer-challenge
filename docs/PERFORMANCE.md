# Pirate Battle Performance Evidence

## Method

Playwright Chromium desktop running the Vite production build.
The browser remained foregrounded during testing.
The reference target is 60 FPS.

CPU/GPU models and exact display resolution were not recorded
in the original measurements and must not be inferred.

## Three-minute runs

| Metric | Normal load | Increased spawn load |
| --- | ---: | ---: |
| Active gameplay | 182.05 s | 181.58 s |
| Frames | 7856 | 7407 |
| Average FPS | 43.14 | 40.69 |
| P95 frame time | 28.4 ms | 31.2 ms |
| Peak entities | 3 | 13 |
| Peak projectiles | 1 | 3 |
| Playwright | PASS | PASS |

Both runs completed. Neither reached the 60 FPS target.

## Five completed matches

All five 60-second matches ended normally.
Residual canvas count after every match: zero.

JavaScript heap after garbage collection:

1: 6.77 MiB
2: 7.06 MiB
3: 7.24 MiB
4: 7.33 MiB
5: 7.54 MiB

Growth from first to fifth: 814280 bytes.

A rising JavaScript heap alone does not establish a leak.
GPU texture memory is not included in these measurements.
Additional memory and GPU analysis is future work.

## Functional validation

Full Playwright suite: 237 passed, 3 skipped, 0 failed.
TypeScript, ESLint and production build: PASS.

Performance figures are observations, not universal benchmarks.

## Deferred work

Issue #37: keyboard combination.
Improve frame time toward 60 FPS using targeted profiling.
Repeat measurements on the public URL with recorded hardware.