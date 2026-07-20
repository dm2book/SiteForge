# SiteForge — Quality System

"Premium" is not an adjective at SiteForge; it is a set of enforced,
measurable bars. This document defines the quality tiers users buy, the
automated gates every generation must pass, and the benchmark rubric used to
verify we outperform Lovable, Bolt, Replit AI, v0, and typical freelance
agency work.

---

## 1. Quality tiers

Tiers are simultaneously a pricing lever and a pipeline configuration:

| | **Standard** | **Premium** | **Signature** |
|---|---|---|---|
| Pages | 1–3 | 4–6 | 6–10 (incl. detail pages) |
| Brief | 1 candidate | 1 candidate + critic pass | 3 candidates, critic-selected |
| Design tokens | 1 candidate | 2 candidates, critic-selected | 2 per brief, critic-selected |
| Copy model | Mid-tier, frontier for hero/positioning | Frontier for all voice-defining copy | Frontier throughout + voice critic |
| Motion | Dialect defaults | Choreographed per section | Choreographed + scroll moments (pinning, split-text) |
| Imagery | Stock, palette-graded | Stock, vision-ranked + graded | AI brand imagery option + art-directed stock |
| Visual critic gate | 1 round | 2 rounds | 2 rounds + full-page art-director pass |
| Uniqueness threshold | Base | +25% distance | +50% distance |
| Repair budget | 2 rounds | 3 rounds | 3 rounds + human-escalation queue (optional add-on) |
| Target wall-clock | < 3 min | < 8 min | < 20 min |

All tiers share the same *hard* gates (§2) — Standard is smaller and less
bespoke, never broken or inaccessible. Tier differences are depth and
distinctiveness, not correctness.

---

## 2. Gates

Blocking gates fail the generation into the repair loop; advisory gates score
and log (feeding the learning loop) but don't block.

### G1 — Accessibility (blocking)
- axe-core: zero critical/serious violations on every page.
- Keyboard crawl: every interactive element reachable, visible focus style,
  no traps; skip-link present.
- Contrast: AA verified in the built output (backstop; palettes are correct
  by construction — see DESIGN_DNA §3.2).
- `prefers-reduced-motion` snapshot: all motion degrades to opacity/none.
- Semantic structure: landmarks, one `h1`/page, no heading-level skips,
  meaningful alt text (no "image of", no empty alts on informative images).

### G2 — Performance (blocking)
- Lighthouse CI, mobile emulation, median of 3 runs: **Perf ≥ 95**,
  Best Practices ≥ 95.
- Budgets: LCP < 1.8 s, CLS < 0.05, TBT < 150 ms, JS ≤ 90 KB gz/page,
  CSS ≤ 60 KB gz, hero image ≤ 180 KB (AVIF), fonts ≤ 120 KB total subset.
- All images responsive (`srcset` + explicit dimensions), LQIP present,
  fonts preloaded with `font-display: swap`.

### G3 — SEO (blocking)
- Unique title (≤ 60 ch) + meta description (≤ 155 ch) per page; OG + Twitter
  cards with rendered OG image; canonical URLs; sitemap.xml + robots.txt.
- schema.org JSON-LD valid for the niche (LocalBusiness/Service/FAQPage/
  BreadcrumbList) — validated against schema, not just present.
- Descriptive internal anchor text; no orphan pages.

### G4 — Visual craft (blocking at Premium/Signature, advisory at Standard)
Screenshots of every page at 390 / 768 / 1440 px → frontier vision model as
art director, scoring a structured rubric (1–10 each, findings bound to
section ids so repairs are targeted):
1. Visual hierarchy (is the eye guided?)
2. Spacing rhythm (consistent vertical rhythm, no cramped/orphaned blocks)
3. Typographic craft (scale contrast, line lengths 45–75ch, widows/orphans)
4. Color discipline (accent scarcity, surface consistency)
5. Image integration (grading matches palette, subjects match art direction)
6. **Generic-tell scan** (explicit checklist from DESIGN_DNA §1)

Blocking threshold: no dimension < 6, mean ≥ 7.5 (Premium) / ≥ 8.5 (Signature).

### G5 — Uniqueness (blocking)
DNA fingerprint distance vs. last 90 days of same-`(niche, archetype)`
generations above tier threshold (DESIGN_DNA §6).

### G6 — Conversion readiness (blocking)
Niche playbook assertions, e.g.: primary CTA above the fold and repeated at
page end; phone number tappable on mobile for local-service niches; forms
≤ 5 fields with inline validation; trust signals before first CTA for
high-consideration niches; sticky mobile CTA where the playbook requires it.

### G7 — Content integrity (blocking)
No lorem ipsum; no filler-denylist phrases; no unresolved placeholders except
clearly-marked user-editable business facts; no fabricated *verifiable* claims
(fake review counts, fake certifications — placeholders for these are marked
"needs your real data" in the editor); links resolve; no console errors.

---

## 3. Where gates run

- **Library CI:** every section pattern passes G1/G2-style checks in isolation
  before it may enter the library — the cheapest place to catch problems.
- **Generation time:** full suite per generation (the pipeline's stage 7),
  parallelized; typical gate wall-clock < 40 s excluding visual critic.
- **Republish time:** edits re-run the gates on affected pages. A user edit
  can never silently push a site below the bars (they get a fix-it prompt
  with a one-click auto-repair).
- **Fleet regression:** nightly sampled re-gating of deployed sites catches
  runtime/CDN regressions and validates gate-version upgrades.

---

## 4. Competitive benchmark rubric

Run at every phase milestone (ARCHITECTURE §8) and monthly thereafter.
Protocol: same 6 prompts (2 local-service, 2 hospitality, 2 professional)
submitted to SiteForge (Premium tier), v0, Lovable, Bolt, and Replit AI; plus
2 real freelance-agency sites per niche as reference. Blind review by 3
raters + automated metrics.

| Axis | Measured by |
|---|---|
| Visual distinctiveness | Blind raters: "template or custom?" + pairwise preference |
| Typographic/layout craft | G4 rubric applied uniformly to all outputs |
| Motion quality | Rater score + reduced-motion & CLS compliance |
| Performance | Lighthouse mobile, identical harness |
| Accessibility | axe violation counts + keyboard crawl |
| Conversion readiness | G6 checklist applied uniformly |

**Ship bar:** SiteForge must win ≥ 4 of 6 axes vs. every AI competitor, and
match-or-beat the freelance references on craft + performance. Results are
tracked over time; a lost axis becomes the next sprint's focus.

---

## 5. The learning loop (Phase 3)

Every generation produces training signal at zero marginal cost:
- Gate scores per pattern/archetype/palette combination → selection priors.
- Repair-loop causes → pattern fixes and generator constraint tuning.
- User semantic edits ("calmer", "more contrast") → systematic bias detection
  (if 30% of Kinetic Tech users say "calmer", the dialect's defaults drift hot).
- Opt-in site analytics (managed hosting) → real conversion outcomes per
  section pattern → the only feedback loop competitors structurally lack.

Signals tune *selection and parameters*; human review owns all changes to the
craft library itself (DESIGN_DNA §7).
