# Splash A · Moonlight mist

A standalone, no-dependency prototype inspired by Creator Loans v2's first-load splash structure. The page and header are already present underneath the full-screen overlay. The silver pool ripples, lifts into a rising liquid ribbon, resolves into the crescent-question mark, catches one cool shimmer, then the mark flies into the header's own mark while the veil lifts.

## Timing

| Time | Motion |
| --- | --- |
| 0.0–0.6 s | Silver pool arrives and settles; a narrow drop beads into it and a ripple spreads. |
| 0.55–1.4 s | Droplets drift outward as the pool pulls upward and contracts. |
| 0.96–1.42 s | The mark resolves through a soft focus and slight scale settle. |
| 1.25–1.65 s | Wordmark and quiet-hours line rise in. |
| 1.64–2.18 s | A single cool silver-blue shimmer sweeps across the mark. |
| 2.32–3.00 s | Mark travels and scales into the header target. |
| 2.68–3.14 s | The veil fades as the mark lands. |
| 3.15 s | Safety completion reveals the page and offers Replay. |

The mark entrance and word use `cubic-bezier(.22,1,.36,1)`; the header flight uses `cubic-bezier(.72,0,.24,1)`. The veil fades over 460 ms. Clicking anywhere on the overlay or Escape skips directly to the page. Replay is prototype-only.

## App wiring

1. In `apps/web/index.html`, add a tiny synchronous pre-paint script. In a `try` block, check `matchMedia('(prefers-reduced-motion: reduce)')`, then add a root `splash-on` class only when that motion preference is absent and `sessionStorage` has no `tanong402-splash-seen` value. The CSS should keep the overlay `display:none` unless that class exists, preventing a page flash when JS is unavailable.
2. Render a React splash component alongside the landing page. It should find the header logo mark (for example, `[data-brand-mark]`), measure both mark rectangles at flight start, and animate the centered art to the target using translate and scale. Keep the splash `aria-hidden`, with no focusable overlay controls; Escape and pointer click skip it.
3. On finish, set `tanong402-splash-seen` in `sessionStorage`, remove the root class, and restore the header mark. Storage errors should not stop page access. Register cleanup for key listeners and timers.
4. Under reduced motion, render no overlay. If there is no JS, the pre-paint class is never added and the page stays visible. The once-per-session key means following links does not replay; a full browser-session restart does. For local visual review, expose a development-only replay hook or query override without changing the production session rule.
5. Keep an independent CSS safety release near 3.7 s so a failed animation can never hold the page. Do not make the landing content inert or trap focus behind the decorative overlay.

## Files

`../brand/logo-board.html` is the logo study. `../../apps/web/public/brand/` contains the reusable SVG logo assets and generated raster app icons. `splash-a-frames.png` is the six-frame Chromium filmstrip at 0.20, 0.55, 1.00, 1.65, 2.72 and 3.12 seconds.
