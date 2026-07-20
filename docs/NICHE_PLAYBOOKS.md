# SiteForge — Niche Playbooks (Launch Twelve)

The twelve launch niche rule sets consumed by the generation engine
([`GENERATION_ENGINE.md`](GENERATION_ENGINE.md)). Each is summarized here in
its authoring format; the full rule sets live in
`packages/design-dna/niches/` and sync to the `templates` registry.

---

## 0. Structural exclusivity map

Every niche owns a hero family and a signature section no other niche may
use, and belongs to a collision group with tightened cross-niche uniqueness
thresholds (GENERATION_ENGINE §4).

| Niche | Exclusive hero family | Signature section | Collision group |
|---|---|---|---|
| Auto Dealer | `hero/showroom` — full-bleed vehicle stage with spec ticker + inventory search | Inventory showcase w/ filter rail | retail-inventory |
| Barber | `hero/chair-side` — portrait-cut split, next-slot availability inline | Cut gallery + chair/barber picker | local-appointment |
| Restaurant | `hero/table-scene` — atmospheric full-bleed, hours/reservation strip pinned | Menu experience (courses as chapters) | hospitality |
| Real Estate | `hero/listing-first` — search bar over market hero, featured listing card overlap | Listing grid + map hybrid | retail-inventory |
| Gym | `hero/motion-wall` — kinetic typography over training footage, class countdown | Class schedule matrix + coach wall | local-membership |
| Roofing | `hero/before-after` — draggable before/after slider as the hero itself | Storm-damage checklist + financing bar | local-trades |
| Dentist | `hero/calm-clinic` — soft split w/ insurance strip + book-visit card | Smile gallery + first-visit walkthrough | local-appointment |
| Agency | `hero/manifesto` — oversized typographic statement, work peeking below fold | Case-study wall (outcome-led) | studio |
| Ecommerce | `hero/product-stage` — hero product w/ variant swatches, cart affordance | Collection grid + editorial lookbook rows | retail-inventory |
| SaaS | `hero/product-proof` — headline + live product frame (animated UI mock) | Feature narrative w/ integration wall | software |
| Lawyer | `hero/counsel` — restrained editorial split, credentials rail, case-eval card | Results/verdict wall + practice-area index | professional |
| Contractor | `hero/project-reveal` — staged project photo w/ scope tags + estimate card | Project gallery w/ process timeline | local-trades |

Shared utility patterns (FAQ, footer, contact, generic CTA) remain shared;
everything above is enforced-exclusive via `exclusive_patterns`.

---

## 1. Auto Dealer

```yaml
conversion:
  visitor_job: "Find a specific car I can afford, near me, without dealer games."
  decision_mode: comparison
  primary_cta: view-inventory → schedule-test-drive
  secondary_cta: value-my-trade
  mobile_pattern: sticky-call + inventory-search-persistent
  trust_signals: [live-inventory-count, price-transparency-badge, reviews,
                  financing-approval, years/units-sold]
  proof_before_ask: false        # inventory IS the pitch; show it immediately
structure:
  sitemap: {standard: [home, inventory, contact],
            premium: [+financing, +trade-in, +about],
            signature: [+per-vehicle detail pages, +service]}
  nav_model: utility-heavy       # search, saved cars, call — nav works
  required_sections: [inventory-showcase, financing-explainer, trade-in-cta]
  banned_sections: [team-grid, long-founder-story]
layout:
  grammar_bias: {density: high, imagery_ratio: dominant, grid: data-card}
  section_order_rules: [inventory within first two scrolls,
                        financing adjacent to inventory]
  archetype_affinity: {bold-retail: 3, kinetic-tech: 2, clinical-modern: 2,
                       editorial-luxury: 1, soft-organic: 0}
components:
  required: [inventory-grid+filters, vehicle-card w/ payment-est,
             financing-calculator, test-drive-scheduler]
  data_backed: [inventory (feed or manual), hours, locations]
content:
  voice_range: [straight-talking … energetic]; no "luxury for less" clichés
  copy_blocks: [payment-first framing, trade-in-in-3-steps, no-haggle promise]
  specificity_seeds: ["217 vehicles in stock", "approval in 2 minutes"]
  seo: {schema: [AutoDealer, Vehicle, FAQPage], local: critical}
motion:
  dialect_map: {default: kinetic-energy}; intensity_ceiling: high
  choreography_notes: spec-ticker count-ups; card hover = lift+shadow only
differentiation:
  exclusive_patterns: [hero/showroom, inventory-showcase, financing-bar]
```

## 2. Barber

```yaml
conversion:
  visitor_job: "See the work, pick my barber, book a slot in under a minute."
  decision_mode: impulse
  primary_cta: book-now (slot-aware)
  secondary_cta: view-cuts
  mobile_pattern: sticky-book
  trust_signals: [cut-gallery, review-score, walk-in-policy, years-cutting]
  proof_before_ask: true         # the gallery converts, not the copy
structure:
  sitemap: {standard: [one-page anchored], premium: [+gallery, +team],
            signature: [+per-barber pages, +products]}
  nav_model: anchored-onepage
  required_sections: [cut-gallery, services+prices, booking, hours-location]
  banned_sections: [pricing-tables-saas-style, long-about]
layout:
  grammar_bias: {density: medium, imagery_ratio: dominant, grid: masonry-ok}
  section_order_rules: [gallery before prices, booking reachable in one tap]
  archetype_affinity: {brutalist-confidence: 3, heritage-craft: 3,
                       kinetic-tech: 1, clinical-modern: 0}
components:
  required: [booking-widget (slot-aware), price-list, gallery-lightbox,
             barber-picker]
  data_backed: [services/prices, barbers, hours]
content:
  voice_range: [confident … local-warm]; short sentences; zero corporate tone
  copy_blocks: [the-chair-experience, walk-in-vs-book, product-shelf]
  specificity_seeds: ["skin fades since 2011", "walk-ins before 11"]
  seo: {schema: [Barbershop, FAQPage], local: critical}
motion:
  dialect_map: {default: playful-spring, heritage-craft: quiet-precision}
  choreography_notes: gallery items stagger-reveal; price rows slide in tight
differentiation:
  exclusive_patterns: [hero/chair-side, cut-gallery, barber-picker]
```

## 3. Restaurant

```yaml
conversion:
  visitor_job: "Decide if tonight is here: food, vibe, price, table."
  decision_mode: impulse→considered
  primary_cta: reserve-table (or order-online)
  secondary_cta: view-menu
  mobile_pattern: sticky-reserve + tappable-hours
  trust_signals: [food-photography, review-score, press-mentions, chef-story]
  proof_before_ask: true
structure:
  sitemap: {standard: [home, menu, contact], premium: [+about/chef, +private-events],
            signature: [+gallery, +gift-cards, seasonal-menu pages]}
  nav_model: minimal
  required_sections: [menu-experience, hours-location-map, reservation]
  banned_sections: [feature-grids, stat-counters]
layout:
  hero_family: hero/table-scene
  grammar_bias: {density: sparse, imagery_ratio: dominant, grid: editorial}
  section_order_rules: [menu before reservation ask, ambience before menu]
  archetype_affinity: {warm-hospitality: 3, editorial-luxury: 3,
                       heritage-craft: 2, kinetic-tech: 0, clinical-modern: 0}
components:
  required: [menu-renderer (courses/dietary tags), reservation-bridge
             (OpenTable/Resy link-out or form), hours-today-badge, map]
  data_backed: [menu, hours, locations]
content:
  voice_range: [sensory … understated]; describe dishes, never "delicious"
  copy_blocks: [menu-as-chapters, sourcing-line, private-dining pitch]
  specificity_seeds: ["wood-fired at 480°C", "menu changes every Tuesday"]
  seo: {schema: [Restaurant, Menu, FAQPage], local: critical}
motion:
  dialect_map: {default: organic-flow, editorial-luxury: quiet-precision}
  intensity_ceiling: low-medium   # appetite, not spectacle
  choreography_notes: images blur-to-focus; menu chapters cross-fade on scroll
differentiation:
  exclusive_patterns: [hero/table-scene, menu-experience, hours-strip]
```

## 4. Real Estate

```yaml
conversion:
  visitor_job: "Browse real listings now; judge if this agent knows my market."
  decision_mode: comparison + high-trust
  primary_cta: search-listings / book-valuation (seller side)
  secondary_cta: contact-agent
  mobile_pattern: sticky-search
  trust_signals: [sold-count+volume, market-stats, testimonials, local-tenure]
  proof_before_ask: false        # search first; trust builds alongside
structure:
  sitemap: {standard: [home, listings, contact], premium: [+sellers, +about,
            +neighborhoods], signature: [+per-listing pages, +market-report]}
  nav_model: utility-heavy
  required_sections: [listing-grid-map, market-stats, valuation-cta]
  detail_pages: per-listing (gallery, facts, map, inquiry)
layout:
  grammar_bias: {density: high-data/low-chrome, grid: card+map-hybrid}
  section_order_rules: [search above fold, seller funnel separated from buyer]
  archetype_affinity: {editorial-luxury: 3, clinical-modern: 3,
                       bold-retail: 1, playful: 0}
components:
  required: [listing-search+filters, listing-card, map-cluster,
             valuation-lead-form, mortgage-estimator]
  data_backed: [listings (feed or manual), market-stats]
content:
  voice_range: [authoritative-local … warm-professional]
  copy_blocks: [neighborhood-expertise, sold-story, valuation-pitch]
  specificity_seeds: ["43 homes sold in Maplewood", "avg 9 days on market"]
  seo: {schema: [RealEstateAgent, Residence per listing], local: critical}
motion:
  dialect_map: {default: quiet-precision}
  choreography_notes: stat count-ups once; map/list transitions instant —
                      data surfaces never animate decoratively
differentiation:
  exclusive_patterns: [hero/listing-first, listing-grid-map, market-stats-band]
```

## 5. Gym

```yaml
conversion:
  visitor_job: "Will I fit here, what does it cost, when can I start?"
  decision_mode: considered (identity-driven)
  primary_cta: claim-trial / join-now
  secondary_cta: view-schedule
  mobile_pattern: sticky-trial-cta
  trust_signals: [member-transformations, coach-credentials, class-count,
                  community-photos]
  proof_before_ask: true
structure:
  sitemap: {standard: [home, memberships, contact], premium: [+classes,
            +coaches, +schedule], signature: [+per-program pages, +results]}
  nav_model: minimal
  required_sections: [class-schedule, membership-tiers, coach-wall, trial-cta]
layout:
  grammar_bias: {density: high-energy alternating calm, imagery: dominant,
                 grid: broken/diagonal allowed}
  section_order_rules: [identity (who trains here) before pricing]
  archetype_affinity: {kinetic-tech: 3, brutalist-confidence: 3,
                       bold-retail: 2, editorial-luxury: 0}
components:
  required: [schedule-matrix (filter by day/type), membership-cards,
             trial-lead-form, transformation-slider]
  data_backed: [classes, schedule, membership tiers, coaches]
content:
  voice_range: [driven … inclusive]; never intimidating, never "no excuses"
  copy_blocks: [first-week-walkthrough, program-pitch, coach-bio-format]
  specificity_seeds: ["31 classes/week", "avg class size 12"]
  seo: {schema: [ExerciseGym, FAQPage], local: critical}
motion:
  dialect_map: {default: kinetic-energy}; intensity_ceiling: high
  choreography_notes: hero kinetic type; schedule matrix snaps in columns;
                      transformation slider drag-driven
differentiation:
  exclusive_patterns: [hero/motion-wall, schedule-matrix, coach-wall]
```

## 6. Roofing

```yaml
conversion:
  visitor_job: "My roof might be damaged — is this company legit, fast, fair?"
  decision_mode: high-trust (often urgent)
  primary_cta: free-inspection
  secondary_cta: call-now
  mobile_pattern: sticky-call     # urgency niche: phone beats form
  trust_signals: [license+insurance, before/after, warranty, storm-response
                  time, financing, local-address]
  proof_before_ask: true
structure:
  sitemap: {standard: [home, services, contact], premium: [+financing,
            +service-areas, +reviews], signature: [+per-service pages,
            +storm-center, +gallery]}
  nav_model: minimal + phone-in-nav
  required_sections: [before-after, credentials-band, financing-bar,
                      inspection-cta, service-area-map]
  banned_sections: [playful anything, stock-handshake imagery]
layout:
  grammar_bias: {density: medium, imagery: real-work-photos-only}
  section_order_rules: [credentials within first scroll, storm-damage
                        checklist before inspection ask]
  archetype_affinity: {clinical-modern: 3, brutalist-confidence: 2,
                       heritage-craft: 2, playful: 0, editorial-luxury: 0}
components:
  required: [before-after-slider, inspection-scheduler, financing-calculator,
             service-area-map, storm-checklist]
  data_backed: [service areas, licenses, warranty terms]
content:
  voice_range: [plainspoken … reassuring]; zero hype during urgency flows
  copy_blocks: [storm-damage-checklist, insurance-claim-walkthrough,
                warranty-in-plain-english]
  specificity_seeds: ["inspections within 24h", "GAF-certified since 2009"]
  seo: {schema: [RoofingContractor, FAQPage], local: critical}
motion:
  dialect_map: {default: quiet-precision}; intensity_ceiling: low
  choreography_notes: before/after slider is THE moment; everything else calm
differentiation:
  exclusive_patterns: [hero/before-after, storm-checklist, credentials-band]
  collision_group: local-trades (tight threshold vs. Contractor)
```

## 7. Dentist

```yaml
conversion:
  visitor_job: "Find a dentist who won't hurt, judge, or overcharge me."
  decision_mode: high-trust (anxiety-aware)
  primary_cta: book-visit
  secondary_cta: call / insurance-check
  mobile_pattern: sticky-book + tappable-call
  trust_signals: [insurance-logos, smile-gallery, credentials, comfort
                  amenities, reviews]
  proof_before_ask: true
structure:
  sitemap: {standard: [home, services, contact], premium: [+team, +new-
            patients, +insurance], signature: [+per-service pages, +smile-
            gallery, +membership-plan]}
  nav_model: minimal
  required_sections: [insurance-strip, first-visit-walkthrough, smile-gallery,
                      team-intro, book-visit]
  banned_sections: [urgency tactics, countdowns]
layout:
  grammar_bias: {density: sparse-calm, imagery: warm-real-patients,
                 palette-bias: light-surfaces}
  section_order_rules: [comfort/anxiety addressed before procedures listed]
  archetype_affinity: {soft-organic: 3, clinical-modern: 3,
                       warm-hospitality: 2, brutalist-confidence: 0}
components:
  required: [appointment-scheduler, insurance-checker, smile-gallery
             (consented b/a), service-explainer-cards]
  data_backed: [insurances accepted, services, providers, hours]
content:
  voice_range: [warm … clinically-clear]; explain procedures at 8th-grade
                reading level; never shame-based ("neglected teeth")
  copy_blocks: [first-visit-walkthrough, comfort-menu, plain-english-pricing]
  specificity_seeds: ["most cleanings under 50 minutes", "23 insurances"]
  seo: {schema: [Dentist, MedicalProcedure, FAQPage], local: critical}
motion:
  dialect_map: {default: organic-flow}; intensity_ceiling: low
  choreography_notes: soft fades only; zero sudden movement — motion mirrors
                      the reassurance promise
differentiation:
  exclusive_patterns: [hero/calm-clinic, first-visit-walkthrough, smile-gallery]
  collision_group: local-appointment (tight vs. Barber)
```

## 8. Agency

```yaml
conversion:
  visitor_job: "Are these people actually good, and are they my kind of good?"
  decision_mode: considered (taste-judged)
  primary_cta: start-a-project
  secondary_cta: view-work
  mobile_pattern: none            # this audience scrolls; no sticky chrome
  trust_signals: [the-work-itself, client-logos, outcomes/metrics, awards]
  proof_before_ask: true          # radically: the site IS the proof
structure:
  sitemap: {standard: [home, work, contact], premium: [+services, +about],
            signature: [+per-case-study pages, +journal]}
  nav_model: minimal (nav itself is designed)
  required_sections: [manifesto-hero, case-study-wall, capabilities, contact]
  banned_sections: [generic feature grids, stock imagery of any kind]
layout:
  grammar_bias: {density: editorial-extreme, grid: broken/overlap encouraged,
                 whitespace: maximal}
  section_order_rules: [work within 1.5 scrolls; capabilities AFTER work]
  archetype_affinity: {brutalist-confidence: 3, editorial-luxury: 3,
                       kinetic-tech: 2, warm-hospitality: 0}
components:
  required: [case-study-cards (outcome-led), logo-marquee, project-inquiry
             form (qualifying, 4 fields)]
  data_backed: [case studies, clients]
content:
  voice_range: [assured … provocative]; first-person plural; kill all
                agency-speak ("full-service", "passionate about brands")
  copy_blocks: [manifesto (≤ 14 words), case-study = problem→move→number,
                capabilities as verbs]
  specificity_seeds: ["+38% signup rate", "shipped in 6 weeks"]
  seo: {schema: [Organization, CreativeWork per case], local: minor}
motion:
  dialect_map: {default: structural-drama, editorial-luxury: quiet-precision}
  intensity_ceiling: high (the one niche where motion may show off)
  choreography_notes: split-text manifesto; case images scroll-pinned reveals
differentiation:
  exclusive_patterns: [hero/manifesto, case-study-wall, capabilities-verbs]
```

## 9. Ecommerce

```yaml
conversion:
  visitor_job: "Judge the product in seconds; buy without friction."
  decision_mode: impulse→comparison
  primary_cta: shop-now → add-to-cart
  secondary_cta: view-collection
  mobile_pattern: cart-bar
  trust_signals: [product-photography, reviews+count, shipping/returns
                  clarity, secure-checkout marks]
  proof_before_ask: false        # product first, always
structure:
  sitemap: {standard: [home, shop, product-detail, cart], premium:
            [+collections, +about/story], signature: [+lookbook, +journal,
            +size-guides]}
  nav_model: mega (collections) + persistent cart
  required_sections: [product-stage-hero, collection-grid, bestsellers,
                      shipping-returns-band, reviews]
  detail_pages: per-product (gallery, variants, reviews, cross-sell)
layout:
  grammar_bias: {density: product-dense + editorial breathers alternating,
                 grid: strict-product / broken-editorial mix}
  section_order_rules: [product visible pre-scroll; story never before shop]
  archetype_affinity: {bold-retail: 3, editorial-luxury: 3, soft-organic: 2,
                       clinical-modern: 1}
components:
  required: [product-card (quick-add), variant-picker, cart-drawer,
             checkout-bridge (Stripe/Shopify), reviews-block]
  data_backed: [products, variants, inventory, shipping rules]
content:
  voice_range: [brand-defined widest range of any niche — the brief decides]
  copy_blocks: [product-copy = material/use/care, collection-intro,
                shipping-promise-in-one-line]
  specificity_seeds: ["ships in 24h", "430g organic cotton"]
  seo: {schema: [Product, Offer, Review, BreadcrumbList], local: none}
motion:
  dialect_map: {default: playful-spring, editorial-luxury: quiet-precision}
  choreography_notes: add-to-cart micro-confirm; hover = secondary product
                      image; cart drawer springs
differentiation:
  exclusive_patterns: [hero/product-stage, collection-grid, lookbook-rows]
```

## 10. SaaS

```yaml
conversion:
  visitor_job: "Does this solve my problem, and can I trust it with my stack?"
  decision_mode: comparison (multi-visit)
  primary_cta: start-free / book-demo (by price point)
  secondary_cta: see-pricing
  mobile_pattern: none
  trust_signals: [customer-logos, integration-wall, security-badges,
                  uptime/SOC2, named-customer outcomes]
  proof_before_ask: false        # promise → proof → product, tight loop
structure:
  sitemap: {standard: [home, pricing, contact], premium: [+features/solutions,
            +customers], signature: [+per-solution pages, +changelog,
            +comparison pages]}
  nav_model: mega (product/solutions/resources)
  required_sections: [product-proof-hero, feature-narrative, integration-wall,
                      social-proof, pricing, final-cta]
  banned_sections: [gradient-blob defaults (archetype rule reinforced)]
layout:
  grammar_bias: {density: medium, grid: alternating feature-split,
                 product-ui: always framed, never floating}
  section_order_rules: [one outcome-claim hero (no feature list in hero);
                        pricing self-serve visible, never "contact us" only
                        unless enterprise-flagged]
  archetype_affinity: {kinetic-tech: 3, clinical-modern: 3,
                       brutalist-confidence: 2, warm-hospitality: 0}
components:
  required: [animated-product-frame (UI mock from tokens), pricing-table w/
             toggle, integration-wall, logo-marquee, comparison-table]
  data_backed: [plans, integrations, customer logos]
content:
  voice_range: [clear … sharp]; verbs over nouns; ban "supercharge",
                "seamless", "all-in-one", "10x"
  copy_blocks: [outcome-headline formula, feature = capability→so-that,
                objection-preempt row, pricing-FAQ]
  specificity_seeds: ["syncs in <400ms", "SOC 2 Type II"]
  seo: {schema: [SoftwareApplication, Offer, FAQPage], local: none}
motion:
  dialect_map: {default: kinetic-energy, clinical-modern: quiet-precision}
  choreography_notes: product frame animates its OWN UI (cursor, data fills)
                      — the site's centerpiece animation budget lives here
differentiation:
  exclusive_patterns: [hero/product-proof, integration-wall, animated-frame]
```

## 11. Lawyer

```yaml
conversion:
  visitor_job: "I have a serious problem; who here is credible and will
                actually respond?"
  decision_mode: high-trust (stress-aware)
  primary_cta: free-case-evaluation
  secondary_cta: call-now
  mobile_pattern: sticky-call
  trust_signals: [results/verdicts, credentials/bar, years, named attorneys,
                  press, no-fee-unless-we-win (where applicable)]
  proof_before_ask: true
structure:
  sitemap: {standard: [home, practice-areas, contact], premium: [+attorneys,
            +results, +about], signature: [+per-practice-area pages,
            +case-results, +resources/FAQ]}
  nav_model: minimal + phone-in-nav
  required_sections: [counsel-hero, results-wall, practice-area-index,
                      attorney-profiles, case-eval-form]
  banned_sections: [countdowns, playful anything, stock gavel/scales imagery]
layout:
  grammar_bias: {density: sparse-gravitas, whitespace: generous,
                 palette-bias: restrained, imagery: real attorneys/office}
  section_order_rules: [results before contact ask; practice areas as index,
                        never feature-grid cards with icons]
  archetype_affinity: {editorial-luxury: 3, clinical-modern: 2,
                       heritage-craft: 2, kinetic-tech: 0, playful: 0}
components:
  required: [case-eval-form (confidential-flagged, 4 fields), results-wall,
             practice-area-index, attorney-cards]
  data_backed: [practice areas, attorneys, results (marked verify-me)]
content:
  voice_range: [measured … resolute]; second person, plain English; every
                results claim slot marked "needs your real data" (G7 gate)
  copy_blocks: [case-eval promise (response time), practice-area page =
                situation→what-we-do→what-to-expect, attorney bio format]
  specificity_seeds: ["response within one business hour", "$4.2M verdict —
                      placeholder, replace with real result"]
  seo: {schema: [LegalService, Attorney, FAQPage], local: critical}
motion:
  dialect_map: {default: quiet-precision}; intensity_ceiling: lowest
  choreography_notes: barely-there fades; results numbers rise once, subtly —
                      restraint IS the credibility signal
differentiation:
  exclusive_patterns: [hero/counsel, results-wall, practice-area-index]
```

## 12. Contractor

```yaml
conversion:
  visitor_job: "Find someone licensed who shows up, quotes fair, does clean
                work — and prove it with photos."
  decision_mode: high-trust + comparison
  primary_cta: request-estimate
  secondary_cta: view-projects / call
  mobile_pattern: sticky-call
  trust_signals: [project-photos, license+insurance, process-clarity,
                  reviews, service-area, warranty]
  proof_before_ask: true
structure:
  sitemap: {standard: [home, services, contact], premium: [+projects,
            +service-areas, +reviews], signature: [+per-service pages,
            +per-project case pages, +financing]}
  nav_model: minimal + phone-in-nav
  required_sections: [project-gallery, process-timeline, credentials-strip,
                      estimate-form, service-area]
layout:
  grammar_bias: {density: medium, imagery: real-project-photos-only,
                 grid: project-card}
  section_order_rules: [projects within first scroll; process timeline before
                        estimate ask (differentiates from Roofing's checklist
                        urgency flow)]
  archetype_affinity: {heritage-craft: 3, clinical-modern: 2,
                       brutalist-confidence: 2, editorial-luxury: 1}
components:
  required: [project-gallery (filterable by type), estimate-form (scope
             picker), process-timeline, credentials-strip]
  data_backed: [services, projects, licenses, service areas]
content:
  voice_range: [craftsman-proud … methodical]; process language ("we do X,
                then Y") over adjectives
  copy_blocks: [process-in-5-steps, project-story = scope→challenge→result,
                estimate-what-happens-next]
  specificity_seeds: ["most kitchens: 3 weeks", "licensed GC #482913 —
                      placeholder"]
  seo: {schema: [GeneralContractor, Service, FAQPage], local: critical}
motion:
  dialect_map: {default: quiet-precision, heritage-craft: organic-flow}
  intensity_ceiling: low
  choreography_notes: project photos reveal with clip-wipe (the craft moment);
                      timeline draws its connector on scroll
differentiation:
  exclusive_patterns: [hero/project-reveal, process-timeline, project-gallery]
  collision_group: local-trades (tight threshold vs. Roofing — Roofing leads
                   with urgency/before-after; Contractor leads with
                   portfolio/process. The hero families, signature sections,
                   and section-order rules encode that difference.)
```

---

## 13. Cross-niche guarantees

- **No shared hero families, no shared signature sections** — enforced by
  `exclusive_patterns` at compose time, verified by the collision gate.
- **Structural spread by design:** four nav models, five mobile CTA patterns,
  four decision-mode narrative arcs, and five motion dialects are distributed
  across the twelve so that even same-archetype generations in different
  niches share almost no skeleton.
- **Same-group tightening:** retail-inventory (Auto/Real-Estate/Ecommerce),
  local-appointment (Barber/Dentist), and local-trades (Roofing/Contractor)
  carry stricter cross-niche fingerprint thresholds because their data-heavy
  or trust-heavy shapes are the likeliest to converge.
- Every playbook change re-runs the distinguishability review (5 archetypes ×
  5 generations must be attributable to their niche blind — DESIGN_DNA §7).
