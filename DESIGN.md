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
typography:
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

The website translates Maka's official Companion Command Center into a public, evidence-led brand surface. It feels like a precise work instrument opened in daylight, led by a glass `MAKA` wordmark with Task, Tool, Artifact, Permission, and Recovery objects moving around it. The sculpture establishes the project name first; the satellites then explain durable execution through real product concepts.

The measured grid, edge telemetry, and DOM/WebGL cooperation come from the reference study, but the content model is Maka's own: task, turn, Tool Call, permission, artifact, Event Log, and recovery. Generic AI tool marketing, fake terminal theatre, and card-grid SaaS composition are prohibited.

**Key Characteristics:**

- One readable glass `MAKA` wordmark instead of an anonymous abstract sculpture or stacked marketing cards.
- A committed daylight-blue Overview, a proof-first paper Product state, and a near-black Runtime state.
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

### Execution Field

A fixed WebGL2 canvas builds the `MAKA` name from twelve rounded glass strokes. The four letters retain a stable, readable silhouette while receiving slight independent yaw and depth motion; Task, Tool, Artifact, Permission, and Recovery objects orbit as secondary evidence. Each object has its own depth factor and delta-time damping instead of moving as a single group. Pointer velocity tilts and compresses the 3D execution cursor, drives a restrained blue-white light field, creates a short-lived directional light trail, and briefly advances foreground objects in depth. Deliberately restrained exposure preserves blue midtones and dark silhouettes instead of clipping the wordmark to white. Section state changes the composition and opacity while the semantic DOM remains complete. The renderer is decorative enhancement only: semantic labels and a static SVG `MAKA` wordmark carry the same identity when WebGL, JavaScript, or motion is unavailable.

### Product Proof Frame

Authentic Maka screenshots retain their original aspect ratio and UI text. A frame may cross columns but never receives invented browser chrome, fake status, or generated metric overlays. Alt text describes the work shown, not “screenshot.”

One source image may appear once as the complete task context and once as a clearly labeled detail crop when the crop reveals otherwise unreadable product evidence. The detail never rearranges or redraws the underlying interface, and its entrance follows the main frame so the relationship remains legible.

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
- **Don't** make a surface-level clone of `haoqi.design`, including its acid green, exact section order, typography ratios, portfolio content, custom fonts, or shader code.
- **Don't** use gradient text, side-stripe accents, decorative grid wallpaper, cream/sand backgrounds, or card radii above 16px.
