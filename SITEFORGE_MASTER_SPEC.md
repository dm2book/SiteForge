# SITEFORGE — MASTER SPECIFICATION

Version 1.0 · Consolidates the full design set (`ARCHITECTURE.md` + `docs/*`).
This document is the single build authority: an implementer (human or Claude
Code) MUST be able to build the entire platform from this file alone. Where a
`docs/` file gives deeper rationale, it is cited as `[→ doc]`; the normative
requirement is always restated here.

Requirement language: **MUST** = ship-blocking. **SHOULD** = default unless a
recorded reason exists. Numbers in this spec are enforced limits, not
suggestions.

---

## PART I — PRODUCT

### 1. Definition

SiteForge is an AI-powered website **generation** platform (not a builder).
Users make exactly three choices — **niche**, **style (archetype + mood)**,
**quality tier** — and receive a complete business website indistinguishable
from high-end agency work, outperforming Lovable, Bolt, Replit AI, v0, and
typical freelance agencies.

### 2. Product laws (all systems derive from these)

1. **Handcrafted feel** → generation is compositional (deep parameterized
   pattern library + AI art direction). No template gallery exists anywhere.
2. **Never generic** → uniqueness is enforced by fingerprint comparison and
   re-roll before the user sees output; generic tells are gate failures.
3. **Three inputs only** → the pipeline synthesizes everything an agency
   workshop would (voice, IA, copy, art direction, conversion strategy).
4. **Premium is measurable** → animations, typography, layout, a11y, SEO,
   performance, conversion readiness are scored by automated gates. A site
   that fails a blocking gate is repaired or re-rolled; it never ships.
5. **Structure from the library, soul from the model** → LLMs choose and
   parameterize; they never free-hand layout CSS.
6. **3D/motion are content, never decoration.**
7. **User words are sovereign** → manual copy edits are warned about, never
   auto-rewritten (except publish-blocking verifiable-claim placeholders).

### 3. Quality tiers (product + pipeline configuration)

| | Standard | Premium | Signature |
|---|---|---|---|
| Pages | 1–3 | 4–6 | 6–10 incl. detail pages |
| Brief candidates | 1 | 1 + critic pass | 3, critic-selected |
| Token candidates | 1 | 2, critic-selected | 2 per brief |
| Copy model | mid-tier; frontier for hero/positioning | frontier for voice-defining copy | frontier + voice critic + headline fan-out (5) |
| Motion | dialect defaults | full choreography, shared-element transitions | + pinned scenes, split-text, (Agency) custom cursors |
| 3D | none | Class-A effects; Class-B for Auto/Real-Estate | full Class-B eligibility + AI imagery/models |
| Visual gate | advisory | blocking, mean ≥ 7.5 | blocking, mean ≥ 8.5 + art-director pass |
| Uniqueness threshold | base | +25% | +50% |
| Repair rounds | 2 | 3 | 3 + optional human escalation |
| Wall-clock target | < 3 min | < 8 min | < 20 min |

Tiers differ in depth and distinctiveness, never correctness: all tiers pass
the same blocking gates G1–G3, G5–G8.

---

## PART II — PLATFORM ARCHITECTURE

### 4. Tech stack (definitive)

| Layer | Choice |
|---|---|
| SaaS web app | Next.js (App Router), TypeScript, Tailwind, Framer Motion (app only — never in generated output) |
| Platform API | TypeScript; Next.js route handlers (acceptable: co-deployed Fastify). One deployable |
| Orchestrator | Durable step queue: Inngest or Temporal-style; MVP-acceptable: BullMQ + Postgres. Steps idempotent, keyed `(generationId, stage, attempt)` |
| Generated output | **Astro** + Tailwind (tokens as CSS custom properties) + in-house motion runtime (≤ 11 KB gz all modules) + Astro islands (React) for interactive components |
| 3D output | Three.js; React Three Fiber for stateful scenes; GSAP + ScrollTrigger inside 3D islands only (platform-held commercial license; export uses redistribution terms) |
| DB | PostgreSQL 16 via PgBouncer (transaction pooling); UUIDv7 PKs |
| Cache/queues | Redis (managed): queues, token buckets, SSE pub/sub, hot caches |
| Object storage | S3-compatible (bundles, assets, gate artifacts, archives) |
| Secrets | KMS-backed vault; envelope encryption (§27) |
| CDN | Cloudflare: app CDN + sites CDN (host routing for custom domains, auto-ACME) |
| Billing | Stripe (subscriptions + credit packs) |
| Auth | Passwordless email OTP + OAuth (Google, GitHub); short-lived JWT + revocable refresh sessions |
| Observability | OpenTelemetry (one trace per generation), structured logs w/ `generation_id`, metrics on queue depth / gate pass rates / provider health |

### 5. Monorepo layout

```
siteforge/
├── apps/
│   └── web/                 # Next.js SaaS: marketing, auth, dashboard,
│                            # Generation Wizard, Preview, Studio, billing
├── packages/
│   ├── shared/              # zod artifact schemas (versioned), types, utils
│   ├── pipeline/            # 8 stages, edit ops, orchestrator steps
│   ├── design-dna/          # archetypes, pairings, dialects, niche rulesets,
│   │   └── intelligence/    # personality math, 5 derivation systems, selector
│   ├── content-intelligence/# VoiceContract, frameworks, specificity engine,
│   │                        # 4-pass copy orchestration, SEO emitters
│   ├── sections/            # 2D section pattern library (Astro components)
│   ├── scenes/              # Class-B 3D scene patterns (Three.js/R3F islands)
│   ├── motion/
│   │   ├── runtime/         # shipped: core+scroll-story+transitions+hover
│   │   └── compiler/        # MotionScript compiler, choreographer, linter
│   ├── webgl-runtime/       # Class-A shader runtime (~12 KB)
│   ├── composer/            # deterministic Astro project assembler + builder
│   ├── gates/               # G1..G8 harnesses
│   ├── assets-3d/           # model ingestion/compression/poster+video renders
│   ├── providers/           # provider registry, adapters, broker client
│   ├── preview/             # fragment shell, dev-layer, scorecard mappers
│   └── deploy/              # DeployTarget: managed | vercel | netlify | zip
├── infra/                   # Terraform: CDN, queues, DB, vault, worker pools
└── docs/                    # the design set (already in repo)
```

### 6. Runtime topology

Stateless web/API tier (autoscaled, LB + WAF) → Redis (queues/buckets/pub-sub)
→ two isolated worker pools: **LLM-stage workers** (I/O-bound) and
**build/gate workers** (sandboxed `astro build`, Lighthouse, axe; gVisor, no
network) + a **GPU render pool** (3D posters/videos, G8 harness) → PgBouncer →
Postgres primary + 2 read replicas → S3 → preview CDN + sites CDN. SSE fans
out via Redis pub/sub so any API instance serves any generation stream.
Full diagram [→ docs/SCALING.md §3].

Scale envelope (MUST hold at 100k registered users): ~40k MAU, ~4k
generations/day, ~150 req/s API peak, ~8M usage_logs rows/mo. Published sites
serve entirely from CDN (zero origin load; survive platform outage).

---

## PART III — DATA

### 7. Database schema

Conventions: `id uuid` (UUIDv7); `created_at timestamptz NOT NULL DEFAULT
now()`; `updated_at` on mutable tables; soft delete via `deleted_at`; tenancy
by `user_id` on every user-owned row (additive `workspace_id` in Phase 2);
artifacts as `jsonb` + `artifact_schema_ver`; external refs opaque.

Core tables (full DDL [→ docs/DATABASE.md]):

```
users             (id, email citext UNIQUE, name, avatar_url, auth_provider,
                   role='user', status='active', locale, last_seen_at, …)
projects          (id, user_id, name, niche_id, business_facts jsonb,
                   current_site_id → generated_sites, status, …)
prompts           (id, project_id, user_id, niche_text, niche_id,
                   archetype_id, mood jsonb, tier, free_text, source)
                   -- immutable record of user intent; 1 prompt → N generations
templates         (id, version, kind: archetype|pattern|pairing|dialect|niche,
                   definition jsonb, status, checksum, PK(id,version))
                   -- versioned Design-DNA registry; rows never mutate;
                   -- versions pinned by any site are never deleted
generations       (id, project_id, prompt_id, user_id, tier, status:
                   queued|running|gating|repairing|succeeded|failed|canceled,
                   current_stage, error jsonb, cost_cents, wall_ms, finished_at)
generation_stages (id, generation_id, stage, attempt, status, input_hash,
                   artifact jsonb, artifact_schema_ver, model_used,
                   tokens_in/out, ms)          -- PARTITIONED monthly
gate_results      (id, generation_id, gate, page_path, blocking, passed,
                   score, findings jsonb)      -- PARTITIONED monthly
dna_fingerprints  (id, generation_id, niche_id, archetype_id, vector jsonb,
                   hero_phash bytea)           -- indexed for bucket queries
generated_sites   (id, project_id, generation_id UNIQUE, bundle_key,
                   source_key, design_tokens jsonb, template_versions jsonb,
                   page_manifest jsonb, status: draft|published|archived,
                   published_at)               -- APPEND-ONLY, immutable
deployments       (id, generated_site_id, user_id, target:
                   managed|vercel|netlify, target_ref jsonb, url,
                   custom_domain UNIQUE-partial-live, status, error, live_at)
exports           (id, generated_site_id, user_id, format:
                   zip-static|zip-source, storage_key, status,
                   download_count, expires_at)  -- 72h signed window
ai_accounts       (id, provider, label, key_ref, model_allowlist[],
                   tier_affinity[], rpm/tpm limits, monthly_budget_cents,
                   spent_cents_mtd, health)     -- PLATFORM pool
provider_registry (id, class: llm-api|llm-gateway|gen-platform, display,
                   config jsonb {auth_methods, capabilities, cost_model,
                   egress_allowlist, tos_constraints}, version, status)
user_provider_accounts (id, user_id, provider_id, label, auth_method:
                   oauth|api_key|session, credential_ref, scopes[],
                   status, is_default, last_verified_at, revoked_at)
                   -- NO password auth_method exists; CI lint enforces
quota_snapshots   (account_id, taken_at, credits, remaining_generations,
                   spend_mtd, limits jsonb, source: api|reconciliation|
                   user_reported)              -- PARTITIONED monthly
alert_rules       (id, account_id, kind: low_credits|low_generations|
                   spend_threshold|key_invalid, threshold jsonb, channel)
usage_logs        (occurred_at, id, user_id, generation_id, stage,
                   ai_account_id|user_account_id, account_owner:
                   platform|user, model, tokens_in/out, cost_cents,
                   latency_ms, outcome)        -- PARTITIONED monthly;
                   -- archived to S3 Parquet after 6 months
billing           (id, user_id UNIQUE, plan: free|pro|studio,
                   stripe_customer_id, stripe_subscription_id, status,
                   credits_balance /*cache*/, period_started/ends_at)
credit_ledger     (id, billing_id, delta, reason, generation_id?,
                   balance_after)              -- append-only truth;
                   -- nightly job asserts cache == ledger sum
edits             (id, site_id, user_id, instruction, affected_stages[],
                   resulting_generation_id)
form_submissions  (id, site_id, form_id, payload jsonb, spam_score,
                   forwarded_at)
otp_codes / sessions  -- operational, hashed, TTL-cleaned
```

Integrity rules (MUST): `current_site_id` only points at same-project
draft/published site; `generated_sites` immutable except status/published_at;
failed generations auto-refund via ledger; user hard-delete = row purge + S3
prefix purge + crypto-shred of tenant KEK; usage/ledger rows retained
anonymized for financial audit.

### 8. Niche taxonomy

Curated per-vertical knowledge, versioned in `packages/design-dna/niches/`,
synced to `templates(kind='niche')`. Free-text niche input resolves to the
nearest node by embedding match; novel niches inherit the category playbook +
a frontier adaptation pass. Launch: the 12 rule sets of §17 (+ category
fallbacks).

### 9. Public API (v1, REST + SSE)

```
POST /v1/auth/otp/request | /verify ; GET /v1/auth/oauth/:provider/start|callback
POST /v1/projects {name, niche, businessFacts?}
GET  /v1/projects/:id
POST /v1/projects/:id/generations {archetype, mood, tier, enginePolicy?} → 202
GET  /v1/generations/:id                  # status + stages + gate report
GET  /v1/generations/:id/events           # SSE: progress, artifacts, fragments, scores
POST /v1/generations/:id/cancel
GET  /v1/sites/:id/preview-url            # signed, sandboxed
POST /v1/sites/:id/edits {instruction | op} → 202
GET  /v1/sites/:id/pages/:path/sections
POST /v1/sites/:id/deployments {target, domain?}
POST /v1/sites/:id/export → signed ZIP URL
POST /f/:siteId/:formId                   # public form endpoint (rate-limited, spam-scored)
GET  /v1/billing/summary ; POST /v1/billing/checkout | /portal
GET/POST /v1/providers/accounts …         # connect, verify, list, revoke
GET  /v1/providers/accounts/:id/quota     # snapshots + alerts CRUD
```

Auth: JWT access (carries sub+perms) + refresh session cookie; per-workspace
row scoping enforced at the data layer in one place. Rate limits: 1
concurrent generation (Standard) / 2 (Premium+) per workspace; edit ops
per-minute cap; form endpoint per-site-per-hour cap.

---

## PART IV — THE GENERATION PIPELINE

Eight durable stages; every stage has a zod artifact contract in
`packages/shared`, persisted per attempt, cache-keyed by `input_hash`
(partial re-runs re-execute only stages whose input hash changed).
[→ docs/PIPELINE.md]

### 10. Stages

**S1 Brief Synthesis** — in: `{niche, archetype, mood, tier,
businessFacts?}`; out: `CreativeBrief {businessModel, voiceContract (§20),
positioningAngle, conversionStrategy, artDirection}`. Frontier model always;
Signature: 3 candidates + critic selection. Grounded by the niche ruleset.

**S2 Design System Generation** — in: brief + archetype; out: `DesignTokens`
via the Design Intelligence derivation (§14–16): type system (pairing, scale,
per-role specs, fluid clamp sizes), OKLCH color system (contrast-correct by
construction), spacing/rhythm/radius/shadow, MotionSystem tokens. Strict
JSON, schema-constrained decoding.

**S3 IA & Section Planning** — out: `SitePlan {sitemap per tier, per-page
ordered section slots each bound to pattern-id + variant axes + rationale,
density curve, ValueJudgments for 3D slots (§22)}`. MUST pass the
narrative-arc validator: open with promise; trust before ask when the niche's
`proof_before_ask`; density alternation; exactly one primary CTA per page;
pages end with a conversion moment; the niche's own `section_order_rules`;
anti-template shuffle (deviate from that niche's most-common sequence in ≥ 2
meaningful ways — planner tracks sequence frequencies and down-weights any
above a usage ceiling).

**S4 Content Generation** — out: `ContentGraph` via the 4-pass process (§21):
draft → page-cohesion → voice critic → deterministic mechanics. Includes the
SEO layer: per-page title (≤ 60ch) / meta (≤ 155ch) / OG+Twitter cards,
schema.org JSON-LD per niche, heading tree, internal link map, art-directed
alt text.

**S5 Composition** — the **composer** is deterministic code: scaffolds the
Astro project, injects token CSS + motion runtime, instantiates each planned
pattern with variants/tokens/copy, wires nav/footer/forms (post to
`/f/:siteId/:formId`), page transitions, favicon + OG image; compiles the
MotionScript (§19); runs `astro build` in the sandbox (no network,
resource-limited). LLM participation is bounded: a refinement pass may adjust
variant parameters and choreography *within declared safe ranges only*.

**S6 Asset Resolution** — art-direction-driven stock queries (licensed APIs),
vision-model ranking, palette-matched grading/duotone; Signature: AI
imagery/models with provenance metadata + Studio approval step. Font
subsetting; AVIF/WebP + `srcset` + LQIP; OG image rendered from a
token-styled template; 3D: glTF/GLB + Draco/Meshopt + KTX2, poster renders
and fallback videos rendered at build time (§23).

**S7 Quality Gates** — run G1–G8 (§24) in parallel where independent; output
`GateReport` with machine-actionable findings bound to section ids.

**S8 Repair Loop** — route findings to the cheapest sufficient fix (token
tweak → S2 partial; copy → S4 section; layout → S5 variant; asset → S6
re-query). Max rounds per tier; then smallest-scope re-roll (section → page →
site, rate-limited). All repairs append to the audit trail.

### 11. Orchestration

Durable, resumable, horizontally scaled workers; SSE narrative events
(`brief.positioning`, `tokens.palette`, `plan.page`, `compose.fragment`,
`gate.score`, …). Per-tier token + wall-clock budgets: soft-exceed downgrades
model tier for non-critical stages; hard-exceed fails cleanly (Signature
never silently downgrades — it errors). Candidate fan-out only at Premium+.

### 12. Model routing

| Stage | Model class |
|---|---|
| S1, S3 planning | Frontier (Opus/Fable-class at Signature) |
| S2 tokens | Frontier, constrained decoding |
| S4 copy | Frontier for voice-defining; mid-tier (Sonnet-class) long-tail |
| S5 refinement | Mid-tier |
| Visual critic (G4) | Frontier with vision |
| Repairs | Mid-tier, scoped diffs |

Routing goes through the account router: platform `ai_accounts` pool +
connected `user_provider_accounts` (§26), Redis token buckets per account,
weighted routing, failover on 429/5xx, per-tier priority queues.

---

## PART V — DESIGN INTELLIGENCE

[→ docs/DESIGN_DNA.md, docs/DESIGN_INTELLIGENCE.md]

### 13. Design DNA assets (curated, versioned content)

- **8 archetypes**: Editorial Luxury, Brutalist Confidence, Soft Organic,
  Kinetic Tech, Heritage Craft, Clinical Modern, Warm Hospitality, Bold
  Retail. Each is a YAML rule set: type_rules (pairing families, scale
  ratios, case), color_rules (schemes, chroma ceiling, dark-mode), layout
  grammar (grids, density, signature moves), motion dialect, section
  weights (0 = banned), denylist. Ship gate per archetype: 5 niches × 5
  generations mutually distinguishable and attributable.
- **~40 font pairings** (display+body+optional label), self-hostable,
  annotated with archetype/niche affinity. Inter allowed as body in ≤ 3
  pairings.
- **~120 section patterns** across 16 slot roles; each: mobile-first,
  token-driven, a11y-complete, declared variant axes + motion hooks +
  constraints; passes gate suite in isolation in CI before entering the
  library; versioned; sites pin versions.
- **5 motion dialects** (§19) + **12 niche rule sets** (§17).

### 14. The Design Language object

```
DesignLanguage {
  personality: {warmth, energy, density, formality, boldness, materiality} 0..1,
  anchors: [referenceProfile × weight],
  archetype, seeds: {hue_seed, pairing_id, dialect_id, grid_id},
  derived: {ColorSystem, TypeSystem, MotionSystem, LayoutSystem, ChromeSystem}
}
```

All five derived systems are **pure functions** of personality + seeds
(unit-testable, no model calls). Coherence invariants: no orphan constants;
motion speed class matches density class; radius matches type roundness;
shadow depth matches materiality. **Expressiveness budget:** personality may
express on ≤ 2 channels (color, type, shape, motion, layout).

Reference profiles encode disciplines, never trade dress (mimicry = G4
failure): Apple → scale courage + mass motion; Stripe → accent scarcity +
rhythm; Porsche → imagery-carried chroma; Linear → instant motion +
zero alignment tolerance; Arc → bounded playfulness; Notion → chrome
minimization.

### 15. Derivation rules (enforced numbers)

**Color (OKLCH):** neutral ramp first (9 steps, hue-tinted 2–4% chroma —
never pure gray/white/black unless archetype demands); ink/bg ≥ 7:1; one
primary accent (secondary only if boldness > 0.7, never for CTAs — CTA color
singular); **accent ≤ 4% of rendered pixel area per viewport** (measured on
gate screenshots); chroma-source mode declared: ui-carried |
imagery-carried | balanced; dark theme derived (rebuilt ramps, accents gain
L / lose C), shipped only where the niche allows.

**Typography:** pairing selected by personality query + niche voice veto;
display:body ratio ≥ 4:1 when boldness > 0.5 else ≥ 3:1; **≤ 4 active sizes
per viewport**; one scale-breaking typographic moment per page; tracking
−1..−3% at display sizes, positive for labels; body line-height +0.05–0.1
when warmth > 0.6; measure 45–75ch; tabular numerals in data contexts; 2–3
weights per family; adjacent hierarchy levels differ in ≥ 2 attributes.

**Layout:** spacing scale ratio = type scale ratio (shared rhythm); every
vertical gap MUST be a scale step (composer cannot emit off-scale margins;
G4 measures gap histograms); container width per archetype; chrome
minimization scoring (boxes-in-boxes = measurable violation); one grid per
page, snap within 8 px; asymmetry only as a stated archetype move; planned
density curve per page (sparse hero → denser proof → sparse CTA), verified
against render.

### 16. Automatic language selection

`select(niche, archetype, mood, brief)`: niche personality prior → archetype
constraint region → mood interpolation within the intersection → anchor
weighting by personality distance → seed sampling with rejection against the
DNA fingerprint history → derive. Constrained optimization + sampling — no
lookup, no default. Brief evidence may move the prior *within* the niche
region only. Combinations with `archetype_affinity: 0` are removed from the
wizard (unreachable, not error-handled).

**Uniqueness fingerprint:** vector = (archetype, pairing, palette cluster,
per-page pattern+variant sequence, dialect, hero structure) + perceptual hash
of hero screenshot. Gate: distance vs. last 90 days of same
`(niche, archetype)` bucket above tier threshold; cross-niche check tightened
within collision groups (§17). Below threshold → repair re-rolls highest
similarity contributors (hero variant, palette seed, one section swap).

---

## PART VI — GENERATION ENGINE & NICHES

[→ docs/GENERATION_ENGINE.md, docs/NICHE_PLAYBOOKS.md]

### 17. Niche rule sets

Rule-set schema per niche: `conversion {visitor_job, decision_mode,
primary/secondary_cta, mobile_pattern, trust_signals[], proof_before_ask}`,
`structure {sitemap per tier, nav_model, required/banned_sections,
detail_pages}`, `layout {hero_family (exclusive), signature_section
(exclusive), grammar_bias, section_order_rules, archetype_affinity}`,
`components {required, optional, data_backed}`, `content {voice_range,
copy_blocks, specificity_seeds, denylist_extra, faq_seeds, seo}`, `motion
{dialect_map, intensity_ceiling, choreography_notes}`, `3d {allowed scenes,
tier floor}`, `differentiation {exclusive_patterns, collision_group}`.

Merge precedence (MUST): niche bans > archetype preferences; archetype bans >
niche preferences; base platform rules > everything.

**The launch twelve** (full playbooks [→ docs/NICHE_PLAYBOOKS.md] — normative
summary):

| Niche | Hero family (exclusive) | Signature section | Primary CTA / mobile | Dialect default / ceiling | Collision group | Key rules |
|---|---|---|---|---|---|---|
| Auto Dealer | `hero/showroom` (vehicle stage, spec ticker, inventory search) | Inventory showcase + filter rail | view-inventory→test-drive / sticky-call+search | kinetic-energy / high | retail-inventory | inventory in first 2 scrolls; financing adjacent; utility nav; payment-first copy; schema AutoDealer+Vehicle |
| Barber | `hero/chair-side` (portrait split, next-slot inline) | Cut gallery + barber picker | book-now / sticky-book | playful-spring / med | local-appointment | one-page anchored; gallery before prices; booking ≤ 1 tap; schema Barbershop |
| Restaurant | `hero/table-scene` (atmospheric, pinned hours/reserve strip) | Menu-as-chapters | reserve / sticky-reserve | organic-flow / low-med | hospitality | ambience→menu→reservation order; no stat counters; dish copy = ingredients+technique; schema Restaurant+Menu |
| Real Estate | `hero/listing-first` (search over market hero) | Listing grid+map hybrid | search / valuation; sticky-search | quiet-precision / med | retail-inventory | search above fold; buyer/seller funnels split; data surfaces never decorate; per-listing pages; schema RealEstateAgent |
| Gym | `hero/motion-wall` (kinetic type over footage) | Schedule matrix + coach wall | claim-trial / sticky-trial | kinetic-energy / high | local-membership | identity before pricing; never intimidating copy; schema ExerciseGym |
| Roofing | `hero/before-after` (draggable slider AS hero) | Storm checklist + financing bar | free-inspection / sticky-CALL | quiet-precision / LOW | local-trades | credentials in first scroll; phone beats form; no playfulness/stock handshakes; schema RoofingContractor |
| Dentist | `hero/calm-clinic` (soft split, insurance strip, book card) | Smile gallery + first-visit walkthrough | book-visit / sticky-book+call | organic-flow / LOW | local-appointment | comfort before procedures; grade-8 reading level; no urgency tactics; schema Dentist |
| Agency | `hero/manifesto` (oversized statement, work peeking) | Case-study wall (outcome-led) | start-project / none | structural-drama / HIGH | studio | work within 1.5 scrolls; capabilities AFTER work; no stock imagery; manifesto ≤ 14 words; case = problem→move→number |
| Ecommerce | `hero/product-stage` (variant swatches, cart affordance) | Collection grid + lookbook rows | shop→add-to-cart / cart-bar | playful-spring / med | retail-inventory | product pre-scroll; story never before shop; per-product pages; schema Product+Offer+Review |
| SaaS | `hero/product-proof` (headline + animated product frame) | Feature narrative + integration wall | start-free/demo / none | kinetic-energy / med | software | one outcome claim in hero (no feature lists); self-serve pricing visible; ban "seamless/supercharge/10x"; frame animates its own UI |
| Lawyer | `hero/counsel` (restrained split, credentials rail, case-eval card) | Results wall + practice-area index | free-case-eval / sticky-call | quiet-precision / LOWEST | professional | results before contact ask; no icon-card practice grids; results claims marked needs-real-data; schema LegalService |
| Contractor | `hero/project-reveal` (staged photo, scope tags, estimate card) | Project gallery + process timeline | request-estimate / sticky-call | quiet-precision / low | local-trades | projects first scroll; process before estimate ask; real photos only; schema GeneralContractor |

Cross-niche guarantees (MUST): hero families and signature sections are
enforced-exclusive at compose time; collision groups get tightened
cross-niche fingerprint thresholds; adding a niche is data-only (no engine
code change).

### 18. Niche-aware components (Astro islands — the only hydrated JS)

Booking/scheduling widgets, price lists, menu renderer, inventory/listing
grids + filters, financing/mortgage calculators, map (cluster + service-area),
schedule matrix, transformation/before-after sliders, galleries + lightbox,
variant picker + cart drawer + checkout bridge (Stripe/Shopify),
reviews block, comparison tables, lead/estimate/case-eval forms (≤ 5 fields,
inline validation), insurance checker. All token-styled; `data_backed` ones
bind to `projects.business_facts` with clearly-editable placeholders.

---

## PART VII — MOTION

[→ docs/MOTION_ENGINE.md]

### 19. Motion Engine

- **MotionScript**: per-page JSON artifact (timelines, scroll scenes, hover
  maps, all referencing motion tokens) compiled by the Choreographer;
  consumed by the dependency-free runtime. Motion is data: inspectable,
  diffable, lintable.
- **Runtime**: core ~4 KB gz (WAAPI + IntersectionObserver) + optional
  modules scroll-story ~3 KB, transitions ~2 KB, hover ~2 KB. ≤ 11 KB total.
  Enforced invariants: transforms/opacity/clip-path only (CLS-zero by
  construction); ≤ 5 concurrent tracks; reduced-motion degrades everything to
  a 200 ms opacity settle; scroll is always user-owned (scenes read progress,
  never write it). Generated output NEVER ships Framer Motion.
- **Move vocabulary** (the only animatable things): rise, line-mask,
  split-text, clip-wipe, blur-focus, scale-settle, parallax (≤ 6%), draw,
  counter (once, ≤ 1.2 s), stagger, crossfade-morph, camera-pan.
  **Anti-generic rule:** an entrance must compose ≥ 2 channels or be
  masked/drawn; bare `rise` only on tertiary content, ≤ 30% of reveals per
  page (linter-enforced); Framer default signatures are G4 generic tells.
- **Dialects** (parameter sets): quiet-precision (250–350 ms, 8–12 px, 40 ms
  stagger), kinetic-energy (fast, clip reveals, magnetic CTAs), organic-flow
  (long ease-outs, blur-focus), structural-drama (split-text, one pinned
  scene, Signature), playful-spring (springs on micro only).
- **Scroll storytelling**: declarative scenes `{range, beats[{at, target,
  move, params}], pin?}` compiled from the density curve; ≤ 1 pinned scene
  per page (Signature, ≤ 1.5 viewport-heights, skippable, ≥ 768 px only).
- **Transitions**: page = View Transitions API with shared-element morphs
  (card image → destination hero; chrome persists; per-dialect character;
  no-support = instant nav). Route/in-page = FLIP reorders 150–250 ms;
  filters never blank the grid.
- **Reveals**: hero entrance timeline per hero family (establish → announce →
  invite, 600–1100 ms total, once per session); ≤ 2 cinematic sections per
  page; exactly 1 product spotlight per product surface.
- **Hover/micro**: one site-wide link grammar; one card grammar; magnetic
  CTAs (≤ 8 px) only in kinetic languages, banned in high-trust niches;
  custom cursors Agency-Signature only; every user action gets exactly one
  motion acknowledgment ≤ 300 ms; button press 0.97; forms draw focus
  borders; in-place loading morphs (no width jumps).
- **Motion linter** (deterministic, pre-gate): vocabulary-only, caps,
  budgets, reduced-motion variant present, token references valid.

---

## PART VIII — CONTENT

[→ docs/CONTENT_INTELLIGENCE.md]

### 20. VoiceContract

Synthesized in S1: 3 adjectives + 3 anti-adjectives; register dials (person,
reading level, rhythm, contractions, humor ceiling); **5 paired exemplars**
(`{say, never}`) — included in every copy prompt and used by the voice
critic; lexicon (owned + banned words). Voice = brief ∩ niche `voice_range`.

### 21. Content generation rules

- **Frameworks as genre**: copy_blocks per niche are structural contracts
  (outcome-headline formula ≤ 9 words; case study = problem→move→number;
  walkthroughs = step + duration + sensation; menu/inventory item rules).
- **Specificity Engine**: typed-fact harvest from business_facts → minimum
  fact density (every hero/proof/CTA block ≥ 1 typed fact or marked
  placeholder) → plausible specific placeholders with machine-readable
  markers (Studio checklist; verifiable-claim placeholders block publish —
  G7) → **superlative tax** (every "best/premier/top-rated" adjacent to a
  supporting fact or rewritten out).
- **4 passes**: (1) draft per section with whole-page outline in context;
  (2) page cohesion (kill repeated openers, vary rhythm, one argument);
  (3) voice critic vs. exemplars, flagged sections rewritten; (4)
  deterministic mechanics: filler denylist ("Welcome to", "passionate
  about", "look no further", + niche extras), headline ≤ 9 words, reading
  level, cross-page duplicate detection, typographic punctuation.
  Standard = 1+4; Premium = all; Signature = + second critic round +
  headline fan-out.
- **SEO as content layer**: search-intent-mapped headings; JSON-LD emitted
  from the same typed facts as visible copy (never disagree); local kit
  (NAP single-source, editorial area copy, GBP description); FAQs
  snippet-shaped (H3 question, 40–55 word direct answer first) + FAQPage
  JSON-LD; sitemap.xml + robots.txt + canonicals.

---

## PART IX — 3D

[→ docs/3D_ENGINE.md]

### 22. 3D Value Judge (planner)

`Score = communicative_value(0–4) + engagement_fit(0–3) +
asset_feasibility(0–3)`; ship iff score ≥ 7 AND communicative ≥ 3 AND tier ≥
Premium. Hard vetoes: decoration (subject isn't the business's actual
product/space/work — blobs/particles/spinning logos auto-vetoed);
performance (never on checkout/contact/urgency flows); quality floor (bad
model < no model); niche ceiling (Lawyer never; Dentist Signature anatomy
only). Verdict + rationale persisted in SitePlan; G8 audits the shipped
scene against its own rationale.

### 23. 3D runtime & assets

- **Class A** (shader effects, ~12 KB raw WebGL, no Three.js): content-image
  treatments, palette-bound canvas moments. Premium+, high-materiality
  languages, decoration veto still applies.
- **Class B** (Three.js; R3F for stateful scenes; GSAP inside islands only):
  Signature (Premium for Auto/Real-Estate). Loading: poster frame (AVIF,
  serves as LCP) → idle prefetch near viewport → hydrate on intent. Budgets:
  per-page carve-out (runtime ≤ 180 KB gz shared-chunked, scene assets ≤ 3 MB
  streamed) ON TOP of the untouched standard budget; **zero 3D bytes on
  pages without a scene**; one live scene at a time; full disposal on exit.
- **Capability ladder**: high (PBR/env/shadows) → mid (baked, DPR 1.5) →
  low/no-WebGL/save-data (**cinematic fallback**: build-time-rendered video
  loop or pan of the actual scene) → reduced-motion (poster + user-stepped
  orbit). Fallbacks are generated content, not apologies.
- **Input contract**: pointer+touch+keyboard (arrows orbit, ± zoom, Esc),
  visible focus, text-alternative block sharing typed facts, no
  scroll-hijack, no pointer-lock.
- **Launch scenes** (niche-exclusive): Auto `vehicle-viewer` (palette-safe
  paint config, spec hotspots) + `showroom-flythrough` (scroll-bound camera);
  Real Estate `house-walkthrough` (synced floor-plan minimap) + `area-map`
  (extruded neighborhood layers); Restaurant `dish-presentation` (1–3 hero
  dishes max); Ecommerce `product-360` (+AR handoff via model-viewer
  USDZ/GLB); Gym `facility-flythrough`. SaaS/Agency Class-A only by default;
  Barber/Roofing/Dentist/Lawyer/Contractor: none at launch.
- **Assets**: sources in order — user-provided (OEM feeds, Matterport,
  scans) → licensed staging library (staging yes, subject no — faking the
  subject is a G7 integrity failure) → procedural (map extrusion, staging
  kits) → AI-generated (Signature, provenance metadata + Studio approval).
  Processing: Draco+Meshopt, KTX2 mip chains, per-scene poly/texture budgets
  (vehicle ≤ 150k tris, dish ≤ 60k), baked-light variants, poster + video
  renders in the GPU pool.

---

## PART X — QUALITY

[→ docs/QUALITY.md]

### 24. Gates (blocking unless noted)

- **G1 Accessibility**: axe-core zero critical/serious on every page;
  keyboard crawl (all interactives reachable, visible focus, no traps,
  skip-link); AA contrast verified in output (backstop); reduced-motion
  snapshot; landmarks; one h1/page; no heading skips; meaningful alt text.
- **G2 Performance**: Lighthouse CI mobile, median of 3: **Perf ≥ 95**, BP ≥
  95; LCP < 1.8 s; CLS < 0.05; TBT < 150 ms; JS ≤ 90 KB gz/page (excl.
  declared 3d-budget); CSS ≤ 60 KB gz; hero image ≤ 180 KB AVIF; fonts ≤
  120 KB subset total; responsive images + dimensions + LQIP; fonts
  preloaded, `font-display: swap`.
- **G3 SEO**: unique title/meta lengths; OG/Twitter + rendered OG image;
  canonicals; sitemap + robots; JSON-LD schema-valid for the niche; heading
  tree; descriptive anchors; no orphan pages.
- **G4 Visual craft** (advisory Standard, blocking Premium ≥ 7.5 mean /
  Signature ≥ 8.5, no dimension < 6): screenshots 390/768/1440 per page →
  frontier vision critic on hierarchy, rhythm (gap histogram), typographic
  craft, color discipline (accent-area %), image integration, generic-tell
  scan (incl. Framer signatures, trade-dress mimicry); deterministic
  sub-metrics computed pre-model (accent %, gap histogram, active sizes,
  chrome ratio, density curve). Findings bound to section ids.
- **G5 Uniqueness**: fingerprint distance thresholds per tier + collision
  groups (§16, §17).
- **G6 Conversion**: niche playbook assertions — CTA above fold + page end;
  tappable phone for local-service; forms ≤ 5 fields; trust before ask where
  required; sticky mobile pattern per playbook.
- **G7 Content integrity**: no lorem ipsum; no denylist filler; no
  unresolved placeholders except marked business facts; verifiable-claim
  placeholders block publish; no fabricated verifiable claims; links
  resolve; no console errors; 3D subject-faking check.
- **G8 3D** (3D pages only): ≥ 55 fps sustained on mid-tier reference; no
  long task > 120 ms at hydrate; input latency < 50 ms; 3d-budget respected;
  poster = valid LCP; all ladder tiers render (screenshot each);
  reduced-motion variant; keyboard + text alternative consistent with
  hotspots; memory fully released across a 5-scene loop; value audit vs.
  recorded rationale.

Gates also run: in library CI (per pattern), on republish (affected pages;
user edits can't silently sink below bars — fix-it prompt + auto-repair
offer), and nightly on a deployed-site sample.

### 25. Competitive benchmark (run at every phase milestone + monthly)

Same 6 prompts to SiteForge-Premium, v0, Lovable, Bolt, Replit AI + 2 real
agency references per niche; blind 3-rater review + automated metrics on 6
axes (distinctiveness, craft, motion, performance, a11y, conversion
readiness). **Ship bar: win ≥ 4/6 axes vs. every AI competitor and
match-or-beat agency references on craft + performance.**

---

## PART XI — PROVIDERS, PREVIEW, STUDIO

### 26. AI Provider System [→ docs/AI_PROVIDERS.md]

- Registry classes: `llm-api` (Claude, GPT — true BYOK: user key routes
  through the real pipeline), `llm-gateway` (Arena where API exists),
  `gen-platform` (Lovable, Bolt, v0 — **companion mode**: account linking,
  quota monitoring, brief hand-off via deep link, result import; NO headless
  automation of third-party web apps; `generate` capability flips on only
  with an official API/partnership).
- **No passwords, by construction**: auth_methods = oauth | api_key |
  session-token only; a CI lint fails any schema/form adding third-party
  password fields. Account "creation" = guided deep-links to provider
  signup/key pages, then normal connect.
- **Credential security**: material only in the KMS vault (DB stores refs);
  envelope encryption per-credential DEK → per-tenant KEK → KMS root;
  KEK deletion = crypto-shred; only the credential-broker service resolves
  refs, per-job, scoped to `(generation_id, account_id)`, ownership-checked,
  memory-only, append-only audit log with anomaly alerts; per-adapter egress
  allowlists; provider responses are data, never instructions; platform-wide
  log redaction; connect-time live probe + scope warnings; daily
  re-verification; one-click revoke.
- **EnginePolicy** per project: `{preferred: platform|account, fallback:
  platform|none, budget {max_spend_per_generation?, stop_at_credits?}}`;
  pre-flight refuses generations that would strand on an empty key. BYOK
  runs identical tiers/gates; billing = user's provider credits + reduced
  platform fee (`byok_generation` ledger reason). Monitoring: snapshots
  on-demand pre-flight + 6-hourly + post-generation deltas; user-reported
  balances labeled as such; alert rules → email/in-app.

### 27. Preview Engine [→ docs/PREVIEW_ENGINE.md]

- Wizard steps are preview-driven: niche cards show real sample
  generations; archetype cards render live in the chosen niche (12×8 sample
  matrix refreshed by nightly benchmark runs).
- **Progressive preview**: SSE artifacts render live (brief card → palette/
  type specimen with dialect easing demo → sitemap/wireframes → copy streams
  in → composer's per-section static fragments replace wireframes → LQIP →
  graded finals → scorecards fill → repair narration). Failures stay honest:
  artifacts persist, clean re-roll CTA, auto-refund.
- **Devices**: true-viewport iframes — desktop 1440×900 DPR2, tablet
  768×1024 (rotatable), mobile 390×844 DPR3 + touch emulation + safe-area;
  visual scaling only (layout math at real size); simultaneous trio view.
- **Motion controls** (preview-only dev layer, stripped from published
  builds — publish pre-flight byte-diff verifies): replay entrances, 0.25×
  slow-mo, motion-map overlay (named moves from MotionScript),
  reduced-motion toggle, scroll-scene scrubber.
- **Scorecards** = gate results re-presented (zero extra compute):
  Performance (Lighthouse + LCP/CLS/TBT chips), Accessibility (axe severity
  → 0–100 + AA badge), SEO (validator weights + schema chips). Per page ×
  device; site card shows the WORST page; plain-language findings bound to
  sections; ship-bar + competitive median shown; live re-score on edits.
- Serving: `*.preview.siteforge.app`, cookie-less, CSP-locked, sandboxed
  iframes, signed short-lived URLs, immutable `/{siteId}/{version}/` paths,
  allowlisted postMessage bridge.

### 28. Studio & semantic editing [→ docs/STUDIO.md]

- Surfaces: pages tree + placeholder checklist + version timeline (left);
  preview canvas (center); section inspector + edit thread + publish
  (right). No drag-and-drop, no CSS panels — direction, not tooling.
- **Edit grammar** (typed ops, parsed from free text by a frontier model
  with confidence; low confidence asks ONE clarifying question):
  RetoneSection, RewriteCopy, SwapVariant, ReorderSections, SwapPattern,
  AdjustLanguage (personality delta within niche region), AdjustMotion
  (within ceiling), ReplaceAsset, EditFact, Add/RemoveSection (within
  playbook), TuneScene/SwapModel/DemoteTo (3D). Ops map to minimal stage
  re-runs (copy ~15–30 s; variant ~20 s; language delta ~60–90 s; fact
  ~10 s). No path to an ungated state exists.
- Every executed edit = new immutable `generated_sites` version; instant
  restore; side-by-side A/B compare. Inline text editing allowed; mechanics
  feedback as suggestions; user words never auto-rewritten; G7 claims still
  block publish.
- Publish flow: pre-flight (gates + blocking checklist + "take me to each"
  tour) → target (managed w/ domain wizard + auto-ACME | Vercel | Netlify |
  ZIP export with zero SiteForge runtime/phone-home) → ship (pointer flip +
  invalidation) → live panel (form inbox, privacy-first analytics: views,
  CTA clicks, per-section form conversions — opt-in learning-loop signal).
- Isolation: single-writer lock per site; bridge allowlisted both ways;
  generated JS never executes in the app origin.

---

## PART XII — SCALE, SECURITY, DELIVERY

### 29. Scaling requirements [→ docs/SCALING.md]

Postgres: primary (8 vCPU class) + 2 replicas; PgBouncer mandatory; monthly
partitions on usage_logs/generation_stages/gate_results from day one,
archived to S3 Parquet at 6 months. Workers: KEDA-style autoscale on queue
depth (target ≤ 60 s Standard queue wait); LLM pool and build/gate pool and
GPU pool scale independently; provider throughput governed by account pool +
Redis token buckets (adding capacity = config, not deploy). Backpressure is
honest: queue position shown, tiers never silently downgrade. SLOs: API p95
< 300 ms; Standard generation p95 < 3 min; SSE lag < 2 s. DR: PITR +
cross-region snapshots; S3 versioning/replication for bundles; RTO 1 h, RPO
5 min; published sites keep serving through platform outages. Kill switches:
per-provider, per-tier, global pause (queued work refunds). Explicit
non-goals until ≥ 500k users: sharding, active-active multi-region, Kafka,
separate warehouse.

### 30. Security posture

Tenancy scoping in one data-layer place; short-lived JWT + revocable hashed
refresh sessions; signed URLs everywhere; generated sites contain no
third-party scripts unless user-connected; user text sanitized (users inject
copy, never markup); moderation on briefs/copy; secret-scanning CI;
credential architecture per §26; sandboxed builders (gVisor, no network);
quarterly restore drill must prove a DB dump alone yields no usable
credential; deletion = purge + crypto-shred with 30-day soft-delete grace.

### 31. Environments & delivery

dev (per-PR ephemeral previews) → staging (scaled-down full topology;
nightly synthetic generations run the benchmark suite) → prod. Terraform
IaC; images built once, promoted; DB migrations expand-migrate-contract
(compatible one release each direction — API and workers deploy
independently); Design-DNA registry ships via its own versioned content-sync
job, decoupled from code deploys.

### 32. Build order (phased; each phase has a hard acceptance test)

**Phase 0 — Foundation.** Monorepo + shared schemas; auth/projects/billing
shell; orchestrator with durable steps + SSE; composer + output stack
(Astro + token CSS + motion runtime core); 3 archetypes × ~40 patterns ×
3 niches (Restaurant, Barber, SaaS suggested); gates G1+G2+G3 wired.
*Accept: one command generates a Standard-tier restaurant site end-to-end
that passes G1–G3 with Lighthouse ≥ 95.*

**Phase 1 — Premium bar.** Full 8-stage pipeline (brief, DIE derivation +
selector, 4-pass content, repair loop); G4 visual critic + G5 fingerprints +
G6/G7; MotionScript compiler + full runtime modules; Preview Engine
(progressive + devices + scorecards); Studio v1 (edit grammar subset:
copy/variant/reorder/fact); managed hosting + custom domains; remaining
9 niches + 5 more archetypes.
*Accept: benchmark harness (§25) run — win ≥ 4/6 axes vs. v0, Lovable, Bolt.*

**Phase 2 — Depth.** Signature tier (fan-out, art-director pass); 3D Engine
(Value Judge, Class A, Class B for Auto/Real-Estate, G8, GPU pool); AI
Provider System (BYOK llm-api + companion mode + broker/vault); exports +
Vercel/Netlify adapters; form inboxes + site analytics; library → 120+
patterns; teams/workspaces.
*Accept: Signature auto-dealer site with vehicle viewer passes G1–G8; a BYOK
generation on a user Claude key completes with correct ledger + usage rows.*

**Phase 3 — Moat (ongoing).** Learning loop: gate scores + repair causes +
edit patterns + opt-in conversion data → selection priors and generator
parameters ONLY (craft-library changes stay human-reviewed); quarterly taste
audits; niche/archetype expansion as pure content contributions.
*Accept: measurable month-over-month G4/G5 pass-rate improvement at constant
cost per generation.*

---

*End of master specification. Deeper rationale per system: `ARCHITECTURE.md`
and `docs/` (PIPELINE, DESIGN_DNA, DESIGN_INTELLIGENCE, CONTENT_INTELLIGENCE,
GENERATION_ENGINE, NICHE_PLAYBOOKS, MOTION_ENGINE, 3D_ENGINE, QUALITY,
DATABASE, DATA_MODEL, SCALING, AI_PROVIDERS, PREVIEW_ENGINE, STUDIO).*
