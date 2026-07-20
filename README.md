# SiteForge

**SiteForge is not a website builder. It is an AI-powered website generation
platform** — users pick a niche, a style, and a quality level, and SiteForge
generates a complete business website indistinguishable from high-end agency
work.

## Status

**Architecture phase.** The platform is fully designed; implementation has not
started (by design — see the phased roadmap).

## Read the design

Start with [`ARCHITECTURE.md`](ARCHITECTURE.md), then:

| Document | What it covers |
|---|---|
| [`docs/PIPELINE.md`](docs/PIPELINE.md) | The 8-stage generation pipeline: brief synthesis → design tokens → IA planning → content → composition → assets → quality gates → repair loop |
| [`docs/DESIGN_DNA.md`](docs/DESIGN_DNA.md) | The anti-generic engine: design archetypes, token generators, the motion language, the section pattern library, uniqueness fingerprinting |
| [`docs/QUALITY.md`](docs/QUALITY.md) | Quality tiers (Standard/Premium/Signature), the 7 automated gates, and the benchmark rubric vs. Lovable, Bolt, Replit AI, v0, and agency work |
| [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) | Entities, niche taxonomy, artifact schemas, API surface, storage layout |

## Non-negotiables

Every generated site ships with premium animations, premium typography,
premium layouts, mobile-first design, accessibility (WCAG 2.2 AA), SEO, and
conversion optimization — enforced by automated quality gates, never left to
chance. Generic output is rejected by a uniqueness fingerprint before the
user ever sees it.
