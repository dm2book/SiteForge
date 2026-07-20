# SiteForge — Design Intelligence Engine

The Design Intelligence Engine (DIE) is the layer that makes generated sites
*feel* like Apple, Stripe, Porsche, Linear, Arc, and Notion feel — without
copying any of them. It sits inside pipeline stage 2 (design-system
generation) and stage 5 (composition), consuming the creative brief and niche
rule set, and emitting a fully-derived **Design Language** that every other
subsystem obeys.

Relationship to existing documents: [`DESIGN_DNA.md`](DESIGN_DNA.md) defines
the *assets* (archetypes, pairings, patterns, dialects); this document
defines the *intelligence* that chooses among them and derives every token —
the difference between owning good paint and knowing how to paint.

---

## 1. What the references actually teach

The six reference companies are not moods to imitate; they are **measurable
disciplines**. The engine encodes what makes them read as premium, as
computable invariants:

| Reference | The discipline it demonstrates | Encoded as |
|---|---|---|
| **Apple** | Scale courage: enormous display type, tiny supporting text, nothing in between fighting for attention. Weighty, physical motion. | Type-contrast floor (§4.2); mass-based easing family (§5.2) |
| **Stripe** | Density done calmly: heavy information load with perfect rhythm; one accent doing all the work; diagrams as first-class content. | Accent-scarcity budget (§3.3); rhythm-consistency invariant (§6.2) |
| **Porsche** | Material luxury: photography-led, deep contrast, restrained palette that lets the subject carry color. Motion as engineering, not decoration. | Imagery-carries-chroma mode (§3.4); intensity ceilings (§5.4) |
| **Linear** | Speed as aesthetic: instant transitions, tight type, obsessive alignment, dark-surface mastery. Nothing over 200 ms. | Fast dialect calibration (§5.2); alignment-tolerance zero (§6.4) |
| **Arc Browser** | Personality inside discipline: playful color and shape choices that never break the grid or hierarchy. | Bounded-playfulness rule: expressiveness spends on ≤ 2 channels (§2.3) |
| **Notion** | Warm utility: monochrome + generous line-height + soft edges; interface that disappears behind content. | Content-forward mode: chrome-minimization scoring (§6.3) |

These are compiled into **reference profiles** — calibration vectors used two
ways: (a) as *anchors* in design-language space (§7), and (b) as the scoring
standard for the reference-parity critic (§8). Generated sites are measured
against the disciplines, never against the brands' actual visuals — G4's
generic-tell scan explicitly flags trade-dress mimicry (Stripe's gradient
mesh, Apple's product-page tropes) as failures.

---

## 2. The Design Language object

Everything downstream derives from one computed object. No token is ever
chosen independently — that independence is where amateur design (and
competitor output) falls apart.

```
DesignLanguage {
  personality: {            // the 6-axis vector, each 0..1
    warmth,                 // clinical ↔ human
    energy,                 // calm ↔ kinetic
    density,                // airy ↔ information-rich
    formality,              // playful ↔ serious
    boldness,               // quiet ↔ loud
    materiality             // flat/graphic ↔ photographic/physical
  },
  anchors: [referenceProfile × weight],   // e.g. 0.6·stripe + 0.4·notion
  archetype: <from DESIGN_DNA>,           // the asset family it draws from
  seeds: { hue_seed, pairing_id, dialect_id, grid_id },
  derived: { ColorSystem, TypeSystem, MotionSystem, LayoutSystem, ChromeSystem }
}
```

### 2.1 Derivation, not selection
The five `derived` systems are *functions of* personality + seeds. Change
`warmth` and the neutrals re-tint, the radii soften, the easing curves
loosen, the photography grading warms — in one move, coherently. This is the
architectural definition of "feels designed by one person."

### 2.2 Coherence invariants (checked at derivation time)
- Every derived value must be traceable to personality/seed inputs (no
  orphan constants).
- Cross-system agreement: motion speed class must match density class
  (dense+slow reads broken); radius scale must match type roundness class;
  shadow depth must match materiality.

### 2.3 The expressiveness budget (the Arc rule)
A language may spend "personality" on at most **two channels** (color, type,
shape, motion, layout). Arc spends on color+shape and keeps type/layout
strict; Apple spends on type+motion and keeps color near-mono. Three or more
expressive channels is the mathematical signature of amateur design — the
budget makes it unrepresentable.

---

## 3. Color Intelligence

Extends DESIGN_DNA §3.2 from "correct palettes" to "reference-grade color
behavior." All math in OKLCH.

### 3.1 Neutral architecture first
Premium sites are 90%+ neutrals. The engine builds the neutral ramp before
any accent: 9 steps, hue-tinted toward the accent's hue at 2–4% chroma
(never gray-gray), with lightness steps sized for the density class (dense
languages need more close surface steps — the Stripe lesson; airy ones need
fewer, farther apart).

### 3.2 Accent derivation
One primary accent, derived from `hue_seed` + niche psychology priors
(playbook-supplied: trust hues for Lawyer/Dentist, appetite-safe ranges for
Restaurant, performance darks for Auto). A secondary accent exists only if
`boldness > 0.7` and then only for data/graphics, never for CTAs (CTA color
is singular — a conversion invariant, G6).

### 3.3 Accent scarcity budget (the Stripe rule)
The composer receives a hard budget: accent may cover **≤ 4% of rendered
pixel area per viewport** (measured on gate screenshots). Scarcity is what
makes the accent feel expensive; the budget converts taste into a testable
number.

### 3.4 Chroma-source modes
Each language declares where color comes from: `ui-carried` (Arc — chromatic
surfaces, neutral imagery), `imagery-carried` (Porsche — near-mono UI,
photography supplies all saturation; the asset pipeline grades images UP
while the UI stays quiet), or `balanced`. Declaring the mode prevents the
double-saturation clash that screams template.

### 3.5 Dual-theme derivation
Dark mode is derived, not inverted: lightness ramps rebuilt around elevated
dark surfaces (the Linear lesson — dark ≠ #000 + same accents; accents gain
lightness and lose chroma to hold perceived weight). Both themes ship only
when the niche playbook allows (Restaurant standard sites are light-only;
SaaS ships both).

---

## 4. Typography Intelligence

### 4.1 Selection logic
The pairing matrix (DESIGN_DNA §3.1) is queried by personality vector, not
picked by the model freehand: formality+boldness map to pairing families;
niche voice range vetoes mismatches (Gym's driven voice never sets in a
delicate didone).

### 4.2 Scale courage (the Apple rule)
Premium hierarchy is *contrast*, not variety. Invariants:
- Display-to-body ratio ≥ 4:1 when `boldness > 0.5` (hero display sizes in
  the 72–160 px fluid range), ≥ 3:1 otherwise.
- Maximum **4 active sizes per viewport** — more sizes = less hierarchy.
- Exactly one typographic "moment" per page (the manifesto/hero) allowed to
  break the scale upward.

### 4.3 Micro-typography (where "agency" lives)
Derived per size, not global: tracking tightens as size grows (−1% to −3%
at display sizes), loosens for labels/small-caps; line-height derived from
measure and density (Notion's generosity encoded: `warmth > 0.6` adds
0.05–0.1 to body leading); measures clamped 45–75ch; tabular numerals forced
in data contexts (pricing, stats, inventory); optical alignment (hanging
punctuation, icon baseline math) applied by the composer.

### 4.4 Weight discipline
Two weights minimum, three maximum per family. The step between adjacent
hierarchy levels must change **at least two attributes** (size+weight,
size+color, weight+case) — single-attribute steps read as accidents.

---

## 5. Motion Intelligence

Extends the dialect system (DESIGN_DNA §4) with derivation and calibration.

### 5.1 Motion personality
`energy`, `materiality`, `formality` map to the dialect and its parameters.
The result is a **MotionSystem**: easing family, duration scale, stagger
rhythm, distance scale, and an orchestration grammar.

### 5.2 Easing families (calibrated against references)
- `mass` (Apple/Porsche): objects have weight — long decelerations
  (400–700 ms, cubic-bezier tails), short accelerations, no bounce.
- `instant` (Linear): 120–200 ms, near-linear-out; hover states < 100 ms;
  page transitions are cuts with a single shared element.
- `settle` (Stripe/Notion): 250–350 ms ease-out, motion you barely notice —
  the default for high-trust niches.
- `spring` (Arc): physical springs on micro-interactions only; entrances
  stay in `settle` (springing entrances is a generic tell).

### 5.3 Orchestration grammar
Pages animate as **one composition**: a single entrance timeline per
viewport (max 5 concurrent tracks), stagger rhythm derived from the type
scale's ratio (motion and type share DNA), scroll choreography budgeted per
page (N reveal groups, at most one pinned moment, Signature tier only).
Micro-interactions (hover, press, form focus) come from the same easing
family — the detail users feel but never name.

### 5.4 Restraint enforcement
Niche `intensity_ceiling` clamps the derived system (Lawyer gets `settle`
at minimum durations regardless of archetype energy). The global budget
stands: transforms/opacity only, zero CLS, reduced-motion degrades to
opacity, total motion-runtime JS < 8 KB.

---

## 6. Layout Intelligence

### 6.1 Spatial derivation
`density` + `formality` derive the spatial system: base unit, a **spacing
scale whose ratio matches the type scale** (shared rhythm — the single
strongest "designed, not assembled" signal), container widths, and section
rhythm (vertical padding as a scale, not per-section guesses).

### 6.2 Rhythm-consistency invariant (the Stripe rule)
Every vertical gap on a page must be a scale step. The composer cannot emit
an off-scale margin; the visual critic (G4) measures gap histograms on
screenshots as a backstop — a flat histogram (many unique gaps) is an
automatic craft failure.

### 6.3 Chrome minimization (the Notion rule)
Every non-content element (borders, shadows, backgrounds, dividers) must
justify itself: the composer scores each section's chrome-to-content ratio
against the language's density class and strips decoration that doesn't
group, separate, or elevate. Boxes-in-boxes — the #1 template tell — becomes
a measurable violation.

### 6.4 Alignment and optical rules
One grid per page (the archetype's), zero tolerance for near-alignment
(elements within 8 px of a gridline snap to it — Linear's discipline);
optical centering for icons/badges; asymmetry allowed only as a *stated
move* from the archetype's layout grammar (offset heroes, overlap), never
as drift.

### 6.5 Density curves
A page has a planned density curve (the narrative arc made spatial): heroes
sparse → proof denser → CTA sparse again. The planner emits the curve; the
composer's section-padding derivation honors it; the critic checks the
rendered curve matches. Monotone density — every section equally busy — is
the layout signature of generated junk.

---

## 7. Automatic design-language selection

The user picks niche + archetype + mood. The **Language Selector** computes
the rest — no "choose a template" step exists anywhere:

```
select(niche, archetype, mood, brief):
  1. Personality prior   ← niche playbook (Lawyer: formality≥0.8, energy≤0.3;
                           Gym: energy≥0.7; Notion-like warmth for Dentist…)
  2. Archetype constraint ← allowed personality region per DESIGN_DNA rules
  3. Mood interpolation  ← sliders move within the intersection
  4. Anchor weighting    ← nearest reference profiles by personality distance
                           (Auto→porsche·linear, SaaS→stripe·linear,
                            Dentist→notion·apple, Agency→apple·arc, …)
  5. Seed sampling       ← hue/pairing/dialect/grid seeds sampled from the
                           constrained space, rejection-checked against the
                           DNA fingerprint history (uniqueness before render)
  6. Derive              ← ColorSystem, TypeSystem, MotionSystem,
                           LayoutSystem, ChromeSystem (§§3–6)
```

Selection is a constrained optimization with sampling, **not a lookup** —
two dentists with the same archetype land in different regions of the same
valid space (different seeds), while both stay unmistakably
calm/warm/trustworthy. That is the precise mechanism behind "no generic
templates": templates don't exist; only spaces and derivations do.

The brief can override priors with evidence: a criminal-defense firm brief
shifts bolder than family law; an artisan barbershop shifts warmer than a
fade factory. Overrides move *within* the niche's allowed region — the
selector can be persuaded, never broken.

---

## 8. The reference-parity critic

The G4 visual gate (QUALITY.md §2) is upgraded with DIE calibration:

- Screenshots are scored against the **discipline checklist of the
  language's anchor profiles** — an apple-anchored site is checked for scale
  courage and motion weight; a stripe-anchored one for rhythm histograms and
  accent scarcity. The critic grades against the standard the language chose
  for itself.
- New measurable sub-checks feed it: accent pixel-area %, vertical-gap
  histogram, active-sizes count, chrome-to-content ratio, density curve —
  all computed deterministically from screenshots/DOM before the model pass,
  so the vision model spends its judgment on what only judgment can assess
  (does the hero have presence? does the photography grade match?).
- Ship bars by tier: Premium must clear "indistinguishable from a good
  agency"; Signature must survive the blind test against the reference set's
  *category* ("could this plausibly be a site by the studio that did X?").

---

## 9. Placement in the codebase plan

`packages/design-dna` gains a `intelligence/` layer: reference profiles,
personality math, the five derivation systems, and the language selector —
pure functions from `(niche rules, archetype, mood, seeds)` to token
systems, unit-testable without any model call. Model judgment enters only
at brief synthesis (upstream) and critic review (downstream); the middle is
deterministic, which is what makes ten thousand generations a day stay
on-taste.
