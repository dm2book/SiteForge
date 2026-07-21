# SiteForge — Platform Architecture

> **SiteForge is not a website builder. It is an AI-powered website generation platform.**
>
> Mission: generate complete business websites that are indistinguishable from
> high-end agency work — and that outperform Lovable, Bolt, Replit AI, v0, and
> most freelance agency output.

This is the master architecture document. Detailed sub-designs live in `docs/`:

| Document | Covers |
|---|---|
| [`docs/PIPELINE.md`](docs/PIPELINE.md) | The multi-stage generation pipeline (the heart of the platform) |
| [`docs/DESIGN_DNA.md`](docs/DESIGN_DNA.md) | The anti-generic design system: archetypes, tokens, motion, section library |
| [`docs/QUALITY.md`](docs/QUALITY.md) | Quality tiers, automated quality gates, scoring rubric vs. competitors |
| [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) | Niche taxonomy, artifact schemas, API surface, storage layout |
| [`docs/DATABASE.md`](docs/DATABASE.md) | Full database schema, ERD, relationships, integrity rules |
| [`docs/SCALING.md`](docs/SCALING.md) | Scaling strategy to 100k users and the production deployment architecture |
| [`docs/GENERATION_ENGINE.md`](docs/GENERATION_ENGINE.md) | The generation engine: six outputs, niche rule sets, layout non-reuse enforcement |
| [`docs/NICHE_PLAYBOOKS.md`](docs/NICHE_PLAYBOOKS.md) | The twelve launch niche rule sets with exclusive hero families and signature sections |
| [`docs/DESIGN_INTELLIGENCE.md`](docs/DESIGN_INTELLIGENCE.md) | The Design Intelligence Engine: reference-grade disciplines, the Design Language object, five intelligence systems, automatic language selection |
| [`docs/CONTENT_INTELLIGENCE.md`](docs/CONTENT_INTELLIGENCE.md) | The Content Intelligence Engine: voice contracts, copy frameworks, the specificity engine, multi-pass generation, SEO intelligence |
| [`docs/STUDIO.md`](docs/STUDIO.md) | The Preview Studio: semantic edit grammar, partial-pipeline execution, versioning, publish flow |
| [`docs/3D_ENGINE.md`](docs/3D_ENGINE.md) | The 3D Engine: the 3D Value Judge, Three.js/R3F/GSAP runtime layers, scene pattern library, 3D asset pipeline, G8 gate |

---

## 1. Product philosophy → architectural consequences

Every architectural decision below traces back to four product laws:

1. **The output must feel handcrafted.** Therefore generation is *compositional,
   not template-based*. There is no "template gallery" that gets skinned. The
   system composes each site from a deep library of section patterns, design
   archetypes, and motion languages, driven by an AI creative brief — the same
   way an agency art director works.
2. **Never generate generic websites.** Therefore *uniqueness is enforced, not
   hoped for*. A Design DNA fingerprint is computed for every generated site and
   compared against recent generations; near-duplicates are rejected and
   re-rolled before the user ever sees them (see `docs/DESIGN_DNA.md` §6).
3. **Users choose niche, style, quality — nothing else is required.** Therefore
   the pipeline must synthesize everything an agency would extract from a
   client workshop: brand voice, information architecture, copy, imagery
   direction, conversion strategy. This is the **Brief Synthesis** stage.
4. **Premium is measurable.** Animations, typography, layout, accessibility,
   SEO, and conversion quality are all *scored by automated gates* before
   delivery. A site that fails a gate is repaired or regenerated — it never
   ships. (See `docs/QUALITY.md`.)

---

## 2. System overview

```
                        ┌─────────────────────────────────────────────┐
                        │                SiteForge Web App            │
                        │  (Next.js)                                  │
                        │  Wizard: niche → style → quality → generate │
                        │  Live preview · post-gen editor · deploys   │
                        └──────────────┬──────────────────────────────┘
                                       │ HTTPS / SSE (progress streaming)
                        ┌──────────────▼──────────────────────────────┐
                        │              Platform API                   │
                        │  Auth · Projects · Generations · Billing    │
                        └───────┬──────────────────────────┬──────────┘
                                │ enqueue                  │ read
                        ┌───────▼────────┐        ┌────────▼────────┐
                        │ Generation     │        │ PostgreSQL      │
                        │ Orchestrator   │        │ (projects,      │
                        │ (durable queue)│        │  briefs, sites, │
                        └───────┬────────┘        │  scores, deploys)│
                                │ runs                     └─────────┘
        ┌───────────────────────▼───────────────────────────────────┐
        │                 GENERATION PIPELINE (docs/PIPELINE.md)    │
        │                                                           │
        │  1. Brief Synthesis      → creative brief (agency intake) │
        │  2. Design System Gen    → tokens: type, color, space,    │
        │                            motion (from Design DNA)       │
        │  3. IA & Section Plan    → sitemap + per-page section map │
        │  4. Content Generation   → copy, SEO meta, schema.org     │
        │  5. Composition          → sections + tokens + copy →     │
        │                            full site code                 │
        │  6. Asset Resolution     → imagery, icons, fonts, og:image│
        │  7. Quality Gates        → a11y · perf · SEO · visual ·   │
        │                            uniqueness · conversion        │
        │  8. Repair Loop          → fix failures, re-gate          │
        └───────────────────────┬───────────────────────────────────┘
                                │ artifact: static site bundle
              ┌─────────────────┼──────────────────────┐
       ┌──────▼──────┐   ┌──────▼───────┐    ┌─────────▼────────┐
       │ Preview     │   │ Object store │    │ Deploy adapters  │
       │ sandbox     │   │ (site bundles│    │ Vercel · Netlify │
       │ (iframe CDN)│   │  + assets)   │    │ · export ZIP     │
       └─────────────┘   └──────────────┘    └──────────────────┘
```

**Key separation:** the *platform* (accounts, projects, billing, preview,
deploys) is a conventional SaaS. The *pipeline* is an isolated, queue-driven,
horizontally scalable worker system. They share only the database and object
store. This lets pipeline iteration (the competitive moat) move fast without
destabilizing the SaaS shell.

---

## 3. The user flow

1. **Choose a niche** — e.g. "boutique law firm", "specialty coffee roaster",
   "aesthetic dental clinic". Free-text with curated suggestions; the niche
   taxonomy (see `docs/DATA_MODEL.md` §2) carries conversion patterns, trust
   signals, and content structures per vertical.
2. **Choose a style** — the user picks a **Design Archetype** (e.g. *Editorial
   Luxury*, *Brutalist Confidence*, *Soft Organic*, *Kinetic Tech*) shown as
   live animated previews, optionally tuned with mood sliders (minimal ↔ rich,
   calm ↔ energetic, classic ↔ experimental). Archetypes are defined in
   `docs/DESIGN_DNA.md` §2.
3. **Choose a quality level** — `Standard`, `Premium`, `Signature`. Quality
   level controls pipeline depth, model tier, number of candidate variations,
   and strictness of gates (see `docs/QUALITY.md` §1). It is a *product* lever
   (pricing) and an *engineering* lever (cost/latency) at once.
4. **Generate** — the wizard streams pipeline progress as a narrative ("Writing
   your creative brief… Designing your type system… Composing the hero…") with
   live intermediate artifacts (the brief, the palette, wireframe skeletons) so
   the wait feels like watching an agency work, not a spinner.
5. **Review & refine** — full-site interactive preview on desktop/tablet/mobile
   frames. Refinement is *semantic*, not drag-and-drop: "make the hero calmer",
   "swap testimonials above pricing", "more contrast". Edits re-run only the
   affected pipeline stages.
6. **Ship** — one-click deploy (managed subdomain or connected custom domain
   via Vercel/Netlify adapters) or clean code export.

---

## 4. Subsystems

### 4.1 Web application (the SaaS shell)

- **Next.js (App Router) + Tailwind + Framer Motion.** The SiteForge app itself
  must meet the same premium bar as its output — it is the first proof of taste.
- Surfaces: marketing site, auth, dashboard (projects grid), the **Generation
  Wizard**, the **Preview Studio** (device frames, section inspector, semantic
  edit chat), deploy/domain management, billing.
- Progress streaming over SSE from the orchestrator; intermediate artifacts
  (brief, palette, type specimens) rendered as they land.

### 4.2 Platform API

- **TypeScript, single service** (Next.js route handlers or a co-deployed
  Fastify service — one deployable either way at this stage).
- Responsibilities: auth (email OTP + OAuth), project/generation CRUD,
  enqueueing pipeline jobs, billing (Stripe: subscription tiers +
  generation credits), deploy adapter orchestration, signed URLs for bundles.
- Contract detailed in `docs/DATA_MODEL.md` §4.

### 4.3 Generation Orchestrator

- A **durable job queue** (Inngest or Temporal-style step functions; BullMQ +
  Postgres acceptable for MVP) where each pipeline stage is a resumable step
  with typed inputs/outputs persisted per step.
- Why durable steps: generations are multi-minute, multi-model, and must
  survive worker restarts; failed stages retry or repair *individually*
  instead of restarting a whole generation (critical for cost).
- Emits progress events → SSE to the client; persists every intermediate
  artifact (auditable, resumable, and reusable for partial regeneration).
- Concurrency, per-tier model routing, token budgets, and cost accounting are
  enforced here (see `docs/PIPELINE.md` §8).

### 4.4 The Generation Pipeline

The competitive core. Eight stages, each an LLM- or tool-driven step with a
typed artifact contract, described fully in `docs/PIPELINE.md`. Two principles:

- **Structure from the library, soul from the model.** Layout correctness,
  responsiveness, and a11y come from the hand-built section pattern library;
  distinctiveness comes from AI-driven token generation, composition choices,
  copy, and motion direction. The model never free-hands raw CSS layout — that
  is how competitors end up with broken, same-y output.
- **Generate → gate → repair.** Nothing ships ungated. Gates are cheap and
  automated (axe-core, Lighthouse CI, visual-critic model pass, DNA uniqueness
  check); repairs are targeted stage re-runs, not full regenerations.

### 4.5 Design DNA system

The anti-generic engine: design archetypes, token generators (type scales,
palettes with enforced contrast, spacing rhythms), a motion language system,
a ~120-pattern section library with variant axes, and the uniqueness
fingerprint. This is hand-crafted, curated, and versioned — it is the taste
that models alone don't reliably have. Full design in `docs/DESIGN_DNA.md`.

### 4.6 Output stack (what generated sites are made of)

- **Astro + Tailwind (tokens injected as CSS variables) + vanilla-JS motion
  runtime** compiled to a fully static bundle.
- Why Astro over Next/React for *output*: zero-JS-by-default gives near-perfect
  Lighthouse scores out of the box (a headline differentiator vs. Lovable/Bolt
  whose React SPAs ship heavy hydration), while still allowing islands for
  interactive sections (booking widgets, galleries, forms).
- The motion runtime is a small (<8 KB) in-house library implementing the
  motion language (scroll-triggered reveals, parallax, magnetic hovers, page
  transitions) with `prefers-reduced-motion` compliance built in — consistent
  premium motion without shipping Framer/GSAP weight.
- Forms post to SiteForge form endpoints (per-site inbox + email forwarding) so
  static sites still convert.

### 4.7 Asset pipeline

- **Imagery:** per-brief art direction → sourced from licensed stock APIs
  (Unsplash+/Pexels) with palette-aware selection and duotone/grade treatments
  applied at build time so photos match the design system; AI image generation
  as a Signature-tier option for hero/brand imagery.
- **Icons:** single curated icon system (Lucide/Phosphor) per site, stroke
  width bound to the type system.
- **Fonts:** curated pairing matrix (see `docs/DESIGN_DNA.md` §3.1),
  self-hosted subsets, `font-display: swap`, preloaded.
- All assets optimized (AVIF/WebP, responsive `srcset`, LQIP placeholders) at
  composition time — this is a quality gate, not a suggestion.

### 4.8 Preview & hosting

- **Preview:** bundles uploaded to object storage, served through a sandboxed
  preview CDN origin (`*.preview.siteforge.app`, strict CSP, no cookies) and
  embedded in the Studio via iframe with a postMessage bridge for the section
  inspector.
- **Deploy adapters:** a thin `DeployTarget` interface with implementations
  for SiteForge-managed hosting (default; our CDN + `*.siteforge.site`
  subdomains + custom domains via automated DNS/ACME), Vercel, Netlify, and
  ZIP export. Managed hosting is the retention/upsell surface (analytics, form
  inboxes, edit-and-republish).

### 4.9 Data & storage

- **PostgreSQL** — accounts, projects, generations, per-stage artifacts
  (JSONB), scores, deploys, billing. Full schema in `docs/DATA_MODEL.md`.
- **Object storage (S3-compatible)** — site bundles, images, font subsets,
  visual-gate screenshots.
- **Redis** — queue backing (if BullMQ), rate limits, SSE fan-out.

---

## 5. Model strategy

| Pipeline stage | Model class | Rationale |
|---|---|---|
| Brief synthesis, IA planning | Frontier (Claude Opus-class / Fable-class at Signature tier) | Taste and judgment concentrate here; errors cascade |
| Design token generation | Frontier, constrained decoding (JSON schema) | Small output, high leverage |
| Copywriting | Frontier for voice-defining pages; mid-tier (Sonnet-class) for long-tail pages | Copy is the #1 "feels handcrafted" signal |
| Composition (code assembly) | Mid-tier + deterministic assembler | Library does the heavy lifting; model selects/parameterizes |
| Visual critic gate | Frontier with vision, screenshots in | The "art director review" — cheap relative to its value |
| Repairs | Mid-tier, scoped diffs | Narrow context, narrow task |

Cost control: per-tier token budgets enforced by the orchestrator; artifact
caching (a re-roll of copy does not re-run design tokens); candidate fan-out
only at Premium/Signature tiers.

---

## 6. Non-functional requirements (hard bars, enforced by gates)

| Dimension | Bar |
|---|---|
| Performance | Lighthouse ≥ 95 perf on mobile emulation; LCP < 1.8s; CLS < 0.05; JS < 90 KB gzipped per page |
| Accessibility | Zero axe-core critical/serious violations; WCAG 2.2 AA contrast enforced *at palette generation time*; full keyboard nav; `prefers-reduced-motion` honored |
| SEO | Per-page meta + OpenGraph + Twitter cards; schema.org (LocalBusiness/Service/FAQ per niche); semantic heading tree; sitemap + robots; canonical URLs |
| Conversion | Niche-appropriate CTA placement validated against per-niche conversion checklists; forms ≤ 5 fields; sticky mobile CTA where the niche calls for it |
| Mobile-first | All section patterns authored mobile-first; visual gate screenshots at 390/768/1440 |
| Uniqueness | DNA fingerprint distance above threshold vs. recent generations in the same niche+archetype |

---

## 7. Security & tenancy

- Standard SaaS posture: per-tenant row scoping in Postgres, short-lived JWT +
  revocable refresh sessions, signed URLs for bundle access.
- **Generated-output safety:** generated sites contain no third-party scripts
  except what the user connects explicitly (analytics); preview origin is
  cookie-less and CSP-locked; user-provided text is sanitized before
  composition (users can inject copy, never markup).
- Model I/O: briefs and copy pass a moderation check; no user PII enters
  prompts beyond the business info the user supplies for the site itself.

---

## 8. Phased roadmap

**Phase 0 — Foundation (weeks 1–4)**
Monorepo, auth/projects/billing shell, orchestrator with durable steps,
output stack proof: hand-build 3 archetypes × ~40 section patterns, ship one
end-to-end generation for 3 niches at Standard tier. Gates: axe + Lighthouse.

**Phase 1 — Premium bar (weeks 5–10)**
Full 8-stage pipeline, motion runtime v1, visual-critic gate, DNA uniqueness
check, Preview Studio with semantic edits, managed hosting + custom domains.
Bench: side-by-side vs. v0/Lovable/Bolt output on the rubric in
`docs/QUALITY.md` §4 — must win on ≥ 4 of 6 axes.

**Phase 2 — Depth & scale (weeks 11–18)**
Archetype library → 8+, section library → 120+, Signature tier (candidate
fan-out + AI imagery + art-director pass), niche taxonomy → 50+ verticals with
conversion playbooks, form inboxes + site analytics, team workspaces.

**Phase 3 — Moat (ongoing)**
Learning loop: gate scores + user edit patterns + (opt-in) live conversion
data feed back into archetype weights and section-selection priors — the
library gets *measurably* better with every generation, which no
prompt-wrapper competitor can replicate.

---

## 9. Planned repository structure

```
siteforge/
├── apps/
│   ├── web/                 # Next.js SaaS app (wizard, studio, dashboard)
│   └── api/                 # Platform API (if split from web)
├── packages/
│   ├── pipeline/            # 8-stage generation pipeline (pure, testable)
│   ├── design-dna/          # Archetypes, token generators, fingerprinting
│   ├── sections/            # Section pattern library (Astro components)
│   ├── motion/              # The <8KB motion runtime shipped in output
│   ├── gates/               # Quality gates (a11y, perf, SEO, visual, DNA)
│   ├── composer/            # Deterministic site assembler (Astro project gen)
│   ├── deploy/              # DeployTarget adapters (managed, Vercel, Netlify, zip)
│   └── shared/              # Types, artifact schemas (zod), utilities
├── infra/                   # IaC, preview CDN config, queue config
└── docs/                    # This architecture set
```

---

*Design documents only — no implementation in this change, by design.*
