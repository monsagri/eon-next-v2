# Adapter / Normaliser Architecture — Build Plan

Date: 2026-07-11
Status: Target architecture + phased build plan (no code yet)
Relationship to other docs:
- Builds on `planning/provider_generalization.md` (Phases 1-6, shipped: the
  Kraken multi-tenant slice).
- Synthesises three research inputs: the Kraken provider map, the Octopus
  incumbent feature map, and the adapter/normaliser architecture spec.

---

## 0. What this is (and the muscle it exercises)

Phases 1-6 turned a single-provider E.ON Next integration into a **Kraken
multi-tenant** integration: one client keyed by a `ProviderDescriptor`, a
normalised WebSocket contract the frontend consumes, provider selection in the
config flow, Octopus registered as a second tenant, and a connected-accounts
surface. That is one row of a much larger grid.

This document targets the **full adapter/normaliser architecture**: many
independent data sources - Kraken supplier APIs, DCC-reseller meter feeds,
local hardware - ingested behind **capability-declaring adapters** and merged
by a **composition engine** into one normalised model, with **provenance** and
**per-domain freshness** as first-class concerns.

The deliberate difficulty here - the muscle being trained - is the
**composition engine**: not a primary/fallback chain, but a normaliser that
reads each source's declared capabilities and merges overlapping data
deterministically without any source clobbering another. Everything else
(adapters, sensors, UI) is scaffolding around that core.

**Non-goals / hard exclusions** (decided, not open):
- No DCC-direct access (requires SECAS accreditation; enterprise-scale). We
  target accredited **resellers** (Hildebrand, n3rgy) only.
- No Octopus-proprietary features (Intelligent dispatches, Saving Sessions,
  Octoplus, Wheel of Fortune, Greenness, Home Mini/Pro). They are ~half the
  incumbent's surface and the bulk of its issue volume. We own the **Core**
  contract across many tenants instead.
- The HA integration `domain` stays `eon_next` (frozen - see
  `provider_generalization.md` §4). It is an opaque slug; branding is separate.

---

## 1. Where we are today (Phase 6 baseline)

We occupy exactly one cell of the capability grid: **Kraken · cloud · pull ·
single-supplier · near-real-time/next-day · no hardware**.

| Component (today) | Role | Reused or refactored by this plan |
| --- | --- | --- |
| `providers.py` (`ProviderDescriptor`, registry) | Per-Kraken-tenant config | **Reused** - becomes the Kraken adapter's per-tenant config |
| `eonnext.py` (`KrakenClient`) | The single data source | **Refactored** into a `KrakenAdapter` implementing the adapter interface |
| `coordinator.py` (`EonNextCoordinator`) | Poll + assemble per-meter dict | **Refactored** - one coordinator per source; merge moves to the normaliser |
| `schemas.py` + `websocket.py` (WS contract) | Presentation model for the frontend | **Reused** - becomes the read-model *over* the normalised store |
| `statistics.py` / `backfill.py` | Energy-Dashboard import | **Refactored** - import must apply composition precedence (dedupe) |
| `cost_tracker.py` | Any-sensor → cost | **Reused** - already provider-agnostic |
| `tariff_helpers.py` / `tariff_patterns.py` | Rate/TOU resolution | **Reused** - operates on normalised tariff records |
| Frontend contract + Settings accounts surface | Provider attribution, per-account status | **Reused/extended** - already anticipates multi-source |

What we do **not** have: any adapter abstraction, any composition/merge, any
`source_adapter` provenance, any non-Kraken source, any local/push source, any
bulk-history source, and no first-class per-domain freshness/health surface
(only HA's built-in `last_update_success` availability).

---

## 2. Core principle: capabilities, not tiers

Sources differ on several **independent** axes, so ranking them on one quality
axis and wiring a primary/fallback chain is wrong. Each adapter **declares**
where it sits on the grid; the normaliser **composes** sources, each filling
cells the others leave empty.

### Capability axes

| Axis | Values |
| --- | --- |
| Data domain | consumption · tariff/rate · standing charge · account/billing · export/generation |
| Temporality | live (ongoing) · backfill (one-shot bulk) |
| Latency | real-time (seconds) · near-real-time (~30 min) · next-day |
| Locality | local (no cloud) · cloud |
| Transport | push (MQTT/websocket) · pull (REST/GraphQL poll) |
| Coverage | single-supplier · supplier-agnostic |
| Hardware | none · CAD/IHD required |

A single household might run a **Kraken** adapter (billing/tariff/account), a
**Glow local MQTT** adapter (real-time consumption), and a one-shot **n3rgy**
import (12 months history). None is a degraded version of another.

### Source catalogue (targets)

| Source | Domains | Temporality | Latency | Locality | Transport | Coverage | HW |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Kraken** (Octopus, E.ON Next, EDF/OEFR, Good Energy) | consumption+tariff+standing+account | live | near-real-time / next-day | cloud | pull (GraphQL) | single-supplier | none |
| **Hildebrand cloud (Bright)** | consumption+tariff+standing | live | ~30 min | cloud | pull (REST) | supplier-agnostic | none |
| **Glow local MQTT** (Hildebrand CAD) | consumption/demand | live | real-time | **local** | **push (MQTT)** | supplier-agnostic | CAD |
| **n3rgy** | consumption (+ some tariff) | **backfill** + live | next-day | cloud | pull (REST) | supplier-agnostic | none |

Two structural classes fall out (subordinate to the declarations above):
- **Class A** - supplier account adapters (per-supplier credentials; full
  picture incl. account/billing). Kraken family is the only realistically
  buildable Class-A (shared GraphQL schema → one adapter, per-tenant config).
- **Class B** - DCC-reseller meter adapters (supplier-agnostic; the universal
  floor covering the ~40% of the market with no supplier API - British Gas,
  ScottishPower, OVO).

---

## 3. Target architecture

### 3.1 Normalised internal model

Storage separates domains so different adapters populate different parts of the
same logical meter without collision. `source_adapter` and ingest time are
stamped on **every** record - provenance is first-class.

```
Account
 ├─ id, provider_type, display_name, source_adapter
 ├─ (Class A only) balance, billing info
 └─ MeterPoints[]
     ├─ mpxn (MPAN electricity / MPRN gas)   ← the cross-adapter join key
     ├─ fuel_type (electricity | gas), direction (import | export)
     ├─ ConsumptionSeries[]  {interval_start, interval_end, value, unit, source_adapter, ingested_at}
     ├─ DemandSeries[]       {ts, watts, source_adapter}          ← real-time only (Glow, Home Mini)
     ├─ TariffAgreements[]   {valid_from, valid_to, unit_rates[], standing_charge, source_adapter}
     └─ freshness            {domain → {last_success_ts, status, source_adapter}}
```

Rules:
1. `source_adapter` on every record - needed for merge, debugging, and the
   freshness surface.
2. **Consumption and tariff are independently sourced.** A non-Kraken user gets
   consumption from Glow/Hildebrand and tariff from Hildebrand cloud, a manual
   static rate, or the **Octopus public product API** (unauthenticated, lists
   the whole market's tariffs - a usable generic reference we do not yet use).
3. `freshness` is tracked **per domain per meter**, not globally - a user may
   have live consumption but stale tariff, and the UI must reflect that.
4. **MPxN is the join key.** All adapters key meter points on MPAN/MPRN so the
   normaliser can merge a meter that appears in more than one source.

### 3.2 Adapter interface (capability-declaring)

Every source implements a common interface and declares its capabilities; the
normaliser never assumes parity and only lets an adapter write domains it
declares.

```python
class Adapter(Protocol):
    def capabilities(self) -> Capabilities: ...   # static declaration (see axes)
    async def authenticate(self, config) -> Session: ...
    async def discover_meter_points(self, session) -> list[MeterPoint]: ...

    # Implemented only if declared in capabilities.temporality/transport:
    async def fetch_live(self, session, mp) -> list[Reading]: ...        # pull
    async def subscribe_live(self, session, mp, on_reading) -> Sub: ...  # push (Glow)
    async def fetch_backfill(self, session, mp, range) -> list[Reading]: # n3rgy

    def health(self, session) -> list[DomainHealth]: ...   # MANDATORY
```

- Push vs pull is just two methods; transport is abstracted (Glow local is not
  "special", merely push-based).
- Adapters implement only the methods their capabilities declare.
- `health()` is **mandatory** - the countermeasure to the incumbent's #1 pain
  (the "silent stall": data stops without an obvious error).

### 3.3 The normaliser (composition engine — the core)

When multiple adapters cover the same meter/domain, merge deterministically:

1. **Domain routing.** An adapter may only write domains it declares. A
   consumption-only adapter (Glow) can never overwrite tariff.
2. **Consumption precedence** for overlapping intervals: **local > cloud**,
   then **real-time > near-real-time > next-day**. Glow local wins over
   Hildebrand cloud for the same interval; Hildebrand fills intervals Glow
   missed (before the CAD existed).
3. **Backfill never overwrites live.** `fetch_backfill` only fills intervals
   with no existing live record - n3rgy populates the past without clobbering
   today's Glow data.
4. **Tariff precedence:** supplier (Kraken) > DCC-reseller (Hildebrand) >
   public product API > manual static rate.
5. **Provenance preserved on merge;** conflicts are logged, never silently
   dropped.

Target outcome: a household running **Glow local + n3rgy history + Kraken
billing** gets one continuous consumption series (Glow live, n3rgy past), rich
tariff/account from Kraken, and no source stepping on another.

### 3.4 Freshness / health as a feature

- Per-domain freshness sensors per meter and per adapter (`last successful
  consumption update`, `last tariff refresh`).
- Token-refresh robustness in all cloud adapters (Kraken and Hildebrand both
  use expiring tokens; DCC token expiry is a known silent-stall cause).
- Staleness detection: never present stale data as current; surface it. Glow
  local is the mitigation (local + push → immune to DCC/token failures).
- Conservative, per-source polling with backoff (see §5).

---

## 4. Mapping the abstract spec onto Home Assistant reality

This is where the generic spec meets HA's actual model - the decisions that
make it buildable, not just diagrammable.

### 4.1 One config entry per *source connection*
Each source with its own credentials/transport is a config entry: a Kraken
account, a Hildebrand account, a Glow MQTT device, an n3rgy connection. Each
entry owns an adapter + a coordinator (or a push subscription). This fits HA
(one credential set = one entry) and reuses our existing *aggregate-across-
entries* pattern (`ws_dashboard_summary`, the accounts surface). The config
flow gains a **source-type picker** above the provider picker.

### 4.2 The normaliser is a household-level merge, keyed by MPxN
The composition engine sits **above** the per-entry coordinators. Each
coordinator produces normalised, provenance-stamped records for its source; the
normaliser merges them by MPxN into the per-meter view the WS contract exposes.
Concretely this is a new module (e.g. `normaliser.py`) plus a shared in-memory
store; the WS layer reads the merged store instead of a single coordinator.

### 4.3 Composition must happen at **two** layers
- **Live/current state** (in-memory, drives sensors + the dashboard): merge on
  every update using §3.3 precedence.
- **Long-term statistics** (recorder, drives the Energy Dashboard): the harder
  one. If Glow *and* Kraken both feed the same meter's consumption, the
  statistics import must **dedupe/merge, not double-count**. Precedence is
  applied at import time, keyed by `(statistic_id=meter serial, interval)`.
  This is the single most delicate piece of the whole build and needs its own
  test suite (idempotent re-import, no regressive sums, no double counting).

### 4.4 Identity & guardrails stay intact
- Entity `unique_id` and statistic ids remain **meter-serial-based** and
  provider-agnostic (existing guardrail). Multiple adapters feeding one meter
  share one statistic id - the composition dedupe is what makes that safe.
- No entity/unique_id renames without migration + release note (unchanged).

### 4.5 Transport specifics
- **Push (Glow):** HA has native MQTT; the Glow adapter subscribes to the local
  Hildebrand CAD topics and pushes readings into the store (no coordinator poll).
- **Pull (Kraken/Hildebrand/n3rgy):** DataUpdateCoordinator per entry, each at
  its own interval (§5).
- **Backfill (n3rgy):** a one-shot job (like today's `backfill.py`), but writing
  through the composition layer so it only fills gaps.

---

## 5. Cross-cutting disciplines (learned from the incumbent)

- **Conservative, tiered polling.** Kraken tenants are polling-sensitive
  (Octopus reports ~95% of its API traffic is the community integration; rate
  limits are per-viewer/IP and do not auto-reset). Poll different data classes
  at different intervals (tariff/account rarely change; consumption is next-day
  anyway). Hildebrand enforces a 5-minute floor. Every adapter declares a
  **minimum interval** and the scheduler respects it.
- **Exponential backoff on failure** to a ~30-minute ceiling, per source.
- **Repairs framework.** Ship first-class HA Repairs for the multi-tenant
  failure modes (account not found, no active tariff, unknown product, empty
  tariff rates, meter removed, token expired) - better UX than a silent stall.
- **Per-provider capability map, not parity.** A tenant only exposes fields for
  products it sells. Introspect/capability-gate rather than querying every field
  on every tenant; store the result on the descriptor. This also de-risks HA
  statistics-API drift and Octopus field changes.

---

## 6. Gap analysis: today → target

| Capability | Today (Phase 6) | Target | Delta |
| --- | --- | --- | --- |
| Adapter interface | none (concrete `KrakenClient`) | capability-declaring `Adapter` | **new** |
| Composition engine | none (1 source/meter) | normaliser w/ precedence + provenance | **new (the core)** |
| Provenance (`source_adapter`) | none | on every record | **new** |
| Per-domain freshness/health | HA availability only | first-class sensors | **new (cheap, high value)** |
| Class A (Kraken) | ✅ multi-tenant | adapter-ised, capability-gated | refactor |
| Class B (Hildebrand/n3rgy) | none | Bright + n3rgy adapters | **new (the differentiator)** |
| Local real-time (Glow MQTT) | none | push adapter | **new** |
| Bulk history | re-pulls Kraken | n3rgy backfill via composition | **new** |
| Statistics dedupe/precedence | single source, no merge | import-time composition | **new (delicate)** |
| Polling discipline | single 30-min interval | tiered + backoff + per-source floor | refactor |
| Repairs | none | first-class | **new** |
| Tariff comparison / product API | none | optional (public product API) | later |

---

## 7. Build order

Sequenced so each phase is independently shippable and the risky core is
validated early with real, different sources. Phases 7-8 are incremental on
today's design; 9+ are the architecture proper.

1. **Phase 7 - Freshness/health surface.** Per-domain, per-meter,
   per-source `last_success` + status, exposed as sensors and on the WS
   contract / accounts surface. Cheap, closes the incumbent's #1 pain, and
   forces us to define the `freshness` model early. *No new sources.*
2. **Phase 8 - Per-provider capabilities + graceful field absence.** Capability
   flags on the descriptor; query/parse gated on them; introspection helper to
   populate them. De-risks Tier-2 tenants and API drift.
3. **Phase 9 - Extract the spine.** Define the normalised model, the `Adapter`
   interface, and the normaliser with composition rules. Refactor `KrakenClient`
   into `KrakenAdapter` behind the interface. The normaliser runs with a single
   adapter (a no-op merge) - behaviour identical, but the seam exists and the
   composition tests are written now against synthetic multi-source fixtures.
4. **Phase 10 - Class B: Hildebrand cloud (Bright) adapter.** Widest reach,
   hardware-free, carries consumption + tariff. First *genuinely different*
   source → exercises real composition (Kraken tariff + Hildebrand consumption
   for a non-Kraken supplier). Validates Class B end-to-end.
5. **Phase 11 - Glow local MQTT adapter.** Push transport, real-time, local.
   Exercises consumption precedence (local > cloud) and the push path; delivers
   the standout feature and the silent-stall mitigation.
6. **Phase 12 - n3rgy backfill adapter.** One-shot 12-month history; exercises
   "backfill never overwrites live" and the statistics-import composition.
7. **Cross-cutting, folded in from Phase 9 on:** tiered polling + backoff,
   Repairs, and statistics-composition test hardening.

Each phase carries: tests (composition phases need adversarial merge/dedupe
tests), a headless dashboard check, and README/CHANGELOG updates for
user-visible behaviour.

---

## 8. Provider coverage this unlocks

| Segment (~UK share) | Class A (Kraken) | Class B (DCC reseller) | Real-time |
| --- | --- | --- | --- |
| Octopus (~25%) | ✅ rich | ✅ | Home Mini / Glow |
| E.ON Next (~14%) | ✅ | ✅ | Glow |
| EDF (~10%) | ✅ (UK verify) | ✅ | Glow |
| Good Energy (small) | ✅ | ✅ | Glow |
| **British Gas (~20%)** | ❌ no API | ✅ Hildebrand/n3rgy | Glow |
| **OVO (~12%)** | ⚠️ unreliable | ✅ | Glow |
| **ScottishPower (~8%)** | ❌ no API | ✅ | Glow |

Kraken delivers the rich experience for ~49% of the market; Class B delivers
universal consumption for the ~40% behind no supplier API; Glow local delivers
best-in-class real-time to anyone. **No existing integration unifies all
three** - that composition is the differentiator, and the strategic reason to
lead with breadth rather than out-featuring the incumbent on Octopus.

---

## 9. Key risks & open questions

- **Statistics composition is the crux risk.** Double-counting or regressive
  sums in the Energy Dashboard are user-visible and hard to unwind. It needs a
  dedicated, adversarial test suite before any second consumption source ships.
- **Config-entry model choice** (one entry per source connection) must be
  confirmed against HA UX - particularly how a household "links" a Glow device
  and an n3rgy import to the same meter (MPxN entered by the user, or
  discovered). Decision needed before Phase 10.
- **Provider/source ToS.** Octopus's API is public; other Kraken tenants and the
  DCC resellers have their own terms and rate floors - verify before shipping
  each.
- **Polling politeness at scale.** As we add Octopus + resellers, a naive poller
  could get IPs rate-limited across tenants. Tiered polling + backoff is not
  optional at this scale.
- **Frontend identity (deferred).** A multi-source shell needs neutral branding
  + per-meter/per-source attribution. The contract already carries `provider`;
  the shell branding decision is tracked separately and is out of scope here.
- **Scope honesty.** This is a genuine re-architecture, not a feature. Phases
  7-8 stand alone and are worth doing regardless; 9+ are the commitment.
