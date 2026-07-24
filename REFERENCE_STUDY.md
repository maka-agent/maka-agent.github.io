# Haoqi.design reference study

This document records design and rendering facts observed on
`https://haoqi.design/` and serves as a fidelity reference. Reproducing proven
composition, typography ratios, motion, assets, or shader structure is allowed
when it improves visual coherence. Maka must keep its product claims and
execution semantics truthful; visual distance from the reference is not a goal.

## Evidence boundary

- Target: the homepage's full-viewport WebGL layer and its cooperation with the
  DOM page.
- Viewport captured: 1280 × 720 CSS px at DPR 2.
- Local evidence lives under `.web-shader-extractor/` and is intentionally not
  published with the website.
- Implementation-critical findings below use `SOURCE`, `PARTIAL`, or `GUESS`
  labels. No visual-fit estimate is promoted to source fact.

## Visual system findings

### Structure

- `SOURCE` — A fixed 12-column measurement grid spans the viewport and persists
  across the page. Fine rules and crosshair intersections turn layout into an
  instrument rather than a stack of cards.
- `SOURCE` — The header and bottom telemetry remain fixed while a Lenis-driven
  inner container scrolls through roughly 10,199 px of content at the captured
  viewport.
- `SOURCE` — The hero distributes identity, thesis, biography, and the primary
  statement across different grid zones. The dominant statement spans the lower
  viewport at 5–6vw, uppercase, bold, with line-height equal to font size.
- `SOURCE` — Project metadata is kept in the DOM while project imagery is mapped
  into the WebGL scene. The renderer is part of the information architecture,
  not a decorative background.
- `SOURCE` — Long-form pacing alternates dense project indexes with single-idea
  viewport sections and an experimental, character-scrambled closing sequence.
- `PARTIAL` — Maka translates that closing grammar as a fourth Surfaces state:
  one decoded single-idea statement, a four-entry surface index, and a final
  source CTA. The decode mechanism, glyph pool, timing, and copy are
  Maka-original and correspond to real README surface facts.

### Typography and color

- `SOURCE` — The reference uses three deliberate font roles: a variable sans for
  identity/display, a readable mono for explanatory copy, and a sharper mono for
  navigation/telemetry.
- `SOURCE` — Light theme base is `rgb(251 250 244)` with black primary text,
  `rgba(54 54 48 / 0.6)` secondary text, `rgba(54 54 48 / 0.1)` grid lines,
  and an acid-green selection/accent color.
- `SOURCE` — Navigation and identity are 16px/24px. The hero statement measured
  71.68px/71.68px at 1280px wide.
- `PARTIAL` — A fixed-condition audit at 1440×900 found Maka's persistent shell
  (11.2px nav, 9.3px telemetry) reading one class lighter than the reference's
  16px instrument shell; Maka's shell scale was raised (≈13/10.5px) to close the
  density gap. Maka's statement scale (6.2vw, 0.87 line-height) and centered
  navigation remain intentional Maka-owned divergences.
- `PARTIAL` — Maka preserves the three-role typographic contrast. Exact reference
  font files may be used if licensing and delivery permit; the current build
  keeps Geist/Geist Mono for product readability and Pacifico for the 3D wordmark.

### Motion and interaction

- `SOURCE` — Cold-start captures at desktop and compact viewports keep one centered horizontal loading owner visible from the first committed frame through every sampled point up to 5.2s. Even when the DOM and two canvases already exist, the reference withholds its shell, 3D identity, and hero copy until the loading controller considers the composed surface ready.
- `PARTIAL` — Maka translates the ownership rule, not the reference's unbounded wait or exact line treatment: a branded `MAKA` loader yields to the compiled glass wordmark, then the shell, then hero copy. A 3.2s recovery path exposes a complete static `Maka` and semantic DOM if renderer readiness never arrives.
- `SOURCE` — Pointer position becomes live X/Y telemetry in the persistent
  shell.
- `SOURCE` — At 1440 × 900 the coordinate shell seeds at the exact viewport
  center, `0720 X 0450 Y`. The target-bound WebGL source separately maintains
  pointer trail, trail strength, display resolution, and damped effect state,
  so the readable DOM signal and the physical GPU response are distinct
  consumers of pointer input.
- `PARTIAL` — Maka translates the mechanism as a single raw-input event bus:
  DOM shows four-digit viewport pixels while the light field and Three.js
  consume normalized coordinates. Exact formatting, keyboard commands, and
  motion values remain Maka-owned.
- `SOURCE` — Theme and sound controls behave like compact keyboard-readable
  commands rather than generic toggles.
- `SOURCE` — Source code contains explicit `prefers-reduced-motion` handling.
- `SOURCE` — Section visibility gates expensive renderer work; offscreen effects
  are not rendered continuously.
- `SOURCE` — The canvas is page-coupled through `sectionPosition`, `domImages`,
  scroll state, pointer state, and route/loading controllers.
- `SOURCE` — Activating `WORK` preserves the same URL and persistent grid/header,
  replaces the hero scaffold in the first sampled transition frame, and reveals
  the leading project image from a low-contrast wash to full contrast within
  roughly the first 400ms. The structure arrives before the image finish.
- `SOURCE` — Fixed-time sampling supports a staged-owner handoff rather than a
  simultaneous dual-owner crossfade: the destination scaffold can become
  legible while the outgoing visual resolves, without producing a full-frame
  blank interval.
- `PARTIAL` — Maka translates that cadence with destination-specific readiness
  windows (Overview 900ms, Product 1450ms, Runtime 1900ms) because its three
  compositions have different longest motion chains. Those values are
  Maka-owned timing, not copied source constants.
- `SOURCE` — At 1440 × 900, the settled leading Work image begins at x≈506 and
  owns about 65% of the viewport width, leaving the upper-left 35% as open
  field. The next row exposes two equal images at about 37% width each with an
  8.9% viewport gap; it does not add a third floating crop or annotation layer.
- `SOURCE` — Project hover uses `uHoverRevealProgress` to grow square cells
  across the image. Progress advances with clamped frame delta over 420ms and
  is converted through half-cosine easing; `pointerenter`/`pointerleave` and
  `focusin`/`focusout` share ownership. Below 0.001 coverage the shader skips
  the hover texture sample.
- `PARTIAL` — Maka retains the cell topology, 420ms cadence, and pointer/focus
  parity but resamples the same authentic Artifact screenshot with an
  inspection-contrast treatment. It does not fabricate a hover-only product
  state or promote the contained proof canvas into a second page owner.
- `PARTIAL` — Maka should translate this as one dominant authentic task and two
  equal next proofs. The exact ratios remain Maka-owned layout values rather
  than copied constants, and compact viewports crop the image inside a stable
  frame so labels stay readable.
- `SOURCE` — The later `HyperSpace` section is approximately eight viewport
  heights and maps segment pairs `[0,1]`, `[2,3]`, `[4,5]`, and `[6,7]` to four
  mutually exclusive visual stages. Its source switch returns only the active
  stage component.
- `SOURCE` — The first, second, and final HyperSpace stages are each owned by
  one centered display statement. The intermediate stage uses one central ring
  and distributes four smaller statements around it; it does not show a grid
  of equal cards.
- `PARTIAL` — Maka translates this ownership mechanism into a single Event Log
  hub with Request and AgentRun as incoming facts and Projection and Recovery
  as outgoing results. Exact content, geometry, timing, and color remain
  Maka-original.

## Renderer findings

- `SOURCE` — The attributed target is a main-thread `WebGL2` canvas created by
  React Three Fiber and marked `three.js r184`.
- `SOURCE` — Canvas backing size is 2560 × 1440 for a 1280 × 720 viewport.
- `SOURCE` — The primary context uses alpha, premultiplied alpha, no antialias,
  no depth, no stencil, and `powerPreference: high-performance`.
- `SOURCE` — The target-bound page chunk is
  `4d3f3b68dbbde33a.js`; its main page renderer is around byte offsets
  385,040–409,316.
- `SOURCE` — The renderer composes instanced image particles, an image atlas,
  custom `ShaderMaterial`s, half-resolution offscreen FBOs for glass/refraction,
  a multi-pass fluid pipeline (curl, vorticity, divergence, pressure, gradient,
  advection), and a flare/post-process pass.
- `SOURCE` — Particle updates clamp frame delta to 0.1s, reuse object instances,
  update `instanceMatrix`, and gate work by scroll/section visibility.
- `SOURCE` — Glass/refraction captures selected camera layers to an offscreen
  render target and restores the previous target and camera layer mask.
- `SOURCE` — The hero identity object is a dedicated public
  `model/hello.gltf` asset exported by `THREE.GLTFExporter`, containing one mesh
  with 24,020 positions. The page source recenters that mesh and applies its own
  screen-space refraction `ShaderMaterial`; the visible word is therefore a
  purpose-built model, not runtime `TextGeometry` with a stock typeface.
- `PARTIAL` — Maka translates that geometry principle with original
  single-path Catmull–Rom cursive geometry spelling `Maka`. One open ribbon and
  two shared terminal caps replace the previous per-letter assembly. It does
  not reuse the reference model, mesh data, shader code, or exact material
  constants.
- `SOURCE` — The hello glass is a custom screen-space-refraction
  ShaderMaterial, not PBR transmission. The scene renders to a half-resolution
  FBO; the glass samples that texture along per-channel refraction vectors
  (loop 3, `offset = (refractPower + slide) * chromaticAberration`).
- `SOURCE` — Light-theme glass constants: refractPower 0.72, chromatic
  aberration 0.14, shininess 120, diffuseness 0.1, specularStrength 1.2,
  fresnelPower 1, fresnelStrength 0.24 with a directional side mask
  (sideDir −1,1,−1), brightness 0.78, contrast 0.9, gamma 1, saturation 1.2,
  toneMapped false.
- `SOURCE` — The blue is a vertical tint gradient in model-local Y
  (#009dff top → #ffffff bottom) applied as Beer-Lambert transmittance;
  alpha runs 0.92 facing → 1.0 grazing via a 1−|n·v| thickness mask.
- `SOURCE` — The specular light position is pointer-driven (uLight tracks the
  cursor with lightZ 0.5), so the tight highlights travel with the mouse.
- `SOURCE` — The fluid renderer ping-pongs velocity targets and has explicit
  render-target disposal and resize paths.
- `PARTIAL` — The captured browser remained on the WebGL loading surface, so the
  fully composed source-to-output dynamic sequence has not yet passed replay QA.

## Iteration 17 — continuous writing, scroll ownership, and later worlds

- `SOURCE` — The reference hero identity is one model mesh. The visible
  `hello` has continuous joined counters and only global terminals; the
  screenshot does not expose a flat end at every letter boundary.
- `PARTIAL` — Maka now translates that topology as one sampled open curve with
  shared sphere caps at `t=0` and `t=1`. Exact control points, radius, color,
  and material response are Maka-owned `GUESS` values verified by local
  desktop and compact screenshots.
- `SOURCE` — The reference's long page keeps its shell fixed while vertical
  scroll hands ownership between the Hero, Work grid, multi-stage dark
  HyperSpace world, and bright pixel finale.
- `PARTIAL` — Maka translates the input mechanism into four fixed semantic
  states driven by the same wheel/trackpad, touch-swipe, keyboard, nav, and
  hash state machine. It intentionally does not reproduce the reference's
  10,199px document length or exact Lenis timing.
- `SOURCE` — The later dark reference state is not a workflow card layout. A
  radial streak field and one display statement own the entire viewport.
- `PARTIAL` — Maka's Runtime uses an original Canvas2D perspective field whose
  streak palette maps to actual Event Log categories and whose hub remains the
  real `Request → AgentRun → Event Log → Projection → Recovery` architecture.
- `SOURCE` — The bright reference finale uses large decoded/pixel typography,
  asymmetric objects, and persistent cursor residue rather than four equal
  feature cards.
- `PARTIAL` — Maka's Surfaces finale decodes its own statement and projects the
  same execution into Desktop, TUI, CLI, and Headless at unequal scales. Copy
  and surface facts remain sourced from Maka's public repository.

## Principles to carry into Maka

1. **Make the interface feel executable.** Use workspace coordinates, runtime
   state, and command-like controls as real product signals rather than fake
   terminal decoration.
2. **Let motion explain architecture.** A visual field should react to task
   events, permission boundaries, tools, and artifacts—not float aimlessly.
3. **Use one persistent spatial grammar.** A measured grid can connect hero,
   product proof, architecture, and CTA without repeated card grids.
4. **Separate semantic DOM from the expressive renderer.** Maka's story remains
   accessible and indexable when WebGL is unavailable or reduced motion is set.
5. **Budget effects like product code.** Gate by visibility, cap DPR/workload,
   provide a static fallback, and dispose GPU resources.
6. **Translate, do not imitate.** The reference's portfolio language becomes a
   local-agent workspace language: sessions, tools, permissions, artifacts, and
   recoverable task progress.

## Explicit anti-copy rules

- Do not reuse the reference's name, biography, project list, custom fonts,
  source bundle, image assets, or exact shader code.
- Do not reproduce its complete section order or exact typography/layout ratios.
- Do not use its acid green as Maka's brand color unless the independent Maka
  palette process selects a related hue for product reasons.
- Do not ship a fake terminal aesthetic. Any technical data shown on the Maka
  page must correspond to an actual product capability or architecture fact.

## Implementation snapshot — 2026-07-24

The sections above are a working log; several intermediate approaches they
describe were superseded. Current state of the build:

- **Wordmark** — per-letter Pacifico bezier outlines (generated into
  `src/scripts/maka-letter-paths.ts`; interior letters polygon-clipped at
  0.985× advance to amputate cross-letter exit tails, counters preserved via
  even-odd clipping), extruded with a deep round bevel and rendered by a
  custom screen-space-refraction glass shader. Shader constants come from
  pixel measurements of the reference render (documented in this file):
  near-uniform powder sky, rim- and arc-carried blue, warm transmitted
  bands, 0.025 refraction grain. The pixel-skeleton tube pipeline described
  earlier is retired.
- **Field calibration** — whole-frame saturation histogram matched to the
  reference (0.469 vs 0.496); composition split (white/blue/mid) verified
  identical at 6/80/14.
- **Crafted surfaces** — the site ships zero product photography: the
  Product task window, its evidence cards, and the Surfaces desktop
  miniature are hand-built DOM with real product semantics.
- **Shell grammar** — dashed instrument frames (nav, evidence tabs, 404
  actions), [1]-[4] key hints, fiducial grid crosses, footer telemetry row
  (pointer coordinates, GMT stamp, view status).
- **Life** — per-letter float, steady star glints, pointer sparkle wake,
  companion arrow, sticker cast with hover wiggle (eyes, heart, seal, pixel
  hand, frosted bolt, yellow smiley), pixel-block decode finale, theme
  cross-fade driven by one damped night mix.
- **Power ladder** — hero renders full-rate while interacting, half-rate
  after 8s of ambient idle, and parks entirely off the Overview stage;
  `data-power` exposes the state for tests.
