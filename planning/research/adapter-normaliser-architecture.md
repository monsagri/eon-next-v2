# Adapter / Normaliser Architecture — Multi-Provider Energy Integration

**Purpose:** Define the internal architecture that lets one app ingest UK energy data from many sources — Kraken supplier APIs, DCC-reseller meter feeds, and local hardware — behind a single normalised model. This is the design spec that ties together the [Kraken provider map](./kraken-provider-map.md) and the [Octopus incumbent feature map](./octopus-incumbent-feature-map.md).

**Date compiled:** 11 July 2026

---

## 1. Core principle: capabilities, not tiers

The naive design ranks sources on a single quality axis and wires them as a primary/fallback chain. That is wrong for this domain, because the sources differ on *several independent axes* — not one.

Each source is described by **where it sits on a capability grid**, and the normaliser **composes** sources rather than picking a winner. A single household might simultaneously run:

- a **Kraken adapter** for billing/tariff/account data,
- a **Glow local MQTT adapter** for real-time consumption,
- a **one-shot n3rgy import** for 12 months of history.

None is a degraded version of another. Each fills cells the others leave empty.

### The capability axes

| Axis | Values |
|------|--------|
| **Data domain** | consumption · tariff/rate · standing charge · account/billing · export/generation |
| **Temporality** | live feed (ongoing) · historical backfill (one-shot bulk) |
| **Latency** | real-time (seconds) · near-real-time (~30 min) · next-day |
| **Locality** | local (no cloud) · cloud |
| **Transport** | push (MQTT/websocket) · pull (REST/GraphQL poll) |
| **Coverage** | single-supplier · supplier-agnostic |
| **Hardware** | none · CAD/IHD required |

An adapter **declares** its position on these axes. The normaliser reads those declarations to decide what each adapter is allowed to populate and how to merge overlapping sources.

---

## 2. Source catalogue mapped to the grid

| Source | Domain | Temporality | Latency | Locality | Transport | Coverage | HW |
|--------|--------|-------------|---------|----------|-----------|----------|----|
| **Kraken** (Octopus, E.ON Next, EDF, Good Energy) | consumption + tariff + standing + account | live | near-real-time (next-day for consumption; Home Mini = real-time) | cloud | pull (GraphQL) | single-supplier | none* |
| **Glow local MQTT** (Hildebrand CAD) | consumption/demand | live | real-time | **local** | **push (MQTT)** | supplier-agnostic | CAD |
| **Hildebrand cloud (Bright)** | consumption + tariff + standing | live | near-real-time (~30 min) | cloud | pull (REST) | supplier-agnostic | none |
| **n3rgy** | consumption (+ some tariff) | **historical backfill** + live | next-day | cloud | pull (REST) | supplier-agnostic | none |

\* Octopus Home Mini / Home Pro is optional hardware that upgrades Kraken consumption latency to real-time.

**Reading the grid:** Glow local is the only *local + push + real-time* source — the highest-quality live consumption feed. Hildebrand cloud is the widest-reach *hardware-free live* source and uniquely (among Class-B) carries tariff. n3rgy is the only source with *bulk 12-month history*. Kraken is the only source with *account/billing + rich single-supplier tariff*. Four sources, four genuinely distinct roles.

---

## 3. The two structural classes

The grid collapses into two **adapter classes** that differ in auth and coverage — useful for code organisation, but subordinate to the capability declarations above.

### Class A — Supplier account adapters (single-supplier, rich)
Per-supplier credentials; return the full picture including account/billing and supplier-specific tariff.
- **Kraken family** is the only realistically buildable Class-A today (shared GraphQL schema across tenants → one adapter, per-tenant config; see provider map).
- Non-Kraken suppliers (British Gas, OVO, ScottishPower) expose **no usable consumption API** — deliberately excluded from Class A. Their customers are served via Class B.

### Class B — DCC-sourced meter adapters (supplier-agnostic, universal floor)
Read the meter via the national DCC infrastructure, so they work regardless of supplier — covering the ~40–50% of the market with no supplier API.

> **You cannot go direct to DCC.** DCC access requires SECAS accreditation as a "DCC Other User," per-meter key setup, and an accredited Adapter — enterprise-scale, off the table for this app. Class B therefore targets the **accredited resellers** (Hildebrand, n3rgy) who have done that work. "DCC direct" is not a build option; "DCC via reseller" is.

---

## 4. Normalised internal model

Storage separates the domains so that different adapters can populate different parts of the same logical meter without collision.

```
Account
 ├─ id, provider_type, display_name
 ├─ (Class A only) balance, billing info
 └─ Properties[]
     └─ MeterPoints[]
         ├─ mpxn (MPAN electricity / MPRN gas)
         ├─ fuel_type (electricity | gas)
         ├─ ConsumptionSeries[]         ← half-hourly kWh (+ m³ for gas)
         │    └─ {interval_start, interval_end, value, unit, source_adapter, ingested_at}
         ├─ DemandSeries[]              ← real-time W/kW (Glow local, Home Mini only)
         ├─ TariffAgreements[]
         │    └─ {valid_from, valid_to, unit_rates[], standing_charge, source_adapter}
         └─ freshness                   ← per-domain last-success timestamps
```

Key rules:
- **`source_adapter` is stamped on every record.** Provenance is first-class — needed for merge, debugging, and the freshness/health surface.
- **Consumption and tariff are independently sourced.** A non-Kraken user gets consumption from Glow/Hildebrand and tariff from Hildebrand cloud, a manual static rate, or the Octopus public product API (unauthenticated, lists the whole market's tariffs — usable as a generic reference).
- **`freshness` is tracked per domain per meter**, not globally — because a user may have live consumption but stale tariff, and the UI must reflect that.

---

## 5. Adapter interface (capability-declaring)

Every adapter implements a common interface and **declares its capabilities**; the normaliser never assumes parity.

```
interface Adapter {
  // Static declaration — read by the normaliser to route data
  capabilities(): {
    domains:      Set<"consumption"|"tariff"|"standing"|"account"|"export">
    temporality:  Set<"live"|"backfill">
    latency:      "realtime" | "near_realtime" | "next_day"
    locality:     "local" | "cloud"
    transport:    "push" | "pull"
    coverage:     "single_supplier" | "supplier_agnostic"
    requiresHardware: boolean
  }

  authenticate(config): Session
  discoverMeterPoints(session): MeterPoint[]

  // Implemented only if declared in capabilities.temporality
  fetchLive?(session, meterPoint): Reading[]          // pull adapters
  subscribeLive?(session, meterPoint, onReading): Sub  // push adapters (Glow MQTT)
  fetchBackfill?(session, meterPoint, range): Reading[] // n3rgy history

  health(session): { domain: string, lastSuccess: timestamp, status }[]
}
```

Notes:
- **Push vs pull is just two methods** (`subscribeLive` / `fetchLive`) — transport is abstracted, so Glow local is not "special," merely push-based.
- Adapters implement only the methods their capabilities declare. n3rgy implements `fetchBackfill`; Glow local implements `subscribeLive`; Kraken implements `fetchLive` across all four domains.
- **`health()` is mandatory** — this is the countermeasure to the "silent stall" failure class documented in the incumbent map.

---

## 6. The normaliser: composition rules

When multiple adapters cover the same meter/domain, the normaliser merges deterministically:

1. **Domain routing.** Each adapter may only write domains it declares. A consumption-only adapter (Glow local) can never overwrite tariff.
2. **Consumption precedence** (when two adapters both provide consumption for the same interval): prefer **local > cloud**, then **real-time > near-real-time > next-day**. So Glow local wins over Hildebrand cloud for overlapping intervals; Hildebrand cloud fills gaps Glow misses (e.g. before the CAD was installed).
3. **Backfill never overwrites live.** `fetchBackfill` only fills intervals with no existing live record — n3rgy history populates the past without clobbering today's Glow data.
4. **Tariff precedence:** supplier (Kraken) > DCC-reseller (Hildebrand) > public product API > manual static rate.
5. **Provenance preserved on merge** — the surviving record keeps its `source_adapter`; conflicts are logged, not silently dropped.

Result: a user running **Glow local + n3rgy history + Kraken billing** gets one continuous consumption series (Glow live, n3rgy past), rich tariff/account from Kraken, and no source stepping on another.

---

## 7. Failure handling — designing against the "silent stall"

The incumbent's #1 user pain is data silently stopping (token expiry, upstream DCC outage). This architecture treats freshness as a feature:

- **Per-domain freshness sensors** exposed to the user (`last successful consumption update`, `last tariff refresh`) per meter and per adapter.
- **Token-refresh robustness** in cloud adapters (Hildebrand Bright and Kraken both use expiring tokens; the Hildebrand DCC token expiry is a known silent-stall cause).
- **Upstream-outage awareness.** Hildebrand cloud, n3rgy, Hugo and Loop all share the DCC as a single point of failure — multi-week simultaneous outages have occurred (2024 Aclara/WNC fault). No design prevents this, so the app must *detect staleness and surface it* rather than present stale data as current. **Glow local is the mitigation:** being local + push, it is immune to DCC-network and token failures, which is a further reason it is first-class.
- **Conservative polling by default.** Kraken tenants are polling-sensitive (Octopus reports ~95% of its API traffic comes from the community integration); Hildebrand enforces a 5-minute floor. Adapters must respect per-source minimum intervals and back off on failure.

---

## 8. Provider coverage summary

| Market segment (~share) | Class A (supplier API) | Class B (DCC reseller) | Real-time option |
|---|---|---|---|
| Octopus (~25%) | ✅ Kraken (rich) | ✅ available | Home Mini / Glow local |
| E.ON Next (~14%) | ✅ Kraken | ✅ available | Glow local |
| EDF (~10%) | ✅ Kraken (UK verify) | ✅ available | Glow local |
| Good Energy (small) | ✅ Kraken | ✅ available | Glow local |
| **British Gas (~20%)** | ❌ no usable API | ✅ Hildebrand/n3rgy | Glow local |
| **OVO (~12%)** | ⚠️ third-party, unreliable | ✅ Hildebrand/n3rgy | Glow local |
| **ScottishPower (~8%)** | ❌ no usable API | ✅ Hildebrand/n3rgy | Glow local |

**Positioning:** Class A (Kraken) delivers the rich experience for ~49% of the market; Class B (DCC resellers) delivers universal consumption for the ~40% behind no supplier API; Glow local delivers best-in-class real-time to anyone regardless of supplier. No existing integration unifies all three — that composition is the differentiator.

---

## 9. Build order

1. **Normalised model + adapter interface + normaliser composition engine** (the spine; provider-agnostic).
2. **Hildebrand cloud (Bright) adapter** — widest reach, hardware-free, consumption + tariff; validates Class B end-to-end and is the abandoned-incumbent gap.
3. **Kraken adapter** (Octopus first, then E.ON Next) — validates Class A and the multi-tenant config pattern.
4. **Glow local MQTT adapter** — proves the push transport and delivers the standout real-time local feed.
5. **n3rgy backfill adapter** — one-shot history import; proves backfill composition.
6. **Freshness/health surface** across all adapters.
