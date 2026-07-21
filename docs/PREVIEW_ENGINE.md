# SiteForge — Preview Engine

The Preview Engine is the rendering and scoring layer behind the moment that
sells the product: **niche → style → generate → a live, moving, scored
website**. It powers two surfaces — the Generation Wizard's live preview
(this document's focus) and the Studio canvas ([`STUDIO.md`](STUDIO.md),
which consumes this engine).

Design stance: **the preview is the product, not a picture of it.** What
renders in the frame is the real built bundle — real fonts, real motion
runtime, real breakpoints — served from the same class of origin that will
host it. Nothing is simulated that can be real.

---

## 1. The four-step flow, as preview states

```
1 SELECT NICHE      2 SELECT STYLE          3 GENERATE               4 LIVE PREVIEW
┌──────────────┐   ┌──────────────────┐   ┌────────────────────┐   ┌──────────────────┐
│ niche cards   │   │ archetype cards  │   │ PROGRESSIVE PREVIEW │   │ full interactive │
│ (each card    │   │ = live animated  │   │ artifacts stream in │   │ site, 3 devices, │
│ shows a real  │   │ mini-previews    │   │ as stages complete: │   │ motion controls, │
│ generated     │   │ rendered in the  │   │ brief → palette →   │   │ scorecards       │
│ thumbnail for │   │ niche's context  │   │ type → skeleton →   │   │ (SEO · A11y ·    │
│ that niche)   │   │ (§2)             │   │ sections compose(§3)│   │  Performance)    │
└──────────────┘   └──────────────────┘   └────────────────────┘   └──────────────────┘
```

Steps 1–2 are preview-driven too: niche cards carry real sample generations
(refreshed by the nightly benchmark runs, never hand-mocked), and archetype
cards are live micro-previews *of the chosen niche* — picking "Restaurant
then Editorial Luxury" shows an editorial restaurant, not an abstract
swatch. The engine renders these from a pre-generated, periodically
refreshed sample matrix (12 niches × 8 archetypes), so step 2 feels like
choosing between finished directions, not adjectives.

---

## 2. Progressive preview (during generation)

The wait is the first impression, so generation renders as **watching an
agency work**, fed by the pipeline's SSE events (PIPELINE §8):

| Pipeline stage | Preview element that appears |
|---|---|
| 1 Brief | The positioning line + voice adjectives, typeset live as a "creative brief" card |
| 2 Design system | Palette swatches fade in; type specimen sets itself; motion dialect plays its signature easing on the specimen |
| 3 IA & plan | The sitemap draws; page skeletons assemble as labeled wireframe blocks (real section slots, real order) |
| 4 Content | Copy streams into the wireframe blocks — headlines land first |
| 5 Composition | Wireframe blocks are progressively replaced by **real rendered sections** (§ below) |
| 6 Assets | Imagery fades from LQIP to graded finals |
| 7–8 Gates/repair | Scorecards fill in (§5); repairs annotate ("tightening contrast…") |

**Section-level pre-rendering:** the composer emits each instantiated
section as a standalone static fragment the moment it's composed (token CSS
+ section HTML, motion deferred), streamed into a shell document in the
preview frame. The full `astro build` still runs for the final bundle; the
fragments exist purely so the user watches their site *assemble itself* —
the single strongest "handcrafted, not templated" perception moment in the
product. Fragment rendering is cheap (no build, just component render) and
is dropped, not queued, if the user navigates away.

Failure honesty: if a stage fails into repair, the preview says so in
narrative form; if a generation dies, the progressive artifacts remain
visible with a clean re-roll CTA (credits auto-refunded, DATABASE §2.10) —
never a spinner that becomes an apology.

---

## 3. Device simulation

Three first-class frames, instant switching:

| Frame | Viewport | Simulation properties |
|---|---|---|
| Desktop | 1440 × 900 | DPR 2, pointer: fine, hover: hover |
| Tablet | 768 × 1024 | DPR 2, portrait/landscape toggle |
| Mobile | 390 × 844 | DPR 3, pointer: coarse, touch events, safe-area insets |

- **Real viewports, not CSS scaling:** each frame is an iframe at true
  viewport size (scaled *visually* to fit the canvas via transform — layout
  math inside runs at real size), so media queries, container queries,
  fluid `clamp()` type, and the capability ladder all fire exactly as they
  will in production.
- Mobile frame emulates touch (pointer events + coarse hints) so
  touch-only affordances (sticky CTAs, active-state compression, cart bar)
  demonstrate themselves; hover-dependent behavior is verifiably absent —
  a live proof of the mobile-first bar rather than a claim.
- All three frames run simultaneously off one bundle load (shared origin
  cache); switching is a reveal, not a reload. A side-by-side "all devices"
  view renders the trio together — the screenshot users share.

---

## 4. Motion fidelity & controls

The frame runs the real MotionScript on the real runtime
([`MOTION_ENGINE.md`](MOTION_ENGINE.md)) — entrance timelines, scroll
scenes, shared-element page transitions, hover systems, micro-interactions
all behave exactly as shipped. On top, preview-only controls (a dev-layer
script stripped from published builds, same layer as the Studio bridge):

- **Replay** — re-arm the hero entrance and reveal states (they normally
  play once per session).
- **Slow motion** — 0.25× global playback (WAAPI `playbackRate`) for
  inspecting choreography.
- **Motion map** — overlay outlining each animated element with its named
  move (from the MotionScript artifact) on hover; clicking one in the
  Studio context opens the section's motion in the inspector.
- **Reduced-motion toggle** — previews the `prefers-reduced-motion`
  experience; the toggle is prominent, because shipping it is a gate and
  showing it is a differentiator.
- Scroll-scene scrubber — dragging page scroll in slow-mo shows
  progress-bound beats land; a proof surface for "no scroll-hijacking".

---

## 5. Scorecards: SEO · Accessibility · Performance

Scores are **gate results re-presented**, not a separate audit — zero extra
compute (QUALITY.md §2 already produces them per page, per breakpoint):

| Scorecard | Source | Shown as |
|---|---|---|
| **Performance** | G2: Lighthouse CI runs (mobile + desktop), CWV budgets | 0–100 (Lighthouse convention) + LCP/CLS/TBT chips |
| **Accessibility** | G1: axe-core, keyboard crawl, contrast, reduced-motion | 0–100 mapped from violation severity + "WCAG 2.2 AA" badge when clean |
| **SEO** | G3: meta/schema/heading/link validators | 0–100 from validator weights + schema-types-present chips |

Presentation rules:
- **Per page × per device**, with the site-level card showing the *worst*
  page (honest aggregation — a mean hides the broken page).
- Every score expands into plain-language findings bound to sections
  ("Hero image is the largest element and loads in 0.9 s — good"), reusing
  gate findings' section anchors; jargon appears only behind a "details"
  layer with the raw Lighthouse/axe artifacts downloadable.
- **Context framing:** each card shows the SiteForge ship-bar ("every site
  must clear 95") and the competitive median from the benchmark harness
  (QUALITY §4) — the scores are a sales surface precisely because the bars
  are enforced, so the engine leans into it.
- Re-scoring on edit: semantic edits re-run affected gates
  (STUDIO §2.2); scorecards show a pending shimmer per affected card and
  update in place — users watch an edit *not* break their scores, which
  builds the trust that makes them edit freely.

---

## 6. Serving architecture

```
                     ┌───────────────────────────────────────────┐
  wizard/studio ───▶ │ Preview origin  *.preview.siteforge.app   │
  (iframe, signed    │  · cookie-less, CSP-locked, sandboxed     │
   URL per version)  │  · immutable paths /{siteId}/{version}/…  │
                     │  · fragment shell during generation        │
                     └───────────────┬───────────────────────────┘
                                     │ pull-through cache
                     ┌───────────────▼───────────────┐
                     │ Object store: bundles + section│
                     │ fragments + gate artifacts     │
                     └───────────────────────────────┘
   SSE (progress + fragment + score events) ──▶ wizard UI
   postMessage bridge (allowlisted) ◀──▶ frames (section geometry,
                                          motion map, replay/slow-mo)
```

- Signed, short-lived URLs per site version; the origin serves only
  immutable version paths, so preview caching is total and version switches
  (Studio A/B compare) are pure cache hits.
- Isolation properties inherit from STUDIO §4 (cookie-less origin,
  allowlisted bridge, no generated JS in the app origin).
- The dev-layer (bridge + motion controls + fragment shell) is one script
  injected only on preview paths — published bundles never contain it
  (verified by a byte-diff check in the publish pre-flight).

---

## 7. Placement in the codebase plan

`packages/preview`: fragment shell + dev-layer scripts, score presentation
mappers (gate report → scorecard JSON), sample-matrix refresher job.
`apps/web`: wizard preview states, device frame components, SSE consumers.
Origin config lives in `infra/` beside the sites CDN. The sample matrix
(12×8 live previews for steps 1–2) is produced by the existing nightly
benchmark generations — the marketing surface and the regression suite are
the same artifact, so the wizard's promises can never drift from what the
pipeline actually produces.
