# beyondBINARY quantum-prefixed | uvspeed | {n, +1, -n, +0, 0, -1, +n, +2, -0, +3, 1}

# Dither landing + Iron Dispatch — revision lineage

Recoverable checkpoints and file roles. **Use this when restoring** if work diverges.

| Artifact | Role | Notes |
|----------|------|--------|
| `web/dither-landing-scroll-lab-saved.html` | **Checkpoint A** | Snapshot of scroll-lab before dual-hero + legacy cube + dial 6-stop |
| `web/dither-landing.html` | **Current dither / qbitos scroll lab** | Double hero (`s-hero`, `s-hero-2`), legacy wireframe cube, vertical flow lines, depth + pong + pattern + dial + timeline + table |
| `web/iron-dispatch.html` | **Dispatch lab v3** | **Vertical Base Box** left rail + dial; Base Box top shell + Pong micro; **pattern wall** (QPU lattice): interactive grid + **40× mini Pong** tiles; full-viewport **ASCII + ordered-dither** trail canvas (replaces old particle layer); green **DepthGrid** minis; vertical grid **gutters**; **VerticalDialNav** sections; light-field cards; grid-hover **columns + snippet rail**; BPM map; snapshot: `iron-dispatch-v2-snapshot.html` |
| `web/iron-dispatch-v2-snapshot.html` | **v2 checkpoint** | Pre–v3 layout (particles, right-rail dial, etc.) |
| `web/dither-iron-dispatch-revision-log.md` | **This file** | Human-readable version map |

## Chronology (dither-landing thread)

1. **Initial scroll lab** — Single hero, depth canvas, vertical line flow, dial nav, pattern / boxes / timeline / data, loader, no cube (`dither-landing-scroll-lab-saved.html` approximates mid-flight snapshot).
2. **Dual hero + cube** — `s-hero-2` after `s-pattern`; `legacy-cube-canvas`; `initHeroSection` ×2; dial `0,1,0′,2,3,4`; dock link to iron-dispatch.
3. **Iron dispatch v1** — Three columns, beat map, `prefixDAC`, `BroadcastChannel('iron-line')`, depth mini + pattern micro.
4. **Iron dispatch v2** — Top [Base Box](https://www.framer.com/marketplace/components/base-box/) shell, [Pong-loader](https://www.framer.com/marketplace/components/pong-loader/) micro playfield, crisp [vertical grid line](https://www.framer.com/marketplace/components/vertical-grid-lines/) hairlines, [VerticalDialNav](https://www.framer.com/marketplace/components/verticaldialnav/) scroll sections, [Sampling](https://www.framer.com/marketplace/components/sampling/)-style layer resolve, particles + dot-grid ambience, [grid hover](https://www.framer.com/marketplace/components/grid-hover-effect/) snippet rail, depth cubes — frozen in `iron-dispatch-v2-snapshot.html`.
5. **Iron dispatch v3** — Vertical gradient **Base Box** rail + left dial; [DepthGrid3DFX](https://www.framer.com/marketplace/components/depthgrid3dfx/)-style greens; [Interactive Pattern](https://www.framer.com/marketplace/components/interactive-pattern/)-style **pattern wall** with evenly spaced **Pong** cells; live [ASCII Flow Trail](https://www.framer.com/marketplace/components/ascii-flow-trail/)-inspired glyph trail + ordered dither field.

## Framer reference index (design parity)

- [Vertical Grid Lines](https://www.framer.com/marketplace/components/vertical-grid-lines/) — 1px rails + glowing segments  
- [Base Box](https://www.framer.com/marketplace/components/base-box/) — gradient frame, inner calm surface  
- [Pong Loader](https://www.framer.com/marketplace/components/pong-loader/) — minimal retro motion  
- [VerticalDialNav](https://www.framer.com/marketplace/components/verticaldialnav/) — fixed section dial  
- [Grid Hover Effect](https://www.framer.com/marketplace/components/grid-hover-effect/) — cell colour on hover  
- [Sampling](https://www.framer.com/marketplace/components/sampling/) — resolution / buffer reveal metaphor  
- [Gravity Particles](https://www.framer.com/marketplace/components/gravity-particles/) — attract / drift field  
- [Modern Dot Grid](https://www.framer.com/marketplace/components/interactive-dot-gird/) — dot distortion radius  
- [DepthGrid3DFX](https://www.framer.com/marketplace/components/depthgrid3dfx/) — depth plane + cube readout  
- [Magnetic Image Trail](https://www.framer.com/marketplace/components/magnetic-image-trail/) — cursor lag / swarm  
- [ASCII Flow Trail](https://www.framer.com/marketplace/components/ascii-flow-trail/) — ASCII particle / dither ambience  
- [Interactive Pattern](https://www.framer.com/marketplace/components/interactive-pattern/) — proximity grid / lattice underlay  

## Restore commands

```bash
# Restore scroll lab backup over working file (destructive — commit or copy first)
cp web/dither-landing-scroll-lab-saved.html web/dither-landing.html
```
