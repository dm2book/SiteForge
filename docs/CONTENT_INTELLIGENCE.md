# SiteForge — Content Intelligence Engine

The Content Intelligence Engine (CIE) is the counterpart to the Design
Intelligence Engine: it makes generated *words* read like a senior
copywriter's work the way the DIE makes pixels read like a senior designer's.
It owns pipeline stage 4 and the copy-touching parts of stages 1 and 8.

Copy is the fastest generic tell there is — a visitor forgives a familiar
layout long before they forgive "Welcome to our website, where passion meets
excellence." The CIE exists so that sentence is unrepresentable.

---

## 1. The Voice System

Every generation carries a **VoiceContract**, synthesized in stage 1 and
enforced through every copy operation:

```
VoiceContract {
  adjectives: [3],            // what the voice IS      (e.g. dry, precise, warm)
  anti_adjectives: [3],       // what it must NEVER be  (e.g. salesy, cute, vague)
  register: {                 // measurable dials
    person: we | I | impersonal,
    reading_level: grade 6..12 target,
    sentence_rhythm: short | mixed | long-form,
    contraction_policy: always | natural | never,
    humor_ceiling: none | dry | warm
  },
  exemplars: [                // the contract made concrete
    {say: "...", never: "..."} × 5   // paired rewrites, generated per brief
  ],
  lexicon: {
    owned_words: [...],       // words this brand leans on
    banned_words: [...]       // niche denylist + brief-specific bans
  }
}
```

The paired exemplars are the load-bearing part: models follow demonstrated
contrast far more reliably than adjective lists. Every downstream copy prompt
includes them; the voice critic scores drift against them.

**Voice = brief ∩ niche.** The niche playbook's `voice_range` clips the
brief's ambitions (GENERATION_ENGINE §3.3): a playful archetype writing for
a lawyer keeps its rhythm but stays inside the gravitas floor.

---

## 2. Copy frameworks (genre, not filler)

Sections are written *as their genre*, using the niche playbook's
`copy_blocks` as structural contracts — the copy equivalent of section
patterns:

- Every framework specifies **slots with rules**, e.g. the outcome-headline
  formula (SaaS): `[audience's verb-phrase outcome] + [without the accepted
  cost]`, ≤ 9 words, no product name in the H1.
- Case-study framework (Agency): `problem (2 sentences, client's words) →
  the move (1 decision, named) → the number (one metric, real or marked)`.
- Walkthrough framework (Dentist/Contractor): numbered steps, each step =
  what happens + how long + what you'll feel/see. Concreteness is the format.
- Menu/inventory/list frameworks: item copy rules (Restaurant: ingredients
  and technique, never adjectives of praise; Auto: payment-first line).

Frameworks are versioned content in `packages/design-dna/copy/`, curated
like patterns (DESIGN_DNA §7), and A/B-improvable in Phase 3 via the
learning loop.

---

## 3. The Specificity Engine

Vagueness is the copy signature of generated junk. The engine enforces
concreteness mechanically:

1. **Fact harvesting** — everything the user gave (`business_facts`) is
   inventoried into typed facts (numbers, names, dates, credentials, hours).
2. **Fact placement** — the planner requires each page to surface a minimum
   fact density: every hero, proof section, and CTA block must contain ≥ 1
   typed fact or marked placeholder. Facts beat adjectives wherever both fit.
3. **Plausible-placeholder synthesis** — where facts are missing, the model
   invents *specific, clearly-editable* placeholders in the niche's register
   ("roasted in 12 kg batches every Tuesday", "licensed GC #482913 —
   placeholder"). Placeholders carry machine-readable markers so:
   - the editor surfaces them as a "replace with your real details" checklist,
   - the G7 gate blocks *verifiable-claim* placeholders (review counts,
     certifications, verdict amounts) from publishing unreplaced,
   - analytics track replacement rates (a placeholder nobody replaces is a
     bad placeholder — learning-loop signal).
4. **Superlative tax** — each superlative ("best", "premier", "top-rated")
   must be adjacent to a supporting fact or it is rewritten out. Enforced by
   validator, not vibes.

---

## 4. Multi-pass generation

Stage 4 is not one prompt; it is a newsroom:

```
Pass 1  DRAFT      per-section copy, framework + VoiceContract in context,
                   whole-page outline visible (no section written blind)
Pass 2  COHESION   one pass over each full page: kill repeated openers,
                   vary sentence rhythm across sections, ensure the page
                   reads as one argument (headline promise → proof → ask)
Pass 3  VOICE CRITIC scores each section against the exemplars; flagged
                   sections rewritten with the critic's note in context
Pass 4  MECHANICS  deterministic: denylist, superlative tax, headline length,
                   reading-level measurement, duplicate-phrase detection
                   across pages, typographic punctuation (real quotes,
                   en/em dashes, non-breaking spaces before units)
```

Pass 2 is what competitors skip and why their pages read like ten unrelated
paragraphs. Pass 4 being deterministic keeps the gate fast and the model
honest.

Tier mapping (QUALITY §1): Standard runs passes 1+4 with spot-checks;
Premium adds full pass 2+3; Signature adds a second critic round and
headline candidate fan-out (5 options scored, best chosen) for hero and
positioning lines.

---

## 5. SEO intelligence

SEO is generated as a *layer of the content*, not a bolt-on:

- **Search-intent mapping** — per page, the niche playbook supplies target
  intents (e.g. Roofing: "roof repair near me", "hail damage insurance
  claim"); headings and body copy are written to answer them naturally.
  Keyword stuffing is a G3 failure, not a technique.
- **Structured data as content contract** — the schema.org emitter reads the
  same typed facts as the Specificity Engine, so JSON-LD never disagrees
  with visible copy (a real Google penalty class competitors generate
  constantly).
- **Local SEO kit** for local niches: NAP consistency (one source of truth
  from `business_facts`), city/service-area copy blocks that read as
  editorial rather than doorway-page sludge, GBP-ready descriptions.
- **Answer-shaped FAQs** — from playbook `faq_seeds`, written to be
  featured-snippet extractable (question as H3, 40–55 word direct answer
  first, detail after) and emitted as FAQPage JSON-LD.
- Titles/metas follow per-niche patterns with fact injection ("Roof Repair
  in {city} — Inspections Within 24h | {name}"), length-validated.

---

## 6. Content editing (post-generation)

Semantic edits flow through the same machinery — "make the hero more
confident" re-runs pass 1 for that section with a modified VoiceContract
delta, then passes 2–4 for the affected page. Users editing raw text in the
Studio get live mechanics-pass feedback (denylist, length, reading level) as
gentle suggestions, and their manual edits are *never* auto-rewritten —
user words are sovereign; the gates only warn (except G7 legal/verifiable
claims, which still block publish).

User edit patterns are first-class learning-loop signal: systematically
edited-away phrasings get added to denylists; frameworks whose output
survives untouched get weight.

---

## 7. Placement in the codebase plan

`packages/content-intelligence`: VoiceContract synthesis + schemas, copy
frameworks registry, specificity engine (typed facts, placeholder markers,
validators), the four-pass orchestration, SEO emitters. Deterministic parts
(pass 4, schema emitters, validators) are pure and unit-tested; model calls
are behind the same routed `ai_accounts` layer as everything else.
