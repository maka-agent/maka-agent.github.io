# Maka Homepage Design Brief

## 1. Feature Summary

A production-ready, responsive brand homepage for Maka and `maka-agent.com`. It introduces a skeptical technical audience to Maka's local-first execution model, supports claims with real product and architecture evidence, and routes qualified visitors to the public GitHub repository.

## 2. Primary User Action

Understand that Maka turns agent conversations into inspectable, recoverable work, then choose **View source**. **Read architecture** is the evidence-first alternative.

## 3. Design Direction

- **Color strategy:** Restrained. Cool neutrals carry the working plane; Maka blue is a scarce live-state signal below 10% of the surface.
- **Scene sentence:** A developer reviews an agent's work at a daylight desk, with the calm focus of an instrument panel where every action, permission, and output can be inspected.
- **Anchor references:** Maka's official desktop workspace and Design System; `haoqi.design` for measured spatial grammar and DOM/WebGL cooperation; technical architecture drawings for signal paths and evidence labels.
- **Selected visual probe:** Direction A. It keeps an open 12-column plane, places a real Artifact screenshot beside the claim, and uses an original execution field rather than a fixed portfolio sidebar. Direction B's near-black architecture band is retained as a later pacing change; its sidebar is rejected as too reference-literal.

## 4. Scope

- **Fidelity:** Production-ready.
- **Breadth:** One complete long-form homepage with hero, proof, execution model, architecture, trust boundary, surfaces, and final CTA.
- **Interactivity:** Shipped-quality navigation and links; a performant WebGL2 execution field coupled to pointer, scroll, resize, and section state; semantic static fallback.
- **Time intent:** Polish until it builds, tests, deploys, and serves successfully on `maka-agent.com` over HTTPS.

## 5. Layout Strategy

A fixed, hairline navigation and edge telemetry sit over a fluid 12-column working plane. The hero separates identity, thesis, CTAs, and execution field across different zones instead of centering a conventional SaaS stack. Long-form pacing alternates open statement sections, one authentic product frame, a horizontal execution ledger, and one near-black architecture section. The structure re-composes to a single-column mobile sequence rather than shrinking the desktop grid.

## 6. Key States

- **Default:** Full semantic story with the live execution field.
- **WebGL unavailable:** Static SVG/CSS execution map retains composition and meaning.
- **Reduced motion:** No continuous animation, pointer tracking, or scroll interpolation; a still field and instant state changes remain.
- **Loading:** Core HTML, CTA, and fallback appear before the deferred renderer; product imagery reserves dimensions to avoid layout shift.
- **Asset failure:** Alt text and surrounding proof copy keep the claim understandable.
- **Narrow/zoomed:** Navigation condenses, telemetry moves into the document flow, screenshots remain pan-free, and no headline overflows.

## 7. Interaction Model

The renderer treats pointer position as coordinates, highlights one task path, and changes arrangement as the reader reaches product proof, architecture, and trust sections. Scroll updates are passive and sampled in `requestAnimationFrame`; section work is gated with `IntersectionObserver`. Navigation uses native anchors with visible focus and reduced-motion-safe scrolling. No core fact depends on hover or animation.

## 8. Content Requirements

Use only claims verifiable in the official README, architecture, security, and design documentation. Required media are official screenshots of the Artifact pane, first-run provider setup, and error handling. Required copy covers local-first storage, Event Log recovery, Tool Calls and permissions, artifacts, Desktop/TUI/CLI/Headless surfaces, source-first maturity, and the GitHub/architecture CTAs. No fake customer proof, metrics, downloads, or availability promises.

## 9. Recommended References

- `layout.md` for measured grid, rhythm, and mobile recomposition.
- `typeset.md` for the Geist sans/mono hierarchy and fluid display scale.
- `animate.md` for one orchestrated execution-field motion system and reduced motion.
- `colorize.md` for restrained OKLCH usage and contrast.
- `adapt.md` for touch, safe areas, narrow widths, and content-driven breakpoints.

## 10. Open Questions

None blocking. The user delegated remaining visual and technical decisions and requested uninterrupted execution through verified public deployment.
