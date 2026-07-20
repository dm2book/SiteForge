# SiteForge — Data Model & API Surface

PostgreSQL for relational state, JSONB for pipeline artifacts (schema-validated
at the application layer with zod — artifacts evolve too fast for columns),
S3-compatible object storage for bundles/assets/screenshots.

---

## 1. Entity overview

> **Note:** the authoritative, fully-specified schema (all core tables, ERD,
> relationship map, partitioning and integrity rules) now lives in
> [`DATABASE.md`](DATABASE.md). This section remains as the original
> high-level sketch; where they differ, `DATABASE.md` wins.

```
users ──< workspaces ──< projects ──< generations ──< generation_stages
                             │              │                │
                             │              ├──< gate_results│
                             │              └──< dna_fingerprints
                             ├──< sites ──< deployments
                             │        └──< form_submissions
                             └──< edits (semantic edit history)
niches (taxonomy)      archetypes / patterns / pairings (DNA registry, versioned)
plans / subscriptions / credit_ledger (billing)
```

### Core tables (abridged)

```sql
users            (id, email, name, auth_provider, created_at, …)
workspaces       (id, owner_id, name, plan_id, …)          -- teams in Phase 2
projects         (id, workspace_id, name, niche_id, business_facts jsonb,
                  current_site_id, created_at)

generations      (id, project_id, tier, status, archetype_id, mood jsonb,
                  cost_cents, wall_ms, error jsonb, created_at)
generation_stages(id, generation_id, stage, attempt, status,
                  input_hash, artifact jsonb, artifact_schema_ver,
                  model_used, tokens_in, tokens_out, ms, created_at)
                  -- one row per stage attempt; artifact = CreativeBrief,
                  -- DesignTokens, SitePlan, ContentGraph, … (PIPELINE.md)

gate_results     (id, generation_id, gate, page_path, blocking bool,
                  passed bool, score numeric, findings jsonb, created_at)
dna_fingerprints (id, generation_id, niche_id, archetype_id,
                  vector jsonb, hero_phash bytea, created_at)
                  -- indexed for the uniqueness gate's bucket query

sites            (id, project_id, generation_id, bundle_key,        -- S3 key
                  pattern_versions jsonb,                            -- pinning
                  tokens jsonb, status, published_at)
deployments      (id, site_id, target,            -- managed|vercel|netlify|zip
                  target_ref jsonb, url, status, created_at)
edits            (id, site_id, user_id, instruction text,
                  affected_stages text[], resulting_generation_id, created_at)

form_submissions (id, site_id, form_id, payload jsonb, spam_score,
                  forwarded_at, created_at)

plans            (id, name, monthly_credits, price_cents, …)
credit_ledger    (id, workspace_id, delta, reason,        -- generation|refund|grant
                  generation_id?, balance_after, created_at)
```

Notes:
- `generation_stages.input_hash` powers artifact caching and partial re-runs:
  a stage re-executes only if the hash of its inputs changed.
- `sites.pattern_versions` pins section-library versions so a site republishes
  byte-stable years later regardless of library evolution.
- Failed generations auto-refund credits via the ledger (never silently eat a
  credit on our error).

---

## 2. Niche taxonomy

Curated content, versioned in-repo (like the DNA), synced to a `niches` table:

```yaml
niche:
  id: dental-clinic
  labels: [dentist, dental clinic, orthodontist]
  category: local-health
  conversion_playbook:
    primary_cta: book-appointment
    trust_signals: [insurance-logos, before-after, credentials, review-score]
    required_sections: [services, team, contact-with-map]
    mobile: sticky-call-cta
  content_priors:
    tone_range: [reassuring, clinical-modern]
    faq_seeds: [insurance, pain, pricing, first-visit]
    schema_org: [Dentist, FAQPage]
  archetype_affinity: {clinical-modern: 3, soft-organic: 2, brutalist-confidence: 0}
```

Free-text niches resolve to the nearest taxonomy node (embedding match) and
inherit its playbook; truly novel niches fall back to the category-level
playbook with a frontier-model adaptation pass. Launch: 50 niches across 8
categories; the taxonomy is a growing editorial asset.

---

## 3. Artifact schemas

All pipeline artifacts (`CreativeBrief`, `DesignTokens`, `SitePlan`,
`ContentGraph`, `GateReport`) are zod schemas in `packages/shared`, versioned
with explicit migrations. Rules:

- Schemas are the *contract between stages* — a stage may be reimplemented
  (different model, different prompt, even non-LLM) without touching
  neighbors.
- Every artifact is small enough to render in the wizard UI (the streamed
  intermediate views) — no multi-MB blobs; bundles live in object storage.

---

## 4. API surface (platform API, v1)

REST + SSE; JSON; auth via short-lived JWT + refresh session cookie.

```
Auth
  POST /v1/auth/otp/request | /verify        # passwordless email
  GET  /v1/auth/oauth/:provider/start|callback

Projects & generation
  POST /v1/projects                          # {name, niche, businessFacts?}
  GET  /v1/projects/:id
  POST /v1/projects/:id/generations          # {archetype, mood, tier} → 202 {generationId}
  GET  /v1/generations/:id                   # status + stage summaries + gate report
  GET  /v1/generations/:id/events            # SSE: narrative progress + artifacts
  POST /v1/generations/:id/cancel

Preview & edits
  GET  /v1/sites/:id/preview-url             # signed, sandboxed preview origin
  POST /v1/sites/:id/edits                   # {instruction | structured op} → 202
  GET  /v1/sites/:id/pages/:path/sections    # section map for the inspector

Publish
  POST /v1/sites/:id/deployments             # {target, domain?}
  GET  /v1/deployments/:id
  POST /v1/sites/:id/export                  # → signed ZIP url

Sites runtime (public, per-site)
  POST /f/:siteId/:formId                    # form submissions (rate-limited,
                                             # spam-scored, forwarded per config)

Billing
  GET  /v1/billing/summary                   # plan, credits, usage
  POST /v1/billing/checkout | /portal        # Stripe
```

Internal (orchestrator ↔ workers) traffic is queue-native, not HTTP.

---

## 5. Object storage layout

```
bundles/{siteId}/{generationId}/site.tar.zst      # built static output
bundles/{siteId}/{generationId}/source.tar.zst    # Astro source (export/debug)
assets/{siteId}/...                                # processed images, fonts, og
gate-artifacts/{generationId}/screens/{page}@{bp}.png
gate-artifacts/{generationId}/lighthouse/*.json
```

Retention: gate artifacts 90 days; superseded bundles 30 days after a newer
publish; published bundles retained while the site exists.

---

## 6. Multi-tenancy & limits

- All queries workspace-scoped at the data layer (checked in one place, not
  per-route).
- Rate limits: generations concurrent-per-workspace (1 Standard / 2 Premium+),
  edits per minute, form submissions per site per hour.
- Deletion: project delete → soft-delete 30 days → hard purge of DB rows and
  object-store prefixes; deployed managed sites unpublish at soft-delete.
