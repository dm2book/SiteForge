# SiteForge — Generation Engine

The generation engine is the runtime that executes the pipeline
([`PIPELINE.md`](PIPELINE.md)) against the Design DNA
([`DESIGN_DNA.md`](DESIGN_DNA.md)) under **niche rule sets**. This document
specifies the engine's architecture: what it generates, how niche rules drive
every decision, and how layout reuse is made structurally impossible.

Companion document: [`NICHE_PLAYBOOKS.md`](NICHE_PLAYBOOKS.md) — the twelve
launch niche rule sets (Auto Dealer, Barber, Restaurant, Real Estate, Gym,
Roofing, Dentist, Agency, Ecommerce, SaaS, Lawyer, Contractor).

---

## 1. The six outputs

Every generation produces six coordinated artifacts. Each has one owning
engine subsystem and one section of the niche rule set that governs it:

| Output | Owning subsystem | Governed by rule-set section |
|---|---|---|
| **Structure** | IA Planner (pipeline stage 3) | `structure` — sitemap, page depth, nav model |
| **Layout** | Layout Composer (stage 3 + 5) | `layout` — grammar, signature moves, bans |
| **Content** | Content Generator (stage 4) | `content` — voice range, copy blocks, denylist |
| **Components** | Component Resolver (stage 5) | `components` — niche component manifest |
| **Animations** | Choreographer (stage 5) | `motion.choreography` — per-section-role moves |
| **Motion system** | Motion Compiler (stage 2 + 5) | `motion.dialect` — dialect + parameter ranges |

The engine never treats these independently: a single **GenerationContext**
(brief + tokens + niche rules + archetype rules) flows through all six, which
is why the output feels like one designed object instead of assembled parts.

---

## 2. Niche rule sets

A niche rule set is a versioned, curated module (content, not code — lives in
`packages/design-dna/niches/`, synced to the `templates` registry with
`kind: 'niche'`). Schema:

```yaml
niche_ruleset:
  id: <niche>
  version: <int>

  conversion:            # WHY the site exists
    visitor_job:         # the visitor's actual task, in one sentence
    decision_mode:       # impulse | considered | high-trust | comparison
    primary_cta:         # the one action everything drives toward
    secondary_cta:
    mobile_pattern:      # sticky-call | sticky-book | cart-bar | none
    trust_signals:       # ordered by importance for this niche
    proof_before_ask:    # bool — must trust precede first CTA?

  structure:             # WHAT pages exist
    sitemap:             # per tier: standard | premium | signature
    nav_model:           # minimal | mega | anchored-onepage | utility-heavy
    required_sections:   # slots that MUST appear
    banned_sections:     # slots that must NOT appear
    detail_pages:        # e.g. per-vehicle, per-listing, per-practice-area

  layout:                # HOW pages are composed
    hero_family:         # the niche's exclusive hero family (see §4)
    signature_section:   # the niche-defining section pattern
    grammar_bias:        # density, grid style, imagery ratio
    section_order_rules: # narrative-arc constraints specific to the niche
    archetype_affinity:  # which archetypes fit (0 = banned)

  components:            # WHAT interactive parts exist
    required:            # niche-specific components (islands)
    optional:
    data_backed:         # which read from business_facts / feeds

  content:               # WHAT the site says
    voice_range:         # allowed tone spectrum
    copy_blocks:         # niche-specific copy structures
    specificity_seeds:   # the concrete details the model must invent/ask for
    denylist_extra:      # niche-specific filler phrases to ban
    faq_seeds:
    seo:                 # schema.org types, title patterns, local-SEO needs

  motion:
    dialect_map:         # archetype → dialect override for this niche
    intensity_ceiling:   # some niches must stay calm (lawyer ≠ gym)
    choreography_notes:  # per-section-role guidance

  differentiation:       # HOW this niche can never look like another
    exclusive_patterns:  # pattern ids reserved for this niche
    collision_group:     # cross-niche similarity budget (see §4)
```

**Merge semantics** (deterministic, applied by the engine before stage 1):

```
GenerationContext.rules =
  base_rules                       # platform-wide invariants (a11y, gates…)
  ⊕ niche_ruleset                  # constrains WHAT and WHY
  ⊕ archetype_rules                # styles HOW (type, color, layout grammar)
  ⊕ mood_sliders                   # interpolates within what's still allowed
```

Conflicts resolve by precedence: **niche bans beat archetype preferences;
archetype bans beat niche preferences; base rules beat everything.** A niche's
`archetype_affinity: 0` entries remove those archetypes from the wizard for
that niche — invalid combinations are unreachable, not error-handled.

---

## 3. Engine subsystems

### 3.1 IA Planner → Structure
Consumes `structure` rules + brief. Produces the sitemap and per-page section
sequences. Niche rules make this *opinionated*: an auto dealer plans
inventory + per-vehicle detail pages; a barber plans a one-page anchored site
with a booking flow; a SaaS plans feature/pricing/docs surfaces. The
narrative-arc validator (PIPELINE §3) runs with the niche's own
`section_order_rules` appended — e.g. Restaurant enforces "menu before
reservation ask", Lawyer enforces "results before contact".

### 3.2 Layout Composer → Layout
Selects pattern + variant for every planned slot, constrained by:
1. the niche's `hero_family` and `signature_section` (mandatory),
2. `exclusive_patterns` (only this niche may use them),
3. the archetype's layout grammar,
4. the anti-template shuffle (must deviate from the niche's statistically
   most common sequence in ≥ 2 meaningful ways),
5. the cross-niche collision check (§4).

### 3.3 Content Generator → Content
Copy per section under the brief's voice contract *and* the niche's
`voice_range` (their intersection — a playful archetype writing for a law
firm stays inside the lawyer's gravitas floor). `copy_blocks` give the model
niche-native structures (a roofing "storm damage checklist", a SaaS
"integration wall", a dentist "first-visit walkthrough") so content is
generated *as the niche's genre*, not as generic marketing prose with nouns
swapped. `specificity_seeds` force concrete invented-or-asked details
("financing from $199/mo", "walk-ins before 11am") — the #1 handcrafted tell.

### 3.4 Component Resolver → Components
Instantiates the niche's `required`/`optional` components from the component
library (Astro islands — the only hydrated code on the page). Components are
niche-aware but token-styled, so a booking widget looks native to every
design system. `data_backed` components bind to `projects.business_facts`
(menu items, inventory, class schedules) with clearly-editable placeholder
data when facts are missing.

### 3.5 Motion Compiler + Choreographer → Motion system + Animations
The Motion Compiler (stage 2) resolves the dialect: archetype default,
overridden by the niche's `dialect_map`, clamped by `intensity_ceiling`.
It emits the motion token set (easings, durations, staggers, distances).
The Choreographer (stage 5) then assigns concrete animations per section
instance using per-role rules + `choreography_notes` — heroes announce,
proof settles, CTAs invite — and builds the page's entrance timeline and
scroll-trigger map. Output is data consumed by the <8 KB runtime; reduced
motion and CLS-zero guarantees are runtime properties, not per-site hopes.

---

## 4. Layout non-reuse: enforced, not encouraged

"Do not reuse the same layouts" is implemented as three mechanisms:

**1. Exclusive hero families.** The hero is a site's fingerprint. Each niche
owns a hero *family* (a structural approach with internal variants) that no
other niche may select. Twelve niches → twelve structurally distinct
above-the-fold experiences by construction (see the assignment table in
`NICHE_PLAYBOOKS.md` §0).

**2. Signature sections + exclusive patterns.** Each niche's
`signature_section` is a pattern built *for* that niche (an inventory
showcase, a chair-side gallery, a verdict/results wall) and listed in
`exclusive_patterns`. Shared utility patterns (FAQ, footer, generic CTA)
remain shared — but every page contains niche-exclusive structure, so no two
niches can produce the same skeleton.

**3. Cross-niche collision gate.** The DNA fingerprint (DESIGN_DNA §6)
already blocks near-duplicates within a `(niche, archetype)` bucket. The
engine adds a **collision-group check across niches**: niches in the same
`collision_group` (e.g. local-service trades: Roofing/Contractor) get a
*tighter* cross-niche distance threshold, because they're the pairs most at
risk of converging. A generation that fingerprints too close to another
niche's recent output re-rolls its layout choices in the repair loop.

Statistical backstop: the planner tracks per-niche pattern-sequence
frequencies; any sequence exceeding a usage ceiling is down-weighted until
the distribution flattens. Popular ≠ default.

---

## 5. Extending to new niches

Adding niche #13 is a content contribution, not an engineering project:
author the rule set, build/assign its exclusive hero family + signature
section (gate-suite CI applies), define collision groups, add taxonomy
entries + playbook copy structures, run the 5-archetype × 5-generation
distinguishability review (DESIGN_DNA §7). The engine code does not change —
this is the litmus test that niche knowledge stays in data.
