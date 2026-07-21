# SiteForge — AI Provider System

The AI Provider System lets users bring their own AI accounts — choose which
engine powers their generations, store those accounts safely, and watch
credits and remaining generations in one place. It generalizes the
platform-owned `ai_accounts` pool (DATABASE.md §2.8) into a two-owner model:

- **Platform accounts** — SiteForge's own provider pool (the default; what
  the pipeline uses when a user hasn't connected anything).
- **User accounts** — accounts a user connects, owns, and pays for; used for
  *their* generations when selected.

Security is the organizing principle of this document: user credentials for
third-party services are the most sensitive data SiteForge will ever hold —
handled accordingly or not at all.

---

## 1. Provider registry

Providers are declarative entries in a versioned registry, each implemented
by an adapter. Launch set:

| Provider | Class | Auth | Programmatic status |
|---|---|---|---|
| **Claude** (Anthropic) | `llm-api` | API key (BYOK) | Official API — full pipeline integration |
| **GPT** (OpenAI) | `llm-api` | API key (BYOK) | Official API — full pipeline integration |
| **Arena** (LMArena) | `llm-gateway` | API key where offered | Integrated where an official API exists; otherwise link-out |
| **Lovable** | `gen-platform` | user session | **No official public API** — companion mode (§5) |
| **Bolt** | `gen-platform` | user session | No official public API — companion mode |
| **v0** (Vercel) | `gen-platform` | API key | v0 API where available; else companion mode |

```
provider_registry entry {
  id, class, display, auth_methods: [oauth | api_key | session],
  capabilities: {generate, quota_query, usage_query, account_create_link},
  cost_model: {unit: tokens | credits | generations, rates?},
  endpoints + egress_allowlist,          // adapter may ONLY talk to these
  tos_constraints: {automation_allowed: bool, notes}
}
```

**Two integration depths, stated honestly:**

- `llm-api` providers (Claude, GPT, and any provider with an official API)
  plug into the SiteForge pipeline itself: the orchestrator's model router
  treats a connected user key as a routable account, so *SiteForge's own
  8-stage pipeline* runs on the user's key and billing. This is true BYOK.
- `gen-platform` providers (Lovable, Bolt, v0-app) are **products, not
  APIs**. SiteForge integrates them in *companion mode*: account linking,
  credit/usage monitoring, prompt hand-off (we compose the brief, deep-link
  it into their product), and result import — but never headless automation
  of their web apps with stored user passwords. Automating a third-party
  product against its terms of service is a security hole and a partnership
  killer; the registry's `tos_constraints` gate what each adapter may do,
  and adapters gain `generate` capability only when an official API or
  partnership agreement exists (the registry flips a flag — no re-architecture).

---

## 2. Data model (extends DATABASE.md)

```sql
provider_registry     (id, class, display, config jsonb, version, status)

user_provider_accounts (
  id              uuid PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES users(id),
  provider_id     text NOT NULL REFERENCES provider_registry(id),
  label           text NOT NULL,                -- 'my anthropic key'
  auth_method     text NOT NULL,                -- oauth | api_key | session
  credential_ref  text NOT NULL,                -- vault path — NEVER material
  scopes          text[],
  status          text NOT NULL DEFAULT 'active',  -- active | invalid |
                                                   -- revoked | expired
  is_default      bool NOT NULL DEFAULT false,
  connected_at    timestamptz NOT NULL,
  last_verified_at timestamptz,
  revoked_at      timestamptz
)
-- UNIQUE (user_id, provider_id, label); INDEX (user_id, status)

quota_snapshots (
  id           uuid,
  account_id   uuid NOT NULL REFERENCES user_provider_accounts(id),
  taken_at     timestamptz NOT NULL,
  credits      numeric,            -- provider-native balance
  remaining_generations int,       -- where the provider counts in generations
  spend_mtd    numeric,
  limits       jsonb,              -- rpm/tpm/plan caps as reported
  source       text NOT NULL,      -- api | reconciliation | user_reported
  PRIMARY KEY (taken_at, id)
) PARTITION BY RANGE (taken_at)

alert_rules (
  id, account_id, kind,            -- low_credits | low_generations |
                                   -- spend_threshold | key_invalid
  threshold jsonb, channel text,   -- email | in_app
  last_fired_at timestamptz
)
```

- `usage_logs` (DATABASE.md §2.9) gains `account_owner text` (`platform` |
  `user`) and `user_account_id` — user-account usage is *metered identically*
  but **billed to nobody**: generations on a user's own key consume the
  user's provider credits and a reduced SiteForge platform fee (credit
  ledger reason: `byok_generation`), never double-charged.
- The platform pool remains in `ai_accounts`; the router treats both tables
  through one `RoutableAccount` view.

---

## 3. Credential security architecture

Threat model first: the credentials vault must survive (a) full database
compromise, (b) a compromised app server, (c) a malicious or buggy adapter,
(d) an insider with DB read access, (e) leaked logs/traces/backups.

**Storage — envelope encryption, per-credential:**
- Credential material lives only in the **secrets vault** (KMS-backed:
  AWS KMS + parameter-store pattern, or HashiCorp Vault). Postgres stores
  `credential_ref` — a pointer, useless on its own. A DB dump yields zero
  secrets.
- Envelope scheme: per-credential DEK, wrapped by a per-tenant KEK, wrapped
  by the KMS root. Rotation of any layer never requires user re-entry.
  Deleting a user's KEK is crypto-shredding — the deletion guarantee for
  account offboarding (DATA_MODEL §6).

**Access — narrow, short, audited:**
- Only the **credential broker** service can resolve refs; app servers and
  the Studio never can. Workers request material per job via the broker
  with a short-lived identity token scoped to `(generation_id, account_id)`;
  the broker checks that the generation actually belongs to the account's
  owner before releasing.
- Material is held in worker memory only for the duration of the provider
  call; never written to disk, cache, artifact, or environment.
- Every resolution is an audit-log row: who/what/why/when
  (`credential_access_log`, append-only, alert on anomalies — e.g. a
  credential resolved outside any running generation).

**Adapter containment:**
- Adapters run with per-provider **egress allowlists** (a Claude adapter
  can reach `api.anthropic.com` and nothing else) — an exploited adapter or
  a prompt-injected response cannot exfiltrate keys elsewhere.
- Provider responses are data, never instructions: nothing a provider
  returns can alter routing, scopes, or other accounts.
- Redaction middleware scrubs anything key-shaped from logs, traces, and
  error reports platform-wide (belt: structured logging bans secret fields;
  suspenders: pattern scrubber on egress to the log pipeline).

**Session-auth providers (the hard case), if/when enabled:**
- OAuth or API key is always required where offered. For `session`-auth
  gen-platforms in companion mode, SiteForge stores at most a
  provider-issued token obtained through the provider's own consent flow —
  **never the user's password**. There is no password field anywhere in the
  system for third-party services; a design that asks for one is rejected
  at the registry level (`auth_methods` has no `password` variant).
- Client-side rule: credentials go browser → API over TLS in a
  create-only call; they are never readable back through any API. The UI
  shows `sk-ant-…4f2A` fingerprints only.

**Verification & hygiene:**
- On connect: a minimal-scope live probe validates the key, records
  granted scopes, and warns on over-broad keys ("this OpenAI key has org
  admin scope — create a restricted key instead", with a provider deep-link).
- Continuous: daily silent re-verification; `invalid`/`expired` statuses
  flip alerts + pause routing to that account (generations fall back per
  the user's fallback policy, §4).
- Revocation: one click destroys the vault entry (crypto-shred), marks the
  row `revoked`, and reminds the user to also revoke provider-side.

---

## 4. Routing & generation integration

Per project, the user sets an **engine policy**:

```
EnginePolicy {
  preferred: platform | user_account_id,
  fallback:  platform | none,        // if my key is rate-limited/empty
  budget:    {max_spend_per_generation?, stop_at_credits?}
}
```

- The orchestrator's router (PIPELINE §8) resolves the policy per stage:
  `llm-api` user accounts slot into the same weighted router as platform
  accounts, with the user's account pinned for their generation.
- Budget guards run *pre-flight*: estimated stage cost vs. the account's
  latest `quota_snapshot`; a generation that would strand mid-pipeline on
  an empty key is refused up front ("~$0.90 needed, your balance ≈ $0.40")
  rather than half-run.
- Tier interaction: quality tiers and gates are identical on BYOK — a
  Signature run on the user's Claude key is the same pipeline, same gates;
  only the payer changes.

---

## 5. User flows

**Connect (save) an account:** Providers page → choose provider → OAuth
dance or key paste (with provider-specific "where to find this" guidance) →
live probe → scope review → labeled, saved, optionally project-default.

**Create an account:** SiteForge never creates third-party accounts *for*
the user (that requires impersonation — exactly what the threat model
forbids). Instead: guided creation — deep-link to the provider's signup +
API-key page with step annotations, then capture the key in the same
connect flow. Fast for the user, zero impersonation risk, ToS-clean.

**Monitor credits:** the Providers dashboard shows, per account: current
credits / remaining generations (freshest snapshot + age), spend this
month (from our own metering, reconciled against provider-reported usage
where APIs expose it), a 30-day usage sparkline per project, and alert
rules (low-credit threshold, monthly spend cap → email/in-app). Snapshot
freshness: on-demand at generation pre-flight, scheduled 6-hourly for
active accounts, plus post-generation delta updates from our own metering
when the provider exposes no balance API (companion-mode providers:
user-reported balances with staleness labeling — honest data or labeled
data, never guessed data).

**Hand-off (companion mode):** for Lovable/Bolt/v0-app, "generate with X"
composes the SiteForge brief into the provider's prompt format, deep-links
it, and records the hand-off as a `prompts.source = 'handoff:<provider>'`
row — usage tracking closes the loop when the user reports or the
provider's usage API exposes it.

---

## 6. Placement & gates

- `packages/providers`: registry schema, adapter interface
  (`verify / generate / quota / usage`), per-provider adapters, the
  credential broker client. Adapters are pure request/response modules —
  no adapter may import storage, logging, or other adapters.
- Infra: vault/KMS setup, broker service, egress policy per worker class
  (extends SCALING.md topology; the broker is the one new box).
- CI gates: secret-scanning on every commit; adapter contract tests run
  against provider sandboxes; a "no-password" lint that fails any schema or
  form introducing password fields for third-party services; chaos drill —
  quarterly restore-from-backup must demonstrate the DB dump alone yields
  no usable credential.
