# SiteForge — 3D Engine

The 3D Engine lets generated sites ship interactive 3D and WebGL experiences
— vehicle viewers, space walkthroughs, dish presentations — **without
surrendering the platform's core guarantees** (Lighthouse ≥ 95, zero CLS,
accessibility, reduced-motion compliance).

Governing law, stated first because everything follows from it:

> **3D is content, never decoration.** A 3D experience ships only when it
> communicates something a photograph cannot — shape, space, configuration,
> or material. Floating geometric shapes behind a hero headline are a
> branded generic tell (G4 denylist), not a feature.

---

## 1. Position in the architecture

The 3D Engine is not a parallel renderer; it is three additions to existing
subsystems:

| Addition | Extends | Role |
|---|---|---|
| **3D Value Judge** | IA Planner (stage 3) | Decides *whether* and *where* 3D earns its place |
| **Scene pattern library** | Section library (`packages/sections`) | Hand-built, token-driven 3D scenes as section patterns |
| **WebGL runtime layer** | Output stack + motion runtime | Lazy-loaded islands: Three.js / R3F scenes, GSAP-driven choreography |
| **3D asset pipeline** | Asset Resolution (stage 6) | Models, compression, capability-laddered delivery |
| **G8 gate: 3D quality** | Quality gates (stage 7) | FPS, payload, fallback, input, and value audits |

Everything else — tokens, gates, composition, the Studio — treats a 3D scene
as just another section pattern with unusual powers and unusual budgets.

---

## 2. The 3D Value Judge

"The AI should automatically determine when 3D adds value" is a *scored
decision*, made by the planner using a rubric, never a default:

```
ValueJudgment(slot, brief, niche, tier, assets) → { verdict, score, rationale }

Score =  communicative_value      // does 3D show shape/space/config/material
                                  // that flat media cannot?           (0–4)
       + engagement_fit           // does the visitor's job benefit from
                                  // exploration? (comparison/considered
                                  // decision modes score high; urgency
                                  // modes score ZERO — a storm-damaged
                                  // roof owner needs a phone number,
                                  // not a spinning roof)              (0–3)
       + asset_feasibility        // do we have / can we get a quality
                                  // model? (user upload, library,
                                  // procedural, AI-gen)               (0–3)

Ship threshold: score ≥ 7 AND communicative_value ≥ 3, tier ≥ Premium.
```

Hard vetoes (any one kills 3D regardless of score):
- **Decoration veto** — the scene's subject is not the business's actual
  product/space/work. Abstract blobs, particle backgrounds, spinning logos:
  auto-vetoed by category.
- **Performance veto** — the page's conversion role can't absorb the budget
  (checkout paths, contact pages, and legal/urgency flows never get 3D).
- **Quality-floor veto** — no asset above the quality floor exists
  (a bad 3D model is worse than no 3D model; a 40k-poly turntable burger
  with smeared textures actively destroys the premium promise).
- **Niche ceiling** — the playbook's `3d` block caps what's allowed
  (Lawyer: none, ever; Dentist: anatomy explainers only, Signature tier).

The verdict + rationale is persisted in the SitePlan artifact — auditable,
and learning-loop feedstock (which judgments correlated with engagement).

---

## 3. Runtime architecture

### 3.1 Two power classes

**Class A — WebGL effects** (shader-level, no scene graph):
image treatments (hover distortion, duotone transitions), premium canvas
moments (fluid gradients bound to palette tokens, product-shot lighting
sweeps). Implemented in a tiny in-house shader runtime (~12 KB, raw WebGL,
no Three.js). Allowed at Premium tier where the design language's
`materiality` is high — still subject to the decoration veto (effects apply
*to content imagery*, not to empty space).

**Class B — 3D scenes** (full scene graph):
Three.js islands; React Three Fiber when the scene has real interaction
state (configurators, walkthrough UI); GSAP + ScrollTrigger for camera
choreography and scroll-bound timelines. Signature-tier feature (Premium for
Auto Dealer and Real Estate, where 3D is closest to the visitor's job).

### 3.2 Loading discipline (how guarantees survive)

3D never participates in initial page load:

```
Initial paint   → poster frame (art-directed still render of the scene,
                  AVIF, counts as the LCP image — LCP stays < 1.8 s)
Viewport near   → runtime chunk prefetch (idle, low priority)
Intent signal   → hydrate island, fade poster → live scene
                  (scroll-into-view for showcase scenes; explicit
                  tap/click for heavy configurators on mobile)
```

- Budgets are **per-page carve-outs, not global raises**: a 3D-enabled page
  gets a `3d-budget` (runtime ≤ 180 KB gz incl. Three.js core via shared
  chunk; scene assets ≤ 3 MB streamed) that exists *in addition to* the
  standard 90 KB page budget, which still applies to everything non-3D.
  Pages without a shipped scene contain zero 3D bytes — no shared runtime
  tax across the site.
- One scene live at a time; scenes dispose fully on exit (WebGL context,
  geometries, textures) — long-session memory is a G8 check.
- GSAP ships only inside Class-B islands (it never replaces the 8 KB motion
  runtime for normal sections); licensing is platform-level (we hold the
  commercial license; exported sites embed our paid-seat build under its
  redistribution terms — a checked item in the export packager).

### 3.3 Capability ladder

Device tier detected at hydrate time (GPU heuristic + `deviceMemory` +
thermal/battery signals where available):

| Tier | Gets |
|---|---|
| high | Full scene: PBR materials, env lighting, shadows, post minimal |
| mid | Reduced: baked lighting, capped DPR (1.5), no post |
| low / no-WebGL / save-data | **Cinematic fallback**: pre-rendered video loop or pan sequence of the same scene (generated at build time), or the poster + gallery |
| `prefers-reduced-motion` | Poster + user-initiated static orbit (drag steps, no autoplay motion) |

The fallback chain is *generated content, not an apology*: build-time
renders of the actual scene mean every visitor sees the subject beautifully;
only interactivity is progressive.

### 3.4 Input & accessibility contract
Every scene pattern implements: pointer + touch + keyboard control (arrow
orbit, +/- zoom, Esc exits), visible focus states, a text alternative block
(spec list for a vehicle, floor-plan facts for a house — also what SEO and
screen readers consume), scroll-hijack ban (camera fly-throughs bind to
normal scroll position via ScrollTrigger; the page always scrolls), and
zero pointer-lock. G8 verifies each.

---

## 4. Scene pattern library

Scenes are section patterns (`packages/scenes`) with the same discipline as
2D patterns: hand-built, variant axes, token-driven, gate-tested. **Tokens
reach into the scene**: lighting temperature follows palette warmth,
environment/backdrop uses surface tokens, UI overlays use the type system,
camera easing uses the motion dialect's curves — a Porsche-anchored dealer
scene lights differently than a bold-retail one, automatically.

Launch scenes (niche-exclusive, extending the §0 exclusivity map):

| Niche | Scene patterns | The job it does |
|---|---|---|
| **Auto Dealer** | `scene/vehicle-viewer` — orbit/zoom a configurable model (paint via palette-safe swatches, trim, wheels), hotspots with spec callouts. `scene/showroom-flythrough` — scroll-bound camera path through a staged showroom of 3–5 featured vehicles, each stop a live inventory card. | Configuration + comparison — the two things dealer photography can't do |
| **Real Estate** | `scene/house-walkthrough` — room-to-room camera path (scroll-bound or waypoint-clicked) through a Matterport-style capture or staged model; floor-plan mini-map synced to camera. `scene/area-map` — extruded 3D neighborhood map: listings, schools, transit as interactive layers. | Spatial judgment — "does this layout work for us" — before a showing |
| **Restaurant** | `scene/dish-presentation` — photogrammetry-grade signature-dish model, slow orbit on scroll, ingredient hotspots; Signature tier only, max 1–3 hero dishes (the menu stays photography). | Appetite + craft signaling for the dishes that define the house |
| **Ecommerce** | `scene/product-360` — orbit + material zoom for products where form/material is the value (furniture, footwear, jewelry). AR handoff (`model-viewer` USDZ/GLB export) on capable devices. | "Can I judge it without holding it" |
| **Gym** | `scene/facility-flythrough` — scroll-bound tour of zones, class-schedule cards anchored to spaces. | "Will I fit here" made spatial |
| **SaaS / Agency** | Class-A effects only by default (product frames stay 2D-animated per DESIGN_INTELLIGENCE; agencies may earn `scene/work-gallery` at Signature when the work itself is 3D). | Restraint where 3D doesn't inform |
| **Barber / Roofing / Dentist / Lawyer / Contractor** | No Class-B scenes at launch (urgency/trust niches; Contractor may earn walkthroughs for finished projects later via playbook update). | The veto system working as intended |

Each scene declares its asset contract (what model/capture it needs, quality
floor, fallback renders) and its variant axes, exactly like 2D patterns.

---

## 5. 3D asset pipeline (stage 6 extension)

**Sources**, in preference order per scene contract:
1. **User-provided** — dealer inventory feeds with OEM 3D/360 assets;
   Matterport/photo-capture links for real estate; product scans for
   ecommerce. Ingested, validated against the quality floor, normalized.
2. **Licensed model library** — curated staging assets (showroom
   environments, neighborhood base tiles, generic-but-good furnishings).
   Never used to fake the *subject* (a stock sedan standing in for the
   user's actual car fails the integrity gate G7 — staging yes, subject no).
3. **Procedural** — area maps built from map-data extrusion; showroom
   environments assembled from staging kits under token lighting.
4. **AI generation** (Signature, flagged) — image-to-3D for hero dishes and
   products where no scan exists; always marked provenance-in-metadata,
   always behind the quality floor + human-visible "approve this model"
   step in the Studio checklist.

**Processing**: glTF/GLB canonical format; Draco + Meshopt compression; KTX2
(Basis) textures with per-tier mip chains; poly/texture budgets per scene
contract (e.g. vehicle ≤ 150k tris, dish ≤ 60k); baked lighting variants for
the mid tier; build-time poster renders (per breakpoint) and fallback video
loops rendered in the sandboxed builder (GPU-enabled worker pool — the one
place the fleet needs GPUs, scaled separately from CPU build workers).

---

## 6. G8 — the 3D gate

Added to the gate suite (QUALITY.md), blocking on any 3D-enabled page:

1. **Frame budget** — ≥ 55 fps sustained on a mid-tier reference profile
   (throttled headless GPU run), zero long-task > 120 ms during hydrate,
   input latency < 50 ms.
2. **Payload** — 3d-budget respected; poster is valid LCP; non-3D pages
   contain zero 3D bytes.
3. **Degradation** — all four ladder tiers render correctly (automated
   screenshot per tier); reduced-motion variant verified; battery/save-data
   honored.
4. **Input & a11y** — keyboard contract, focus, text alternative present
   and factually consistent with scene hotspots (shares typed facts with
   the Specificity Engine).
5. **Memory** — context + heap fully released on scene exit; no growth
   across a 5-scene navigation loop.
6. **Value audit** — the visual critic reviews the scene against its
   ValueJudgment rationale: does the shipped scene actually deliver the
   communicative value that justified it? A vehicle viewer whose materials
   read plastic, or a walkthrough that disorients, gets repaired or pulled
   (the fallback chain means pulling 3D never leaves a hole — the poster
   sequence remains).

---

## 7. Studio integration

- The inspector shows 3D sections with their ValueJudgment rationale and a
  "why 3D here" explainer; users can demote any scene to its cinematic
  fallback with one click (and promote it back).
- Semantic ops extend: `TuneScene {lighting|camera-pace|hotspots}`,
  `SwapModel {slot}`, `DemoteTo {video|poster}` — all within scene variant
  axes; no free-form scene editing (same philosophy as layout: direction,
  not tooling).
- The placeholder checklist covers pending model approvals ("Your dish scan
  is queued — the site publishes with the cinematic version until you
  approve the 3D model").

---

## 8. Placement in the codebase plan

```
packages/
├── scenes/            # Class-B scene patterns (Three.js/R3F islands + contracts)
├── webgl-runtime/     # Class-A shader runtime (~12 KB) + capability ladder
├── assets-3d/         # ingestion, validation, compression, poster/video renders
└── gates/g8/          # the 3D gate suite (headless GPU harness)
infra/                 # GPU-enabled render/build worker pool (separate scaling)
```

Scaling note (extends SCALING.md): GPU workers are the only new fleet class;
they run render-farm style (build-time posters/videos + G8 harness), sized
by 3D-enabled generation volume (a minority of Premium+, projected < 5% of
total pipeline compute at 100k users), with queue isolation so 3D rendering
never blocks 2D generation throughput.
