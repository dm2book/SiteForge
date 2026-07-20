# SiteForge — Generation Pipeline

The pipeline is the competitive core of SiteForge. It turns three user inputs
(**niche**, **style**, **quality tier**) into a complete, gated, deployable
website. It is designed like an agency workflow: intake → art direction →
information architecture → copy → build → review → revisions.

Every stage is a durable orchestrator step with a **typed artifact contract**
(zod schemas in `packages/shared`). Artifacts are persisted per stage, which
enables partial re-runs, semantic edits, auditing, and cost caching.

```
niche + style + tier
      │
      ▼
[1] Brief Synthesis ──► CreativeBrief
      ▼
[2] Design System Generation ──► DesignTokens
      ▼
[3] IA & Section Planning ──► SitePlan
      ▼
[4] Content Generation ──► ContentGraph
      ▼
[5] Composition ──► SiteBundle (Astro project → static build)
      ▼
[6] Asset Resolution ──► resolved SiteBundle
      ▼
[7] Quality Gates ──► GateReport
      ▼
[8] Repair Loop ──► (targeted re-runs of 2/4/5/6) ──► shippable SiteBundle
```

---

## Stage 1 — Brief Synthesis

**Input:** `{ niche, archetype, moodSliders, tier, userBusinessInfo? }`
**Output:** `CreativeBrief`

The stage that replaces the agency client workshop. A frontier model produces:

- **Business model inference** — what this business sells, who buys it, what
  the visitor's job-to-be-done is, what objections must be neutralized.
- **Brand voice definition** — 3 voice adjectives + 3 anti-adjectives, a tone
  spectrum position, example sentence rewrites ("we say X, never Y").
- **Positioning angle** — the one-line promise the whole site orbits. This is
  what separates handcrafted-feeling sites from generic ones: a generic site
  says what the business *is*; a crafted one argues why it *matters*.
- **Conversion strategy** — primary CTA, secondary CTA, trust signals to
  feature (niche taxonomy supplies the priors: dentists need insurance logos
  and before/afters; law firms need credentials and case results; restaurants
  need menu + reservation).
- **Art direction notes** — imagery mood, subjects to seek/avoid, treatment
  (e.g. "warm film grain, natural light, no sterile stock smiles").

The niche taxonomy (`docs/DATA_MODEL.md` §2) grounds the model with curated
per-vertical knowledge so the brief is opinionated, not averaged.

**Why it matters:** every downstream stage consumes the brief. Errors here
cascade, so this stage always runs on the frontier model tier and, at
Signature tier, generates 3 candidate briefs scored by a critic pass.

---

## Stage 2 — Design System Generation

**Input:** `CreativeBrief + archetype`
**Output:** `DesignTokens`

Generates the site's visual identity *as data*, constrained by the archetype's
rules (see `docs/DESIGN_DNA.md`):

- **Type system** — pairing selected from the curated matrix; modular scale
  ratio; per-role specs (display/heading/body/label) with weight, tracking,
  leading; fluid `clamp()` sizes.
- **Color system** — semantic palette (bg, surface, ink, accent, muted + state
  colors) generated in OKLCH. **WCAG 2.2 AA contrast is enforced by the
  generator itself** — palettes are constructed to pass, not checked after.
- **Spacing & rhythm** — base unit, section rhythm scale, container widths,
  radius scale, border/shadow language.
- **Motion language** — one of the motion dialects (see `docs/DESIGN_DNA.md`
  §4) parameterized: easing curves, base durations, stagger intervals,
  reveal distances, scroll-trigger thresholds.

Output is strict JSON (schema-constrained decoding). Tokens compile to CSS
custom properties consumed by every section pattern — which is why one section
library can produce visually unrelated sites.

---

## Stage 3 — IA & Section Planning

**Input:** `CreativeBrief + DesignTokens`
**Output:** `SitePlan`

- **Sitemap** — pages appropriate to the niche and tier (Standard: 1–3 pages;
  Premium: 4–6; Signature: 6–10 incl. detail pages like individual services).
- **Per-page section sequence** — for each page, an ordered list of section
  *slots* (`hero`, `social-proof`, `service-grid`, `process`, `founder-note`,
  `pricing`, `faq`, `final-cta`, …), each bound to a **pattern id + variant
  axes** from the section library, plus a rationale.
- **Narrative arc check** — the planner enforces storytelling rules: open with
  the promise, earn trust before asking, alternate density (a rich section
  follows a calm one), exactly one primary CTA per page, end pages with a
  full-bleed conversion moment. These rules are encoded as a validator the
  plan must pass, not just prompt guidance.
- **Anti-template shuffle** — the planner must deviate from the niche's most
  common pattern sequence (tracked statistically) in at least two meaningful
  ways, so ten coffee-shop sites don't share a skeleton.

---

## Stage 4 — Content Generation

**Input:** `CreativeBrief + SitePlan`
**Output:** `ContentGraph` (copy for every slot of every section + SEO layer)

- Copy is generated **per section with the brief's voice contract in context**,
  then passed through a *voice-consistency* critic that flags drift ("this FAQ
  answer sounds corporate; the brief says warm and plainspoken").
- Hard copy rules enforced by validators: headline ≤ 9 words; no filler
  ("Welcome to", "We are passionate about", "Look no further"); benefits
  before features; concrete specifics over superlatives (the model must invent
  plausible *specific* placeholders — "roasted in 12 kg batches every Tuesday"
  — that the user can correct, rather than vague filler that reads generic).
- **SEO layer:** title/meta/OG per page, schema.org JSON-LD (LocalBusiness,
  Service, FAQPage, BreadcrumbList per niche), heading-tree plan, internal
  link map, image alt-text written from art direction (not "image of…").
- User-supplied business facts (name, address, hours, real services) slot in
  as structured data; everything else is clearly-marked editable placeholder.

---

## Stage 5 — Composition

**Input:** `SitePlan + DesignTokens + ContentGraph`
**Output:** `SiteBundle` (a complete Astro project + built static output)

The **composer** (`packages/composer`) is *deterministic code*, not an LLM:

1. Scaffolds an Astro project with the token CSS layer and motion runtime.
2. Instantiates each planned section pattern with its variant parameters,
   token bindings, copy, and motion choreography (entrance order, stagger
   groups) resolved from the plan.
3. Wires navigation, footer, forms (posting to SiteForge form endpoints),
   page transitions, favicon/OG image generation.
4. Runs `astro build` in a sandboxed builder (no network, resource-limited)
   and captures the static bundle.

An LLM participates only in a bounded way: a **composition-refinement pass**
may adjust variant parameters and motion choreography within each pattern's
declared safe ranges. It never writes free-form layout CSS. This is the
architectural answer to "why won't it break like Bolt/Lovable output": the
model has taste-level control but not correctness-level control.

---

## Stage 6 — Asset Resolution

**Input:** `SiteBundle + CreativeBrief.artDirection`
**Output:** resolved `SiteBundle`

- Queries licensed stock providers with art-direction-derived queries; a
  vision model ranks candidates for mood/subject/composition fit; color
  grading/duotone applied to match the palette.
- Signature tier: AI-generated hero/brand imagery consistent with art
  direction (with clear provenance metadata).
- Font subsetting, AVIF/WebP encoding, responsive `srcset`, LQIP placeholders,
  OG image rendered from a token-styled template.

---

## Stage 7 — Quality Gates

**Input:** built `SiteBundle`
**Output:** `GateReport` (pass/fail + machine-actionable findings per gate)

Run in parallel where independent (details and thresholds in
`docs/QUALITY.md` §2):

1. **Accessibility** — axe-core on every page + keyboard-nav crawl + reduced-
   motion snapshot.
2. **Performance** — Lighthouse CI (mobile emulation) + bundle budgets.
3. **SEO** — meta/schema/heading-tree/link validators.
4. **Visual critic** — screenshots at 390/768/1440 per page → frontier vision
   model acting as art director with a structured rubric (hierarchy, spacing
   rhythm, alignment, contrast, typographic detail, "generic tells"). Returns
   scored findings bound to section ids.
5. **Uniqueness** — DNA fingerprint distance vs. recent same-niche/archetype
   generations (`docs/DESIGN_DNA.md` §6).
6. **Conversion checklist** — niche playbook assertions (CTA presence/order,
   trust-signal placement, form length, mobile sticky CTA).

---

## Stage 8 — Repair Loop

**Input:** `GateReport`
**Output:** shippable `SiteBundle` (all blocking gates green)

- Findings are routed to the *cheapest sufficient* fix: token adjustment
  (contrast bump) → stage 2 partial; copy fix → stage 4 partial for that
  section; layout/spacing finding → composition variant change; asset finding
  → stage 6 re-query.
- Max 3 repair rounds; if a blocking gate still fails, the orchestrator
  re-rolls the smallest failing scope (a section, a page) rather than the
  site. Full re-rolls are a last resort and are rate-limited per generation.
- Every repair round appends to the generation's audit trail — this data is
  the Phase-3 learning-loop feedstock (which patterns fail which gates, which
  archetype/palette combos misfire).

---

## Orchestration details (§8 referenced from ARCHITECTURE.md)

- **Durable steps:** each stage is an idempotent step keyed by
  `(generationId, stage, attempt)` with persisted artifacts; workers are
  stateless and horizontally scalable.
- **Streaming:** stages emit narrative progress events (`brief.positioning`,
  `tokens.palette`, `plan.page`, …) → SSE → wizard UI renders intermediate
  artifacts live.
- **Budgets:** per-tier token and wall-clock budgets enforced per stage;
  exceeding a soft budget downgrades model tier for non-critical stages,
  exceeding a hard budget fails the generation cleanly (never a silent
  quality drop at Signature tier — it errors instead).
- **Caching:** artifact-hash keyed. Semantic edits ("calmer hero") invalidate
  only the stages whose inputs changed.
- **Candidate fan-out:** Premium runs 2 design-token candidates, Signature
  runs 3 briefs × 2 token sets with critic selection at each fork. Fan-out is
  a tier feature, never applied to Standard (cost floor).
