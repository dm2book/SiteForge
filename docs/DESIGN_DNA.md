# SiteForge — Design DNA

The Design DNA system is why SiteForge output feels handcrafted and never
generic. It is a curated, versioned body of design knowledge — archetypes,
token generators, a motion language, and a section pattern library — that the
pipeline draws on. Models supply judgment and variation; the DNA supplies
taste, correctness, and craft.

**Core stance:** *Structure from the library, soul from the model.* Competitors
either free-hand code with an LLM (breaks, drifts generic) or skin fixed
templates (feels canned). SiteForge composes from deep, parameterized patterns
under AI art direction — the way an agency reuses hard-won craft across
distinct clients.

---

## 1. The generic-website problem, named

Generic output has recognizable tells. The DNA system exists to make each one
impossible:

| Generic tell | DNA countermeasure |
|---|---|
| Centered hero, gradient blob, two buttons | Hero patterns have 14+ structural variants; archetypes forbid clichés on a denylist |
| Inter/Roboto everywhere | Curated pairing matrix, 40+ pairings, Inter allowed only as body in 3 pairings |
| Purple-gradient-on-dark "AI look" | Palette generators are archetype-bound; the "AI startup" look is a single archetype, not a default |
| Same section order every time | Anti-template shuffle in the planner (PIPELINE §3) |
| Uniform card grids | Density alternation rule + per-archetype layout grammars (asymmetry, overlap, editorial columns) |
| Fade-in-up on everything | Motion dialects with choreography, not one effect |
| "Welcome to X, we are passionate about…" | Copy validators with a filler denylist (PIPELINE §4) |

---

## 2. Design Archetypes

An archetype is a coherent aesthetic worldview — the equivalent of an agency's
creative direction. Each is hand-authored as a rule set:

```yaml
archetype:
  id: editorial-luxury
  name: Editorial Luxury
  worldview: "Confidence through restraint. Reads like a fashion magazine."
  type_rules:        # which pairing families, scale ratios, case usage
    pairings: [serif-display/humanist-sans, didone/grotesque]
    scale: [1.333, 1.414]
    display_case: [none, small-caps-labels]
  color_rules:       # palette construction constraints in OKLCH
    schemes: [near-monochrome+single-accent, warm-paper+ink]
    chroma_ceiling: 0.09          # restraint is enforced numerically
    dark_mode: optional
  layout_grammar:    # what compositions are allowed/encouraged
    grid: [12-col-editorial, offset-2-col]
    density: sparse
    signatures: [oversized-numerals, hairline-rules, generous-whitespace,
                 image-bleed-right]
  motion_dialect: quiet-precision
  section_weights:   # priors over the pattern library
    hero: {editorial-split: 3, full-bleed-image: 2, centered: 0}   # 0 = banned
  denylist: [gradient-blobs, glassmorphism, emoji-in-copy]
```

**Launch set (8):** Editorial Luxury · Brutalist Confidence · Soft Organic ·
Kinetic Tech · Heritage Craft · Clinical Modern · Warm Hospitality · Bold
Retail. Each ships only after passing an internal review: 5 sample
generations across 5 niches must be distinguishable from each other and
attributable to the archetype.

Mood sliders (minimal↔rich, calm↔energetic, classic↔experimental) interpolate
*within* an archetype's allowed ranges — they can never push it outside its
worldview.

---

## 3. Token generators

Generators are code with taste encoded as constraints; the model chooses
within them (PIPELINE §2).

### 3.1 Typography
- **Pairing matrix:** ~40 curated pairings (display + body + optional label
  face), each annotated with archetype affinity, niche affinity, and licensing
  (all self-hostable). Pairings, not individual fonts — pairing is where
  amateur typography fails.
- Modular scale with fluid `clamp()` sizes; per-role specs (display, h1–h4,
  body, lead, label, caption) including tracking and leading — negative
  tracking on large display type, slight positive on labels: the details
  agencies sweat.

### 3.2 Color
- Palettes constructed in **OKLCH** as *relationships*, not hex lists: ink and
  background locked to ≥ 7:1; accent placed at controlled ΔL/ΔC from
  background; hover/active states derived by lightness offsets.
- **Contrast is satisfied by construction** — the generator cannot emit a
  failing palette, so the a11y gate's contrast check is a regression net, not
  a filter.
- Surfaces get tinted neutrals (never pure #FFF/#000 unless the archetype
  demands it) — a small rule that alone removes a major generic tell.

### 3.3 Space & structure
- Base unit + section rhythm scale (e.g. 96/128/160px desktop verticals,
  fluid), container width set per archetype (editorial narrower, retail
  wider), radius/border/shadow language consistent site-wide.

---

## 4. Motion language

Motion is a first-class token set, not decoration. Five **dialects**, each a
parameterized choreography system executed by the in-house runtime (<8 KB,
IntersectionObserver + WAAPI, `prefers-reduced-motion` compliant):

| Dialect | Character | Signature moves |
|---|---|---|
| quiet-precision | Barely-there, expensive-feeling | 250–350ms fades, 8–12px rises, tight 40ms staggers, no bounce |
| kinetic-energy | Fast, confident | clip-path reveals, 60–90ms staggers, magnetic CTAs, marquee accents |
| organic-flow | Soft, continuous | long ease-out curves, gentle parallax (≤6%), blur-to-focus reveals |
| structural-drama | Architectural | split-text headlines, line-mask reveals, scroll-pinned moments (Signature tier) |
| playful-spring | Warm, human | spring easings, slight rotations, hover squish |

Rules enforced by the runtime and the composer:
- Choreography is **per-section-role**: heroes announce, proof sections
  settle, CTAs invite. The same element type animates differently by context.
- Global motion budget: max concurrent animations, no scroll-jacking outside
  Signature `structural-drama`, all effects degrade to opacity-only under
  reduced motion, zero CLS contribution (transforms/opacity only).

---

## 5. Section pattern library

The craft asset. Each pattern is a hand-built, production-grade Astro
component: mobile-first, token-driven, a11y-complete (landmarks, focus order,
ARIA where needed), with declared **variant axes** and **motion hooks**.

```
Pattern: hero/editorial-split
  variant axes:
    media: [image-right, image-left, image-under, no-media-typographic]
    proof: [logos-strip, review-inline, stat, none]
    density: [airy, standard]
  slots: eyebrow, headline, subhead, primary_cta, secondary_cta?, media, proof?
  motion hooks: headline(line-mask | rise), media(reveal | parallax), stagger group
  constraints: headline ≤ 9 words; image aspect 4:5 or 1:1; min tap targets 44px
```

- **Launch target:** ~120 patterns across 16 slot roles (hero, nav, footer,
  social-proof, services, process, team, story, menu/products, gallery,
  pricing, testimonials, FAQ, contact/booking, CTA, article). With variant
  axes and token variation, effective visual space is combinatorially large.
- Every pattern passes the full gate suite *in isolation* before entering the
  library (CI): axe clean, budget-clean, screenshot-approved at 3 breakpoints.
- Patterns are versioned; generated sites pin versions so republishing is
  stable.

---

## 6. Uniqueness fingerprint

Every composed site gets a **DNA fingerprint**: a vector of
`(archetype, pairing, palette-cluster, per-page pattern+variant sequence,
motion dialect, hero structure)` plus a perceptual hash of the rendered
hero screenshot.

- At gate time, distance is computed against recent generations in the same
  `(niche, archetype)` bucket. Below threshold → the repair loop re-rolls the
  most similarity-contributing choices (typically hero variant + palette seed
  + one section swap).
- Fingerprints also feed analytics: which regions of the design space are
  overused (→ planner priors adjusted) and which patterns never get selected
  (→ library pruning).

---

## 7. Curation workflow (how the DNA stays sharp)

- The DNA is content, maintained like code: archetypes, pairings, patterns,
  and dialects live in `packages/design-dna` and `packages/sections` behind
  review. Every addition requires: rationale, archetype affinities, gate-suite
  pass, and 3 rendered exemplars.
- Quarterly **taste audits**: sample generations reviewed against current
  agency-grade references; stale patterns deprecated (kept for pinned sites,
  excluded from new selection).
- Phase-3 learning loop (ARCHITECTURE §8) tunes *selection priors* only —
  never auto-edits patterns. Craft changes stay human-reviewed.
