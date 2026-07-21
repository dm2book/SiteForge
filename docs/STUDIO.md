# SiteForge — Preview Studio & Semantic Editing

The Studio is where a generation becomes *the user's site*: full-fidelity
preview, semantic refinement, fact completion, and publishing. It is the
surface that decides whether SiteForge feels like an agency handing over
work (our goal) or a builder handing over homework (everyone else).

Design stance: **the user directs; the system executes.** No drag-and-drop,
no CSS panels, no breakpoint fiddling — those tools transfer the craft
burden back to the user and are how builder output degrades after delivery.
Every edit path keeps the site inside the gates.

---

## 1. Surfaces

```
┌────────────────────────────────────────────────────────────────┐
│  Studio                                                        │
│ ┌───────────────┐  ┌─────────────────────────┐  ┌────────────┐ │
│ │ Left rail     │  │ Preview canvas          │  │ Right rail │ │
│ │ · pages tree  │  │ sandboxed iframe        │  │ · section  │ │
│ │ · checklist   │  │ 390 / 768 / 1440 frames │  │   inspector│ │
│ │   (facts to   │  │ device chrome, live     │  │ · edit     │ │
│ │   replace)    │  │ motion, real fonts      │  │   thread   │ │
│ │ · versions    │  │                         │  │ · publish  │ │
│ └───────────────┘  └─────────────────────────┘  └────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

- **Preview canvas** — the real built bundle from the preview CDN origin
  (ARCHITECTURE §4.8), not a re-implementation: what you see is byte-for-byte
  what ships. Device frames switch instantly (three pre-rendered widths);
  motion plays for real; a "reduced motion" toggle previews that experience.
- **Section inspector** — hovering the canvas highlights section boundaries
  via the postMessage bridge; selecting one shows its identity (pattern,
  variant, copy framework), its content, and its available *semantic* moves.
- **Edit thread** — a persistent conversation per site. Every edit —
  chat-typed or inspector-clicked — lands here as a card with its diff and
  status. The thread is the project's memory; "make it warmer" three weeks
  later has context.
- **Checklist rail** — the Specificity Engine's placeholder inventory
  (CONTENT_INTELLIGENCE §3) rendered as a completion checklist ("Replace 4
  placeholder details before publish"), plus gate status per page.

---

## 2. The semantic edit system

### 2.1 Edit grammar
User intents compile to a small typed operation set — the contract between
"anything the user can say" and "changes the pipeline can execute safely":

```
EditOp =
  | RetoneSection   {section, voice_delta}        // "hero more confident"
  | RewriteCopy     {section, slot, instruction}  // "shorter headline"
  | SwapVariant     {section, axis, direction}    // "calmer layout" → variant move
  | ReorderSections {page, from, to}              // "testimonials above pricing"
  | SwapPattern     {slot, within: niche+archetype space}
  | AdjustLanguage  {personality_delta}           // "warmer overall" → DIE re-derive
  | AdjustMotion    {intensity_delta | dialect within ceiling}
  | ReplaceAsset    {slot, direction | upload}
  | EditFact        {fact_id, value}              // checklist completions
  | AddSection / RemoveSection {page, slot}       // within playbook rules
```

A frontier model parses free text → `EditOp[]` with a confidence score;
low-confidence parses ask one clarifying question in the thread rather than
guessing ("Calmer — the animation, the colors, or the words?"). Inspector
buttons emit ops directly, skipping the parse.

### 2.2 Execution = partial pipeline
Each op maps to the minimal stage set (PIPELINE §8 caching):

| Op class | Re-runs | Typical latency |
|---|---|---|
| Copy ops | stage 4 (section) + 5 rebuild + G7/G4-lite | ~15–30 s |
| Variant/reorder ops | stage 5 + G1/G4-lite | ~20 s |
| Language/motion deltas | stage 2 re-derive + 5 + full gates | ~60–90 s |
| Fact edits | content splice + 5 rebuild | ~10 s |
| Pattern swaps / add-remove | stage 3 (slot) + 4 (section) + 5 + gates | ~45 s |

Personality deltas move *within* the niche's allowed region
(DESIGN_INTELLIGENCE §7) — the Studio exposes sliders for warmth/energy/
boldness that literally cannot leave the valid space. There is no path, chat
or UI, to an ungated or off-taste state.

### 2.3 Versions, not fear
Every executed edit produces a new immutable site version
(`generated_sites` row) with its thread card. The versions rail is a visual
timeline (hero thumbnails); restore is instant (pointer flip); A/B compare
renders two versions side-by-side in the canvas. Users experiment freely
because nothing is destructive — the emotional prerequisite for accepting
AI-executed edits.

### 2.4 Direct text editing
Inline text editing on the canvas is allowed (users must be able to just fix
a word). Edits splice into the ContentGraph, trigger a fast rebuild, and get
mechanics-pass feedback as suggestions. User words are sovereign
(CONTENT_INTELLIGENCE §6): the system warns, it never rewrites without being
asked. Verifiable-claim placeholders remain publish-blocking.

---

## 3. Publish flow

1. **Pre-flight** — gate summary + checklist state. Unreplaced *blocking*
   placeholders (G7 class) stop here with a one-click "take me to each"
   tour; advisory items (e.g. "2 photos still stock-sourced") are listed but
   don't block.
2. **Target select** — managed hosting (default: `{name}.siteforge.site`,
   custom domain wizard with automated DNS check + ACME), Vercel/Netlify
   (OAuth-connected, we push the bundle), or export (ZIP of static build
   and/or Astro source — clean, dependency-light, readable code as a product
   promise).
3. **Ship** — pointer flip + CDN invalidation for managed; adapter call
   otherwise. The thread gets a publish card with the live URL and a
   before/after screenshot pair.
4. **Post-publish** — managed sites get the live panel: form submissions
   inbox, privacy-first analytics (pageviews, CTA clicks, form conversions
   per section — the learning loop's opt-in conversion signal), and
   re-publish of any newer version.

---

## 4. Trust & isolation properties

- Preview origin is cookie-less, CSP-locked, `sandbox`-attributed; the
  postMessage bridge is allowlisted both directions (section geometry out,
  highlight commands in — nothing else).
- The Studio never executes generated JS in its own origin.
- Concurrent editing: single-writer lock per site (Phase 2 teams get
  presence + handoff); the thread serializes edit ops regardless.
- Export contains zero SiteForge runtime dependencies or phone-home code —
  exported means owned.

---

## 5. Placement in the codebase plan

`apps/web` gains the Studio routes; the edit grammar, op→stage mapping, and
thread model live in `packages/pipeline` (ops are pipeline citizens, not UI
concepts); the postMessage bridge + section-geometry emitter ship inside the
composer's bundle output (dev-only script layer, stripped from published
builds).
