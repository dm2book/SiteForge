# SiteForge — Motion Engine

The Motion Engine is the full specification of how generated sites move. It
consolidates and completes the motion system sketched in
[`DESIGN_DNA.md`](DESIGN_DNA.md) §4 (dialects) and
[`DESIGN_INTELLIGENCE.md`](DESIGN_INTELLIGENCE.md) §5 (derivation): the
client runtime, the move vocabulary, the choreography compiler, and the
per-niche motion signatures.

Founding law:

> **No generic fades.** Generated sites do not use Framer Motion, and an
> opacity-only entrance is banned as a sole effect (it is exactly the
> `fade-in-up on everything` generic tell from DESIGN_DNA §1). Every
> visible move is a *composed, named move* from the vocabulary, chosen by
> the Choreographer for a reason the artifact records. Motion is direction
> and meaning — never "animate: true".

(The SiteForge SaaS app itself may use Framer Motion internally; generated
*output* never ships it.)

---

## 1. Architecture overview

```
GENERATION SIDE (build time)                    CLIENT SIDE (runtime)
┌─────────────────────────────┐   MotionScript  ┌──────────────────────────┐
│ Motion Compiler (stage 2)   │   (data, not    │ @siteforge/motion        │
│  dialect → easing/duration/ │    code)        │  core        ~4 KB gz    │
│  stagger/distance tokens    │ ──────────────▶ │  +scroll-story ~3 KB     │
│ Choreographer (stage 5)     │                 │  +transitions ~2 KB      │
│  per-section move selection,│                 │  +hover       ~2 KB      │
│  entrance timelines, scroll │                 │  (modules ship only if   │
│  scenes, hover/micro maps   │                 │   the script uses them)  │
└─────────────────────────────┘                 └──────────────────────────┘
```

- **MotionScript** is a per-page JSON artifact: timelines, scene
  definitions, hover maps, all referencing motion tokens. It is inspectable
  (Studio), diffable (edits), lintable (gates), and cacheable — motion is
  *content*, produced by the pipeline like copy or color.
- The runtime is dependency-free: WAAPI for tweens, IntersectionObserver
  for reveal triggers, ScrollTimeline API for scroll-binding (with a rAF
  fallback), View Transitions API for navigation. Composed budget ≤ 11 KB
  gz with every module loaded; most pages ship core + one module.
- Invariants enforced by the runtime itself: transforms/opacity/clip-path
  only (zero CLS by construction), max 5 concurrent tracks, all moves
  degrade to a 200 ms opacity settle under `prefers-reduced-motion`, no
  scroll-hijacking anywhere (scroll position is always user-owned; scenes
  *read* progress, never write it).

---

## 2. The move vocabulary

Named, parameterized primitives — the only things that can animate. Each
declares its personality range so the Choreographer can't miscast it:

| Move | What it is | Personality fit |
|---|---|---|
| `rise` | translateY + opacity, distance/duration from tokens | universal (the *floor*, never the ceiling) |
| `line-mask` | text revealed line-by-line from under a mask | formality high / editorial |
| `split-text` | per-word/char cascade with rotation ≤ 3° | boldness high, Signature |
| `clip-wipe` | directional clip-path reveal (edge follows grid) | craft/trades, kinetic |
| `blur-focus` | blur(12→0) + scale(1.04→1) | organic, hospitality |
| `scale-settle` | scale(0.97→1) with mass easing | product surfaces |
| `parallax` | translate bound to scroll progress, ≤ 6% travel | imagery-led languages |
| `draw` | SVG stroke/border draws in (rules, timelines, underlines) | heritage, editorial |
| `counter` | tabular-numeral count-up, once, ≤ 1.2 s | data surfaces |
| `stagger` | group operator: children offset by rhythm token | composes with any |
| `crossfade-morph` | shared-element size/position morph | transitions module |
| `camera-pan` | scroll-bound background-position/perspective shift | showcase scenes (2D "camera") |

**The anti-generic rule, mechanically:** an entrance must either compose ≥ 2
channels (transform + mask, blur + scale) or be a masked/drawn move. Bare
`rise` is allowed only for tertiary content (captions, list tails) — the
linter counts and caps it per page (≤ 30% of reveals). Framer-default
signatures (springy y-fade on cards, whileInView pop) are in the G4
generic-tell scan.

---

## 3. Scroll storytelling

The scroll-story module executes **scenes**: declarative, progress-bound
sequences compiled from the page's density curve (DESIGN_INTELLIGENCE §6.5).

```
Scene {
  range: [sectionTop-20%, sectionBottom],   // viewport-relative
  beats: [                                   // ordered, non-overlapping
    {at: 0.0..1.0, target, move, params},    // progress-locked moves
  ],
  pin: false | {duration: ≤ 1.5 viewport-heights}   // Signature only
}
```

Rules the compiler enforces:
- **Beats follow the narrative.** Scenes are generated from the SitePlan's
  section roles: proof sections settle in sequence, process timelines
  `draw` their connector as steps pass, stats `counter` exactly when read.
  Scroll storytelling is the page's argument made kinetic — not effects
  sprinkled on scroll.
- **One pinned moment per page maximum**, Signature tier only, ≤ 1.5
  viewport-heights of pinned progress, always skippable (scroll continues
  naturally past it), never on mobile viewports < 768 px.
- Progress mapping uses ScrollTimeline where available; the rAF fallback is
  passive-listener + transform-only (jank-free by construction).

---

## 4. Transitions

### 4.1 Page transitions (navigation)
Built on the View Transitions API (native in the Astro output stack), with
a dialect-derived grammar instead of default cross-fades:

- **Shared-element continuity:** the clicked card's image morphs into the
  destination hero (`crossfade-morph`); nav and footer persist statically.
  This is the single highest-leverage "feels engineered" moment in the
  whole system.
- Per-dialect character: `instant` cuts with a 120 ms shared-element morph
  (Linear-anchored); `mass` uses 350–450 ms morphs with easing tails;
  `settle` cross-dissolves content while chrome holds.
- No-support fallback: instant navigation (never a JS-blocked fake router).

### 4.2 Route transitions (in-page state)
Anchored-nav scrolls (Barber's one-pager), gallery filters, inventory
sort/filter, tab panels, menu course switching: FLIP-based reorder
animations (measure → invert → play, transform-only), 150–250 ms, list
items stagger by the rhythm token. Filter changes never blank the grid —
outgoing items settle out as incoming rise, so the surface feels continuous.

---

## 5. Reveal systems

### 5.1 Hero reveals
Every hero family (NICHE_PLAYBOOKS §0) declares an **entrance timeline**:
an ordered, overlapping sequence over 600–1100 ms total (dialect-scaled),
structured as *establish → announce → invite*:

```
hero/manifesto (Agency):    bg establishes (0) → split-text headline
                            (80 ms, word cascade) → work peek rises (400 ms)
hero/showroom (Auto):       vehicle image clip-wipes from left (0) →
                            spec ticker draws + counters (250 ms) →
                            search card scale-settles (500 ms)
hero/table-scene (Rest.):   full-bleed blur-focus (0, 900 ms, slow) →
                            wordmark line-masks (300 ms) → hours strip
                            rises last (650 ms)
```

The timeline plays once per session per page (session-stored); back-nav
shows the settled state instantly — replayed hero entrances read as a bug.

### 5.2 Cinematic reveals
Section-scale showcase moments for imagery-led sections (galleries, case
studies, project walls): full-bleed media revealed by `clip-wipe` or
`blur-focus` bound to scroll progress, captions `line-mask` after the
image lands, optional `camera-pan` drift while in view. Budgeted: ≤ 2
cinematic sections per page (scarcity keeps them cinematic).

### 5.3 Product reveals
For product/inventory/menu surfaces: grid items `scale-settle` in
rhythm-token stagger; the *featured* item gets one composed spotlight
(image morphs in, price counters, swatches draw) — one, because a page of
spotlights is a page of noise. Hover continues the same move family
(§6), so reveal and interaction feel like one material.

---

## 6. Hover systems

Hover is a *system* derived per design language, not per-element styling:

- **Link grammar:** one site-wide link behavior from the dialect (underline
  `draw`, weight shift, or color settle — never all three).
- **Card grammar:** one lift *or* one image treatment (secondary-image
  crossfade for ecommerce, subtle zoom ≤ 1.03 for photography, tilt ≤ 2°
  only when `energy > 0.7`). Shadows animate only if materiality is high.
- **Magnetic elements:** primary CTAs may attract the cursor ≤ 8 px in
  kinetic languages; banned in high-trust niches (Lawyer, Dentist,
  Roofing) — urgency and gravity don't flirt.
- **Custom cursors:** view-work / drag-gallery cursor affordances allowed
  only for Agency at Signature; never replace the system cursor globally.
- All hover states have touch equivalents defined (active-state compression,
  long-press previews) or degrade to nothing — hover is enhancement, never
  information.

---

## 7. Micro-interactions

The under-300 ms layer that makes interfaces feel expensive, shipped as a
hover-module map, all from the same easing family:

- **Buttons:** press compresses 0.97 with the dialect's fastest easing;
  loading states morph label → spinner in-place (no width jump — CLS zero
  applies to interaction too).
- **Forms:** focus draws the border (`draw`, 150 ms); validation states
  settle in (never shake by default — `spring` languages may shake once,
  small); success checkmarks draw.
- **Commerce/booking:** add-to-cart flies a 12 px ghost to the cart badge
  (spring languages) or badge-counts with a settle (quiet languages);
  booking-slot selection confirms with a scale-settle.
- **Feedback rule:** every user action gets exactly one motion
  acknowledgment ≤ 300 ms. Two is noise; zero is dead.

---

## 8. Niche motion signatures

Compiled defaults per niche (dialect × vocabulary subset × signature
moment) — each niche *feels* different in motion even at equal intensity:

| Niche | Signature motion identity |
|---|---|
| **Auto Dealer** | **Camera transitions**: `camera-pan` between showcase sections, inventory cards `clip-wipe` like a lot walk, spec `counter`s, page transitions morph vehicle card → detail hero (the test-drive feel). GSAP camera paths when the 3D showroom ships (3D_ENGINE). |
| **Barber** | **Smooth lifestyle transitions**: gallery with momentum-weighted `crossfade-morph` between cuts, portrait blur-focus reveals, booking slots settle with spring warmth; anchored-nav route transitions glide (one-pager as one continuous surface). |
| **Restaurant** | **Luxury menu reveals**: course chapters cross-dissolve as scroll scenes, dish names `line-mask` after imagery lands, prices settle last (food first, money second — choreographed conversion psychology), reservation strip rises only after the menu scene completes. |
| **Real Estate** | Listing photos `crossfade-morph` into detail pages; map/list route transitions FLIP; stat `counter`s once. Data surfaces never decorate (instant sort/filter). |
| **Gym** | `split-text` hero energy, schedule matrix columns `clip-wipe` in, transformation slider drag-owned; loudest allowed intensity. |
| **Roofing** | Near-still: before/after slider is the single motion moment; everything else `settle` at minimum durations. |
| **Dentist** | `blur-focus` softness, slowest stagger rhythm, zero surprise — motion as reassurance. |
| **Agency** | `structural-drama` full vocabulary incl. the one pinned scene and split-text manifesto; transitions are the portfolio. |
| **Ecommerce** | Product-first: secondary-image hovers, cart micro-physics, collection FLIP filters, one featured-product spotlight per page. |
| **SaaS** | The animated product frame owns the budget (DESIGN_INTELLIGENCE §5); everything else `settle`/`instant` so the product is the only performer. |
| **Lawyer** | Lowest ceiling: `rise`/`settle` only, `draw` on credential rules, no magnetic, no parallax. Restraint as credibility. |
| **Contractor** | `clip-wipe` project reveals (the craft wipe), process timeline `draw`s its connector, weighty `mass` easing — built, not bounced. |

These are compiler defaults; archetype and mood move them within niche
ceilings (merge semantics from GENERATION_ENGINE §2).

---

## 9. Gates & tiers

**Motion linter (deterministic, pre-gate):** vocabulary-only moves; bare-
`rise` cap; duration/concurrency budgets; one pinned scene max; hero
timeline ≤ 1100 ms; every interactive element has a micro-ack; reduced-
motion script variant present; MotionScript references only defined tokens.

**G4 additions (critic):** does motion follow the narrative (beats vs.
density curve)? Is the signature moment the *right* moment (the thing the
niche sells)? Framer-default-signature scan.

**Tiers:** Standard = dialect defaults (hero timeline + reveals + hover
grammar + micro-acks; already premium, zero generic fades). Premium = full
choreography (scenes, shared-element transitions, product spotlights).
Signature = pinned scene eligibility, split-text, custom cursors (Agency),
3D camera choreography where the 3D engine ships.

---

## 10. Placement in the codebase plan

`packages/motion` splits into `runtime/` (core + the three modules, the
only code shipped to sites) and `compiler/` (Motion Compiler, Choreographer,
MotionScript schema + linter — pipeline-side, pure functions). Scene/hover
maps for the Studio inspector derive from the MotionScript artifact, so
"why does this move" is always answerable — every animation on every
generated site traces to a named move, a token, and a recorded reason.
