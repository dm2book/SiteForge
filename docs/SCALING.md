# SiteForge — Scaling Strategy & Deployment Architecture

Target: **100,000 registered users** without re-architecture. This document
sizes the load, shows why the design from `ARCHITECTURE.md` absorbs it, and
defines the production deployment topology.

---

## 1. Load model at 100k users

Assumptions (deliberately conservative, generation-heavy):

| Metric | Assumption | Derived load |
|---|---|---|
| MAU | 40% of registered | 40,000 MAU |
| Generations | 3 / MAU / month | 120,000 generations/mo ≈ **~4,000/day**, peak ~500/hr |
| Semantic edits | 8 / generation | ~32,000 partial re-runs/day |
| Dashboard/API traffic | 20 req/session, 1.5 sessions/day/MAU | ~25 req/s average, ~150 req/s peak |
| Deployed sites (managed) | 30k live | CDN-served, ~zero origin load |
| Form submissions | 5/site/day | ~1.7 M/mo, trivial writes |
| usage_logs rows | ~40 AI calls/generation + edits | **~8 M rows/mo** |

Two decisive observations:

1. **The SaaS shell is small.** 150 req/s peak of CRUD is a single modest
   Postgres primary + a stateless app tier. Nothing exotic needed.
2. **The real scaling dimensions are (a) pipeline throughput — bounded by
   model-provider rate limits and build sandboxes, not our CPU — and (b)
   append-only telemetry volume.** Both were designed for from day one:
   the queue absorbs (a); partitioning absorbs (b).

The visitor traffic to *generated sites* (potentially millions of page views)
never touches the platform at all — static bundles on the CDN. This is the
architecture's biggest scaling gift: our most numerous artifact has zero
marginal serving cost.

---

## 2. Scaling strategy per layer

### 2.1 Web/app tier
- Stateless Next.js + API containers behind a load balancer; horizontal
  autoscaling on CPU + p95 latency. No server-side session state (JWT +
  Redis-backed refresh lookup), so scale-out is trivial.
- SSE progress streams fan out through Redis pub/sub so any app instance can
  serve any generation's stream; sticky sessions not required.

### 2.2 PostgreSQL
- **One primary + 2 read replicas** (dashboards, analytics, uniqueness-gate
  bucket queries go to replicas). At the load model above the primary runs at
  a fraction of capacity on 8 vCPU — headroom to ~500k users before
  sharding conversations start.
- **PgBouncer (transaction pooling)** in front of everything — the worker
  fleet is bursty and would otherwise exhaust connections.
- **Partitioning** from day one on the three high-volume tables
  (`usage_logs`, `generation_stages`, `gate_results`): monthly range
  partitions, detached + archived to S3 (Parquet) after 6 months. Keeps the
  hot working set in RAM and vacuum cheap.
- UUIDv7 keys keep B-tree inserts append-mostly (no random-page write
  amplification at volume).
- Growth path (post-100k, not built now): niche/archetype fingerprint queries
  → dedicated vector store; usage analytics → ClickHouse; tenant sharding by
  `user_id` hash only if the primary ever saturates.

### 2.3 Queue & worker fleet (the pipeline)
- Generation stages are stateless, idempotent steps → workers scale
  horizontally on queue depth (KEDA-style autoscaling: target ≤ 60 s queue
  wait at Standard tier).
- **Two isolated worker pools:** LLM-stage workers (I/O-bound, high
  concurrency per pod) and build/gate workers (CPU-bound sandboxes running
  `astro build`, Lighthouse, axe; one job per sandbox, gVisor/Firecracker
  isolation, no network). Pools scale independently — a copywriting burst
  doesn't starve builds.
- **Model-provider throughput is the true ceiling.** The `ai_accounts` pool
  (DATABASE.md §2.8) is the throttle: Redis token buckets per account,
  weighted routing across accounts, automatic failover on 429/5xx, and
  per-tier priority queues so Signature generations preempt Standard re-rolls
  when capacity tightens. Scaling generation throughput = adding accounts /
  raised limits, a config change, not a deploy.
- Backpressure is explicit: when queue wait exceeds SLA, the wizard shows an
  honest queue position rather than degrading quality — tiers never silently
  downgrade (QUALITY.md §1).

### 2.4 Redis
- Managed Redis (cluster mode off at this scale): queue backing, rate-limit
  token buckets, SSE pub/sub, hot caches (niche taxonomy, template registry,
  signed-URL memo). All contents reconstructible — Redis loss degrades
  latency, never correctness.

### 2.5 Object storage & CDN
- S3 scales itself; the design keeps bundles immutable and content-addressed,
  so CDN cache hit rates stay ~100% for published sites.
- Managed-hosting sites: CDN edge with per-site host routing → immutable
  bundle origin. Publishing = flip a pointer + targeted invalidation.
  100k sites and 30k live deployments are a routing-table problem, not a
  compute problem.

### 2.6 Cost scaling
- AI spend is the dominant marginal cost and is *metered per generation*
  (`usage_logs` → `generations.cost_cents`), giving live unit economics per
  tier. Budget alarms per `ai_accounts` row; per-tier token budgets already
  enforced by the orchestrator (PIPELINE.md §8).

---

## 3. Deployment architecture

```
                                   ┌────────────────────────────┐
        users ──────────────────▶  │  Edge CDN (app + assets)   │
                                   └───────────┬────────────────┘
                                               │
                              ┌────────────────▼─────────────────┐
                              │        Load balancer / WAF        │
                              └───────┬───────────────┬──────────┘
                                      │               │
                          ┌───────────▼───┐   ┌───────▼─────────┐
                          │  Web (Next.js)│   │  Platform API   │   stateless,
                          │  autoscaled   │   │  autoscaled     │   HPA on CPU/p95
                          └───────┬───────┘   └───────┬─────────┘
                                  │      SSE via      │
                                  │   Redis pub/sub   │ enqueue
                    ┌─────────────▼───────────────────▼──────────────┐
                    │                Redis (managed)                 │
                    │   queues · token buckets · pub/sub · caches    │
                    └───────┬────────────────────────────┬───────────┘
                            │ jobs                       │ jobs
              ┌─────────────▼──────────┐    ┌────────────▼─────────────┐
              │  LLM-stage worker pool │    │  Build/gate worker pool  │
              │  (I/O bound, high      │    │  (sandboxed astro build, │
              │   concurrency)         │    │   Lighthouse, axe;       │
              │  → ai_accounts router  │    │   gVisor, no network)    │
              └─────────────┬──────────┘    └────────────┬─────────────┘
                            │                            │
        ┌───────────────────▼────────────────────────────▼─────────────────┐
        │   PgBouncer → PostgreSQL primary ──streaming──▶ 2 read replicas  │
        │   (monthly partitions on usage_logs / stages / gate_results)     │
        └───────────────────────────────┬──────────────────────────────────┘
                                        │
        ┌───────────────────────────────▼──────────────────────────────────┐
        │  S3 object storage: bundles · assets · gate artifacts · archives │
        └───────────────┬──────────────────────────────────────────────────┘
                        │ immutable origins
        ┌───────────────▼───────────────┐      ┌──────────────────────────┐
        │  Sites CDN (managed hosting)  │      │ External: Stripe · model │
        │  *.siteforge.site + custom    │      │ providers · Vercel/      │
        │  domains (auto ACME)          │      │ Netlify deploy APIs      │
        └───────────────────────────────┘      └──────────────────────────┘
```

**Placement choices**

| Component | Runs on | Why |
|---|---|---|
| Web + API | Container platform (Fly.io/ECS/Cloud Run — pick one, stay boring) | Stateless autoscale; Vercel acceptable for web tier alone |
| Worker pools | Kubernetes or Nomad with KEDA-style queue autoscaling | Sandboxing (gVisor) + independent pool scaling |
| Postgres | Managed (RDS/Aurora or Neon) | PITR, replicas, zero self-run ops |
| Redis | Managed (Elasticache/Upstash) | Reconstructible state, no ops budget |
| Object storage | S3 (or R2 for egress-free CDN pairing) | Immutable, content-addressed |
| App CDN + Sites CDN | Cloudflare | Host-based routing for 100k custom domains + ACME automation |

**Environments & delivery**

- `dev` (per-PR ephemeral previews) → `staging` (full topology, scaled down,
  nightly synthetic generations run the benchmark suite) → `prod`.
- Everything IaC (Terraform); images built once, promoted through
  environments; DB migrations expand-migrate-contract, always
  backward-compatible one release in each direction (workers and API deploy
  independently).
- Template registry (Design DNA) ships via its own versioned sync job — a
  content deploy, decoupled from code deploys.

**Resilience & operations**

- SLOs: API p95 < 300 ms; Standard generation p95 < 3 min queue-to-shipped;
  SSE delivery < 2 s lag.
- Postgres PITR + cross-region snapshot copies; S3 versioning + replication
  for `bundles/`; RTO 1 h / RPO 5 min for platform data. Published sites keep
  serving from CDN even during a full platform outage — a headline
  reliability property.
- Observability: OpenTelemetry traces spanning API → queue → stages →
  provider calls (one trace per generation, the debugging unit); metrics on
  queue depth, gate pass rates, per-account provider health; structured logs
  with `generation_id` correlation everywhere.
- Kill switches: per-provider disable (routes around a failing model vendor),
  per-tier pause, global generation pause (billing-safe: queued work refunds
  instead of failing).

---

## 4. Explicit non-goals at 100k

Deliberately *not* built at this scale (revisit ≥ 500k users): database
sharding, multi-region active-active for the platform (CDN already gives
sites multi-region), Kafka-class event streaming, a separate analytics
warehouse beyond partitioned Postgres + S3 archives. Every one of these has a
clean insertion point in the current design; building them now would be
premature complexity.
