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
| [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) | Niche taxonomy, artifact schemas, API surface, storage layout |
| [`docs/DATABASE.md`](docs/DATABASE.md) | Full database schema (11 core tables), ERD, relationships, integrity rules |
| [`docs/SCALING.md`](docs/SCALING.md) | Scaling strategy to 100,000 users + production deployment architecture |
| [`docs/GENERATION_ENGINE.md`](docs/GENERATION_ENGINE.md) | The generation engine: structure, layout, content, components, animations, motion — driven by per-niche rule sets |
| [`docs/NICHE_PLAYBOOKS.md`](docs/NICHE_PLAYBOOKS.md) | Twelve launch niches (Auto Dealer → Contractor), each with exclusive hero families, signature sections, and its own generation rules |
| [`docs/DESIGN_INTELLIGENCE.md`](docs/DESIGN_INTELLIGENCE.md) | The Design Intelligence Engine: color, typography, motion, and layout intelligence calibrated to Apple/Stripe/Porsche/Linear/Arc/Notion-grade disciplines, with automatic design-language selection per niche |
| [`docs/CONTENT_INTELLIGENCE.md`](docs/CONTENT_INTELLIGENCE.md) | The Content Intelligence Engine: voice contracts, copy frameworks as genre, the specificity engine, four-pass generation, SEO as a content layer |
| [`docs/STUDIO.md`](docs/STUDIO.md) | The Preview Studio: semantic editing ("make the hero calmer") compiled to typed ops, immutable versioning, gated publish flow |

## Non-negotiables

Every generated site ships with premium animations, premium typography,
premium layouts, mobile-first design, accessibility (WCAG 2.2 AA), SEO, and
conversion optimization — enforced by automated quality gates, never left to
chance. Generic output is rejected by a uniqueness fingerprint before the
user ever sees it.
