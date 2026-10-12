# Accessibility verification

## Mobile orientation support

Portrait and landscape are intended supported layouts; the UI does not lock
orientation. **Official verified support for both orientations is not yet
established by this change.** Do not mark the mobile acceptance criterion as
passed until the following browser checks run successfully.

| Viewport (CSS px) | Layout         | Automated coverage                 | Execution status |
| ----------------- | -------------- | ---------------------------------- | ---------------- |
| 390 × 740         | Portrait       | HUD, pause, controls, focus, touch | Pending          |
| 740 × 390         | Landscape      | HUD, pause, controls, focus, touch | Pending          |
| 320 × 568         | Small portrait | HUD, pause, controls, focus, touch | Pending          |

`tests/e2e/responsive-accessibility.spec.ts` changes through all three sizes
within the same mobile test and match. Assertions check element bounds,
clipping ancestors, internal overflow, pairwise overlaps, hit targets, modal
keyboard focus, visible focus-ring bounds, canvas size/DPR and touch press/release.
The pause overlay intentionally covers and disables the game behind it; overlap
checks compare modal contents with each other, not with the background game.
The short landscape modal uses compact spacing and buttons to fit its frame
and focus rings inside the stage. Simulation coordinates remain unchanged.

Run:

```sh
npx playwright install chromium
npx playwright test tests/e2e/responsive-accessibility.spec.ts --workers=1
```

## Contrast changes and calculated evidence

Thresholds: normal text 4.5:1; large text 3:1 (24 CSS px regular or approximately
18.67 CSS px bold). Custom focus indicators need adequate non-text contrast.
Sources: [WCAG contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
and [non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

A source-asset scan used opaque pixels in the central 50% width / 30% height of
each PNG and the CSS text color, applying sRGB relative luminance. Minimum
sample ratios were 1.62:1 (green health), 1.41:1 (amber), 3.29:1 (red), and
2.70:1 (pressed gold button). These identify risky combinations, not exact
rendered glyph measurements. Text shadows were not counted as a remedy.

| Updated surface                   | Foreground | Background | Calculated ratio |
| --------------------------------- | ---------- | ---------- | ---------------- |
| Health numbers, all health states | #fff9ea    | #102b40    | 13.87:1          |
| Pause heading                     | #ffe6aa    | #102b40    | 11.90:1          |
| Pause description                 | #e4d8c4    | #102b40    | 10.35:1          |
| Pressed text button               | #40280e    | #ffe19b    | 10.80:1          |
| Focus ring / dark backing         | #fff19e    | #102b40    | 12.71:1          |

Health labels now have opaque backgrounds. The pause frame no longer paints a
variable texture beneath the text. Pressed text buttons use a solid light gold
background. A 7 px dark backing surrounds the light 3 px focus outline, whose
offset is 3 px. Icon buttons retain their existing sprites.

These calculations are not a complete WCAG conformance audit and do not
substitute for inspecting rendered text, icons, focus and all button states.
Normal/hover button PNG samples and the counter panel did not show the same
contrast issue, but still require rendered inspection.

## Chrome DevTools check — pending

The available cloud browser exposes page content, not the Chrome DevTools
accessibility panel. Local Chromium installation failed because the download
returned an invalid/truncated ZIP; E2E browser execution is therefore blocked.
No DevTools inspection or successful browser-layout result is claimed.
Lint and the TypeScript/production build passed; Playwright can discover the suite.

Before marking verification complete, use Chrome DevTools Elements >
Accessibility and the element inspector/color contrast controls at each listed
viewport. Inspect HUD health at green/amber/red, score, time, pause heading and
body text, Resume/Main Menu and menu text buttons in normal/hover/pressed/focused
states. Check text on image backgrounds against the actual pixels behind it;
unavailable automatic ratios are not passes. Tab through every enabled control
and confirm the full focus ring is visible and distinguishable. Record browser
version, measured ratios, viewport and results here. Verify portrait/landscape
on a physical touch device as well before making broader device-support claims.
