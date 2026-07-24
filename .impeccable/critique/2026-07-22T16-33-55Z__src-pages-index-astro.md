---
target: 当前 Maka 首页标志
total_score: 26
p0_count: 0
p1_count: 2
timestamp: 2026-07-22T16-33-55Z
slug: src-pages-index-astro
---
Method: dual-agent (A: visual_review · B: detector_evidence)

# Maka hero wordmark critique

## Nielsen heuristic score

| Heuristic | Score | Assessment |
|---|---:|---|
| Visibility of system status | 2/4 | View state exists, but direct-hash/header behavior needs regression coverage. |
| Match with the real world | 3/4 | Product language is credible; decorative objects do not consistently map to execution concepts. |
| User control and freedom | 3/4 | Keyboard, wheel, touch and hash navigation exist; long transitions and gesture locking slow scanning. |
| Consistency and standards | 3/4 | Evidence typography is coherent; the candy-script object conflicts with the exact/capable brand voice. |
| Error prevention | 2/4 | Navigation and overflow behavior need explicit direct-hash tests. |
| Recognition rather than recall | 3/4 | Main CTAs are clear; unlabeled satellites depend on interpretation. |
| Flexibility and efficiency | 3/4 | Multiple inputs are supported; power-user scanning is still overly authored. |
| Aesthetic and minimalist design | 2/4 | Wordmark, H1, intro, stickers, satellites and glints compete in one viewport. |
| Help users recover from errors | 2/4 | Reduced-motion and WebGL fallbacks exist; navigation anomalies have no visible recovery. |
| Help and documentation | 3/4 | Source and architecture paths are honest and useful. |
| **Total** | **26/40** | **Acceptable foundation; identity and hierarchy require significant refinement.** |

## Anti-pattern verdict

This is not generic SaaS AI slop: the WebGL construction, fallbacks and product evidence are bespoke. It does, however, retain a strong reference-prompted-remix signature. The measurement grid, light-blue field, three-column intro, central soft word, stickers, oversized black statement and telemetry closely reuse Haoqi's compositional grammar. Maka has changed the noun and several assets without yet changing enough of the visual logic.

## Overall impression

The move from an abstract tube to a literal `Maka` is a large improvement. The remaining discomfort comes from a mismatch across three layers: Pacifico supplies a sweet, familiar silhouette; the material turns it into glossy inflatable candy; the surrounding copy promises a calm, exact, inspectable engineering instrument. Each layer is individually competent, but their combined brand signal is unresolved.

The highest-leverage move is not another material tweak. It is a custom redraw of the silhouette, followed by calmer material and a stricter hierarchy around it.

## Strengths

- The project name is immediately legible and memorable; the hero no longer depends on interpreting an abstract object.
- The 3D build has real craft: extruded outlines, separate front/edge materials, restrained pointer response, reduced-motion handling and a semantic fallback.
- `View source` and `Read architecture` are strong, honest proof points for a source-first technical audience.

## Prioritized issues

### P1 — The silhouette is still Pacifico, not a proprietary Maka logotype

The capital `M` behaves like repeated lowercase arches and occupies too much of the word. The `k` ascender is tall and rigid, the two `a` counters are tight, and the joins do not share one deliberate rhythm. In black silhouette, it reads as “a script font made 3D,” not an ownable mark.

Direction: redraw the outline before touching effects. Narrow the `M` by roughly 10–15%, make its entry stroke distinct from the inner arches, lower the `k` ascender by roughly 10–15%, open both `a` counters, normalize baseline joins, and simplify the terminal. Preserve softness, but introduce controlled asymmetry and clearer stroke rhythm.

### P1 — The material metaphor conflicts with the brand promise

The bright cyan face, dark blue side wall, large bevel, rim shell and glints create an inflatable candy/plastic signal. Maka's stated personality is `calm, exact, capable`, closer to a daylight command instrument. The object currently says playful portfolio before it says trustworthy local execution.

Direction: retain translucency but reduce bevel size by roughly 30–40%, depth by about 20%, and lower clearcoat/rim/specular intensity. Use a milky, slightly denser body with softer internal light transport and fewer point highlights. Shape should provide identity; material should support it.

### P2 — The hero has no stable focal hierarchy or quiet zone

On desktop, the 3D word occupies roughly `x310–1370, y306–655`; the H1 occupies `x70–1028, y545–738`, so they overlap substantially. The sticker, seal and satellites introduce additional high-contrast peaks. The wordmark is simultaneously asked to be a logo, a background sculpture and an interactive demo.

Direction: choose one primary role. If it is the identity object, give it 10–15% visual quiet space, move the H1 lower or reduce it one scale step, and push satellites to the perimeter. Remove or demote the `OPEN SOURCE` sticker because it repeats the CTA without adding proof.

### P2 — The page borrows Haoqi's composition more clearly than it expresses Maka's system

The similarity is now structural rather than incidental. A skeptical builder may see a polished reference remake before they see the distinctive execution model.

Direction: keep the spatial confidence but replace decorative symbols with labeled, real Maka concepts: intent, permission, tool call, artifact and recovery. Let transitions reveal those relationships. The test is whether the hero remains unmistakably Maka after all copy and the word itself are blurred.

### P2 — Typography and motion sharpen a page that wants to feel soft and exact

The H1 uses `letter-spacing: -0.055em`, tighter than the design-system floor of `-0.04em`, creating dense black texture against the round mark. The long authored transitions and simultaneous glints/parallax/float effects add spectacle but reduce calm and scan efficiency.

Direction: relax the H1 to `-0.04em` or slightly looser, soften its weight or scale, restrict animated emphasis to one event at a time, and keep glints away from counters and joins. The mark should breathe rather than continuously advertise its shader.

## Persona red flags

- **Jordan, first-time visitor:** recognizes the name, but cannot infer the product model from the key, seal, ring and sticker without labels.
- **Riley, skeptical engineering lead:** may treat the page as design spectacle because real execution proof appears after a hero heavily shaped by a known reference.
- **Casey, keyboard/power user:** benefits from shortcuts but loses scanning speed to 1.3–1.9 second transitions and gesture locking.
- **Technically sophisticated builder:** will appreciate source and architecture links, but may question brand originality and the semantic purpose of decorative WebGL assets.

## Minor observations

- The front face becomes nearly white in its brightest regions, so volume is defined mostly by the blue edge.
- The broad elliptical ground shadow reinforces an inflatable sign rather than a precisely grounded object.
- Four glint anchors may not be optically re-bound to the new Pacifico outline; highlights near joins read like geometry seams.
- The cursor can appear near the `k` silhouette as if the glyph is broken; it needs stronger z/silhouette exclusion.
- `OPEN SOURCE` repeats the primary CTA and adds more visual value than information value.
- Detector CLI returned zero findings; the browser overlay found six. Five `wide-tracking` hits are short uppercase mono labels, not body copy, and are false positives for that rule. `clipped-overflow-container` is intentional for the one-viewport stage, though hash behavior still deserves manual E2E coverage.

## Questions to consider

1. What should the mark fundamentally feel like: **soft precision instrument**, **milky translucent sculpture**, or **playful candy object**?
2. What is the hero wordmark's primary role: **identity/logo**, **background sculpture**, or **interactive product metaphor**?
3. How far should the next pass depart from Haoqi: **retain spatial grammar but replace assets**, **retain only the light/grid atmosphere**, or **create a distinct Maka composition**?
4. Which real Maka concept should replace decorative stickers: **permission boundary**, **tool call → artifact**, or **recoverable execution checkpoint**?

## Run notes

- Slug: `src-pages-index-astro`
- Ignore list: none; `.impeccable/critique/ignore.md` was absent.
- Assessment independence: Assessment A completed without seeing detector evidence; Assessment B completed without seeing Assessment A.
- CLI detector: `detect.mjs --json src/pages/index.astro` exited 0 with `[]` (0 findings).
- Browser visibility: Chrome extension used a new agent-created tab at the production URL; no dedicated visibility capability was available.
- Overlay injection: external `detect.js` loaded from temporary localhost server; six overlays were rendered. Browser results were manually reviewed and classified as false-positive rule matches.
- Live server cleanup: PID 52853 / port 8400 stopped and verified absent.
- Temp cleanup: browser overlay/scripts removed, page title and viewport restored, temporary browser tab closed; no project files were modified by the evidence reviewer.
- Fallback signal: screenshots, DOM geometry, computed styles and console logs were used because browser visibility control was unavailable.
