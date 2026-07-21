# Haoqi.design reference study

This document records transferable design and rendering principles observed on
`https://haoqi.design/`. It is not a cloning specification. Maka's website will
use original copy, composition, assets, and shaders.

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

### Typography and color

- `SOURCE` — The reference uses three deliberate font roles: a variable sans for
  identity/display, a readable mono for explanatory copy, and a sharper mono for
  navigation/telemetry.
- `SOURCE` — Light theme base is `rgb(251 250 244)` with black primary text,
  `rgba(54 54 48 / 0.6)` secondary text, `rgba(54 54 48 / 0.1)` grid lines,
  and an acid-green selection/accent color.
- `SOURCE` — Navigation and identity are 16px/24px. The hero statement measured
  71.68px/71.68px at 1280px wide.
- `PARTIAL` — Maka should preserve the three-role typographic contrast, not copy
  the reference's `tiktok`, `mono`, or `tronica-mono` font files.

### Motion and interaction

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
- `SOURCE` — The fluid renderer ping-pongs velocity targets and has explicit
  render-target disposal and resize paths.
- `PARTIAL` — The captured browser remained on the WebGL loading surface, so the
  fully composed source-to-output dynamic sequence has not yet passed replay QA.

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
