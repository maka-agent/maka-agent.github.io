---
name: Maka Website
description: The public companion command center for Maka's local-first agent workspace.
colors:
  maka-blue: "oklch(0.70 0.135 250)"
  maka-blue-strong: "oklch(0.62 0.15 250)"
  maka-blue-text: "oklch(0.52 0.16 250)"
  signal-wash: "oklch(0.95 0.025 250)"
  working-plane: "oklch(0.985 0.003 250)"
  clear-surface: "oklch(1 0 0)"
  cool-surface: "oklch(0.96 0.006 250)"
  zinc-ink: "oklch(0.17 0.005 286)"
  secondary-ink: "oklch(0.43 0.008 276)"
  hairline: "oklch(0.88 0.008 250)"
  night-surface: "oklch(0.205 0.004 286)"
  night-ink: "oklch(0.92 0.004 286)"
  night-secondary: "oklch(0.72 0.006 286)"
  night-muted: "oklch(0.64 0.006 286)"
  night-line: "oklch(0.36 0.006 286)"
  night-control: "oklch(0.42 0.006 286)"
  night-code: "oklch(0.84 0.006 286)"
  night-hover: "oklch(0.24 0.008 286)"
  scene-blue-pearlescent: "#78b9f4"
  scene-blue-wordmark: "#1f70b8"
  scene-blue-glass: "#2f83ce"
  scene-blue-signal: "#2e83de"
  scene-blue-ring: "#285e91"
  scene-blue-particle: "#2b5d8d"
  scene-permission-amber: "#ff9f1c"
  scene-success-green: "#47d58a"
  runtime-black: "#01030a"
  runtime-cyan: "#18dcff"
  runtime-blue: "#6baeff"
  runtime-artifact: "#d8f7ff"
typography:
  wordmark:
    fontFamily: "Pacifico, Brush Script MT, cursive"
    fontSize: "responsive 3D outline"
    fontWeight: 400
    lineHeight: 0.8
    letterSpacing: "-0.04em"
  display:
    fontFamily: "Geist Variable, system-ui, sans-serif"
    fontSize: "clamp(3.25rem, 7vw, 6rem)"
    fontWeight: 650
    lineHeight: 0.94
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Geist Variable, system-ui, sans-serif"
    fontSize: "clamp(2rem, 4.5vw, 4.5rem)"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Geist Variable, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "Geist Variable, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Geist Mono Variable, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.08em"
  caption:
    fontFamily: "Geist Mono Variable, ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
  evidence:
    fontFamily: "Geist Mono Variable, ui-monospace, monospace"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.4
  micro:
    fontFamily: "Geist Mono Variable, ui-monospace, monospace"
    fontSize: "0.625rem"
    fontWeight: 500
    lineHeight: 1.4
  code-micro:
    fontFamily: "Geist Mono Variable, ui-monospace, monospace"
    fontSize: "0.5625rem"
    fontWeight: 500
    lineHeight: 1.4
  body-small:
    fontFamily: "Geist Variable, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
  body-large:
    fontFamily: "Geist Variable, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
  title-small:
    fontFamily: "Geist Variable, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
rounded:
  control: "6px"
  surface: "8px"
  modal: "12px"
  pill: "999px"
spacing:
  base: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
  3xl: "64px"
  4xl: "96px"
components:
  button-primary:
    backgroundColor: "{colors.zinc-ink}"
    textColor: "{colors.clear-surface}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "14px 18px"
  button-signal:
    backgroundColor: "{colors.maka-blue}"
    textColor: "{colors.zinc-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "14px 18px"
  button-ghost:
    backgroundColor: "{colors.working-plane}"
    textColor: "{colors.zinc-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "14px 18px"
  product-frame:
    backgroundColor: "{colors.clear-surface}"
    textColor: "{colors.zinc-ink}"
    rounded: "{rounded.surface}"
    padding: "4px"
---

# Design System: Maka Website

## 1. Overview

**Creative North Star: "The Maka Instrument Wordmark"**

The website translates Maka's official Companion Command Center into a public, evidence-led brand surface. It feels like a precise work instrument opened in daylight, led by an organic glass `Maka` wordmark with Task, Tool, Artifact, Permission, and Recovery objects moving around its perimeter. The sculpture establishes the project name first; the satellites then explain durable execution through real product concepts.

The measured grid, edge telemetry, and DOM/WebGL cooperation come from the reference study, but the content model is Maka's own: task, turn, Tool Call, permission, artifact, Event Log, and recovery. Generic AI tool marketing, fake terminal theatre, and card-grid SaaS composition are prohibited.

**Key Characteristics:**

- One readable glass `Maka` wordmark instead of an anonymous abstract sculpture or stacked marketing cards.
- A committed daylight-blue Overview, a proof-first paper Product state, and a near-black Runtime state.
- One Event Log-led runtime path instead of a simultaneous architecture-node collage.
- Large exact typography paired with compact runtime evidence.
- Real product screenshots integrated into the spatial narrative.
- One purposeful execution-field motion system with a complete static fallback.

## 2. Colors

Cool achromatic surfaces carry the page; blue appears only when something is actionable, selected, focused, or actively executing.

### Primary

- **Maka Signal Blue:** Primary actions, focus, selected paths, and live execution state. Its rarity is the identity.
- **Maka Signal Strong:** Hover and active treatment where the normal signal needs one darker step.
- **Signal Wash:** A low-chroma state surface for selected proof labels and focus-adjacent context.

### Neutral

- **Working Plane:** The main page background, tinted only enough to belong to Maka's hue family.
- **Clear Surface:** Product screenshots, compact overlays, and content that must read as a direct object.
- **Cool Surface:** Tonal grouping without decorative transparency.
- **Zinc Ink:** Primary text and structural dark fields.
- **Secondary Ink:** Supporting prose that still passes body-text contrast.
- **Hairline:** Measurement rules and ownership boundaries.
- **Night Surface / Night Ink:** The architecture section's inverse working plane.

### Named Rules

**The Signal, Not Texture Rule.** Blue communicates action or runtime state. It never becomes a background flood, gradient, glow, or decorative atmosphere.

**The Three-State Color Rule.** Overview commits to daylight blue as atmosphere, Product removes it so real UI evidence dominates, and Runtime moves to near-black. Saturated signal blue remains scarce inside controls and evidence labels.

**The Semantic Satellite Rule.** Amber appears only on permission boundaries and green only on completed execution. They stay on small 3D satellites and never become decorative section colors.

## 3. Typography

**Display Font:** Geist Variable (with metric-compatible system sans fallbacks)
**Body Font:** Geist Variable (with system sans fallbacks)
**Label/Mono Font:** Geist Mono Variable (with platform monospace fallbacks)

**Character:** The sans voice is mechanical enough to feel executable but open enough for long reading. Mono is evidence, never costume; it appears only for paths, coordinates, commands, runtime labels, and aligned data.

### Hierarchy

- **Display** (650, fluid 3.25–6rem, 0.94): Hero and one high-impact statement per major pacing shift.
- **Headline** (600, fluid 2–4.5rem, 1): Section claims and architecture statements.
- **Title** (600, 1.25rem, 1.25): Proof labels and product concepts.
- **Body** (400, 1rem, 1.6): Explanatory copy capped at 68ch.
- **Label** (500, 0.75rem, 0.08em tracking): Short runtime evidence and navigation only; never a repeated eyebrow above every section.

### Named Rules

**The Native Evidence Rule.** Mono is reserved for code, paths, coordinates, commands, identifiers, and numeric evidence. Marketing sentences always use the sans voice.

**The One Statement Rule.** Only one text block per viewport earns display scale. Display tracking never goes tighter than -0.04em.

## 4. Elevation

The system is flat by default. Depth comes from tonal separation, full-perimeter hairlines, occlusion, and the physical overlap of real product imagery across the measurement grid. A very small screenshot shadow is allowed only to distinguish an application window from the page; controls never combine a decorative border with a wide soft shadow.

### Shadow Vocabulary

- **Product Lift** (`0 6px 8px oklch(0.17 0.005 286 / 0.08)`): Only for full product frames crossing the working plane.
- **Navigation Separation** (`0 1px 0 oklch(0.88 0.008 250)`): A structural bottom rule, not floating elevation.

### Named Rules

**The One Working Plane Rule.** Dividers express responsibility; shadows never fragment the page into a dashboard.

**The Honest Glass Rule.** Blur and transparency never substitute for hierarchy. Navigation remains opaque enough to preserve contrast.

## 5. Components

### Buttons

- **Shape:** Compact instrument control with a restrained curve (6px).
- **Primary:** Zinc Ink with Clear Surface text, 14×18px padding, used for **View source**.
- **Signal:** Maka Blue with high-contrast Zinc Ink, reserved for the single active path when appropriate.
- **Hover / Focus:** Color shifts in 140–220ms; focus uses a 2px Maka-blue outline with 3px offset. No bounce, glow, or elastic motion.
- **Ghost:** Working Plane with a full hairline boundary, used for **Read architecture**.

### Chips

- **Style:** Only for real state labels such as local, inspectable, or recoverable; compact mono text, full hairline, and no decorative pill cloud.
- **State:** Selected chips use Signal Wash plus a leading shape so color is not the only cue.

### Cards / Containers

- **Corner Style:** Product surfaces use 8px; marketing sections do not become cards.
- **Background:** Clear Surface or Night Surface according to the working plane.
- **Shadow Strategy:** Product Lift only on authentic screenshot frames.
- **Border:** Full 1px Hairline when a real ownership boundary exists.
- **Internal Padding:** 16–24px for compact evidence; major sections use open grid space instead.

### Navigation

The fixed desktop navigation uses a compact wordmark, two evidence-led destinations, and one GitHub action. Mobile navigation keeps the GitHub action visible and collapses secondary anchors into a native `<details>` disclosure. All targets remain at least 44×44px.

The active single-viewport site exposes Overview, Product, Runtime, and Surfaces as `[1]`–`[4]` commands in the fixed shell. The visible hints and keyboard behavior must stay identical; Arrow keys remain a sequential alternative. Vertical wheel/trackpad gestures and touch swipes advance the same ordered state machine with an accumulator, one-step gesture lock, and non-looping edge resistance. Initial shell items reveal as one short orchestrated sequence, while `prefers-reduced-motion` renders them immediately.

The shell also exposes one `THEME [T]` command beside the GitHub action. It flips the whole stage between the daylight system and a Night system built from the product's own Night Surface tokens: deep night-blue Overview atmosphere with dimmed light bands and lowered renderer exposure, Night Surface paper for Product and Surfaces, and unchanged near-black Runtime. The preference persists in `localStorage`, seeds from `prefers-color-scheme`, keeps WCAG AA contrast (verified by Axe in both themes), and follows the product's Dark Restraint Rule—tonal separation, no neon, no lifted-everything styling.

Surfaces is the closing state. It returns the stage to paper, decodes the "Same runtime. Every surface." statement through a constrained glyph pool as if a recorded execution were being replayed into words, and projects one record into four asymmetric outputs: a dominant authentic Desktop crop, a TUI panel, a single CLI strip, and a compact Headless TaskRun ledger. The semantic four-entry index remains aligned to those projections, while the final source action and colophon close the story. The decode animation is Maka-original: glyphs resolve left-to-right per character, reduced motion settles the text instantly, and the semantic statement stays available to assistive technology through a static `aria-label`.

### Persistent Telemetry

Desktop and fine-pointer layouts show four-digit viewport coordinates in the bottom shell. The readout initializes from the viewport center and then displays raw pointer pixels; the same pointer event feeds the light field and normalized Three.js input. DOM telemetry never displays the damped scene position, because legibility and physical response are separate consumers of one input. Compact and coarse-pointer layouts remove the coordinate readout instead of compressing the footer.

### Execution Field

A fixed WebGL2 canvas builds the literal `maka` silhouette from a deterministic Pacifico outline and exposes the project name as `Maka` semantically. Lowercase construction keeps all four letters on one calligraphic rhythm; the `k` ascender is optically shortened so it punctuates the word without splitting it into a dominant initial plus three attachments. The outline becomes one shallow, deeply rounded extruded solid with milky blue transmission, broad soft highlights, restrained rim/glow layers, and four moving glints. Two point lights traverse the full word width, while pointer light and velocity extend the highlight range without changing the readable silhouette. Task, Tool, Artifact, Permission, and Recovery objects remain smaller near the perimeter. The 3D cursor appears only after real pointer engagement, remains behind the word plane, and yields while the fixed header or footer owns the pointer. The renderer is suppressed outside Overview. Semantic labels and a static SVG `Maka` fallback preserve identity when WebGL, JavaScript, or motion is unavailable.

### Runtime Ledger Stage

Runtime preserves the real `Request → AgentRun → Event Log → Projection → Recovery` order on one ledger rail. `EVENT LOG` is the only display-scale object; incoming execution facts and outgoing projections remain smaller labels distributed around five center rings. A dedicated WebGL2 polar fragment shader reproduces the reference's source-derived 100-cell radial topology, deterministic hash distribution, scroll-speed ramp, trail contraction, reveal model, and `gl_FragCoord` coordinate system. Maka maps the streak palette to Tool Call cyan/blue, Permission amber, Artifact blue-white, and Recovery green. Entry animates from sparse to the locked `0.714` target state; compact viewports settle at a quieter density, and reduced motion renders one static field. Pointer input shifts the vanishing point only slightly. Inactive rendering stops rather than running a hidden canvas.

### Product Proof Frame

Authentic Maka screenshots retain their original UI text and are cropped only by an explicit viewport frame; they never receive invented browser chrome, fake status, or generated metric overlays. Alt text describes the work shown, not “screenshot.”

Product follows a single-dominant proof hierarchy. The current Artifact task owns roughly the rightmost two-thirds of the working plane; the left field carries concise claim and trust facts. Permission and Clarification appear once each as equal-width, depth-staggered supporting proofs that peek from behind the lead interface without covering the copy. Duplicate crops, floating callouts, unequal proof fragments, and card-grid pacing are prohibited because they make evidence compete with itself.

The dominant Artifact proof contains one native WebGL2 inspection layer. Pointer hover or keyboard focus expands a square-cell mask from the interaction point over 420ms with half-cosine easing; leave/focus-out reverses the same sequence. The layer resamples the exact underlying screenshot and applies only a restrained contrast/detail treatment, so it never invents a second product state. The semantic DOM image remains complete underneath, coarse pointers skip the context, reduced motion settles immediately, and WebGL failure removes only the enhancement.

The Overview → Product handoff uses an explicit two-frame preparation lifecycle so the hidden panel cannot skip its CSS transition. The paper scaffold and primary screenshot arrive first from the right in a low-saturation state; copy resolves from blur and offset next; the equal Permission and Clarification proofs rise last as the next row. Runtime uses the same lifecycle for its rail, phase labels, and central Event Log ring. `prefers-reduced-motion` removes both duration and delay so every state settles immediately.

Transition readiness follows the destination composition rather than one generic timeout: Overview clears at 900ms, Product at 1450ms, and Runtime at 1900ms. These markers cover the complete authored sequence and are removed immediately under `prefers-reduced-motion`. The visual rule is staged ownership: an outgoing owner may remain while the destination scaffold arrives, but two dominant owners and full-frame dead time are both prohibited.

### Initial Load Ownership

JavaScript-capable browsers begin with one compact `MAKA` loading owner instead of exposing the SVG fallback, shell, headline, and unfinished WebGL surface at the same time. Renderer readiness advances through `loading → field → shell → ready → complete`: the glass wordmark takes the plane first, the fixed shell follows, and Overview copy resolves only after the shell has established the coordinate system. A bounded timeout reveals the full semantic page and static SVG if the renderer module never completes. The SVG uses `xMidYMid meet`, so the literal `Maka` name remains complete rather than becoming a cropped oversized fragment on narrow viewports. No-JavaScript, renderer failure, and `prefers-reduced-motion` paths remain immediately understandable and never depend on entrance motion for access to content.

## 6. Do's and Don'ts

### Do:

- **Do** integrate real Maka screenshots beside the claim they prove.
- **Do** use Maka Blue only for action, focus, selection, and live state.
- **Do** keep semantic DOM content complete beneath the execution field.
- **Do** gate renderer work by visibility, cap DPR at 2, and provide reduced-motion and WebGL fallbacks.
- **Do** re-compose the grid for mobile with 44px touch targets and no horizontal reading scroll.

### Don't:

- **Don't** use generic AI tool marketing: purple-blue gradients, decorative glow, glassmorphism, sparkle, floating chat bubbles, or fake “thinking.”
- **Don't** use fake terminal aesthetics, invented commands, fake metrics, fake dashboards, testimonials, or capability claims unsupported by the official repository.
- **Don't** use mascots, anime characters, fake emotion, or avatar-led storytelling.
- **Don't** use identical card grids, hero-metric templates, bento layouts, or repeated tiny uppercase section eyebrows.
- **Don't** weaken a proven reference treatment merely to appear different. Copying geometry, timing, composition, or shader structure is acceptable; copying unrelated identity claims or portfolio content is not.
- **Don't** use gradient text, side-stripe accents, decorative grid wallpaper, cream/sand backgrounds, or card radii above 16px.
