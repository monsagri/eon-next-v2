# Greenfield Build Plan — Normalised Multi-Source Energy Integration

Date: 2026-07-11
Status: **Decisions locked** (except where marked open). Successor to
[`adapter_normaliser_architecture.md`](./adapter_normaliser_architecture.md);
that document remains the reference for the capability grid, source catalogue
and market analysis — this one supersedes its build order and its
same-repo/frozen-domain assumptions.

This plan targets a **fresh repository and a fresh Home Assistant domain**. The
`eon-next-v2` branch stack (dashboard redesign + provider-generalisation
Phases 1-6 + the planning docs) is the jumping-off point: it is ported into the
new repo as reference material, and `eon-next-v2` itself goes into
bug-fix-only maintenance. Nothing from the multi-provider phases ships on the
legacy `eon_next` domain.

---

## 1. Decisions ledger

Locked decisions, with the reasoning that locked them. Anything not listed
here is open (§10).

| # | Decision | Rationale |
| --- | --- | --- |
| D1 | **Fresh repo + fresh HA domain**; public + HACS-default listing at release; private until then | A fresh domain removes every legacy constraint (statistic-id prefix, WS namespace, `eon-*`/`--eon-*` naming, back-compat shims) at the only moment it is ever cheap. Legacy users are served by the migration tool (D9). |
| D2 | **The composition engine is committed scope**, not demand-gated | Future-proofing from the start; the engine ships in 1.0 even while only one adapter exists. Individual *adapters* beyond Kraken remain demand-gated. |
| D3 | **Identity is keyed by supply point, not meter serial** | Serials change on meter swap and are unknown to Class-B sources; the supply-point id survives both. See §4. |
| D4 | **Generic `supply_point_id`, with MPxN as the UK value** | MPAN/MPRN are UK constructs; non-UK Kraken tenants (e.g. OEFR/France, PDL/PRM ids) must not break the identity scheme — the one thing frozen at first release. |
| D5 | **One typed model** — the normalised store is typed dataclasses; entities, the WS contract, and the statistics import are projections of it; the frontend types are code-generated from it | Kills the current three-shape drift (coordinator dict → schemas → WS translation). One source of truth, three consumers. |
| D6 | **HA-agnostic core** — the model, adapter protocol, composition engine and freshness logic are a pure-Python layer with no `homeassistant` imports; the HA integration is a shell around it | Testability (the engine is tested with plain fixtures, no HA harness), clean seams, and the engine stays portable to other consumers. |
| D7 | **Household store owns merged entities; config entries own only per-source diagnostics** | Resolves multi-entry entity ownership before it can produce duplicates. Device registry identifier `(DOMAIN, supply_point_id)` merges devices across entries natively. |
| D8 | **Port all the mature machinery** — statistics import (append-only live + splice-and-recompute historical), backfill manager, cost tracker, tariff helpers, TS codegen, CI/release tooling | These are the battle-tested, already source-agnostic ~40% of the backend. Rebuild the skeleton, keep the organs. |
| D9 | **Legacy migration tool: statistics history only, late phase** | Reads legacy `eon_next:*` external statistics via recorder, maps serial→supply point (the Kraken adapter knows both), re-imports through the statistics gate. Explicitly **not a design constraint** during the build — it is bolted on at the end, not designed around. No cost-tracker or options migration. |
| D10 | **Property grouping is in the model from day one** | Standard usage is a single household, but Kraken accounts can span properties and Class B adds arbitrary meters. Cheap in greenfield, expensive to retrofit. The frontend may render a single household at launch. |
| D11 | **Panel only at launch; Lovelace cards fully deferred** | The six cards are a second contract to port and rename; they return (or don't) on demand after release. |
| D12 | **Currency plumbing is wired end-to-end; GBP is the only launch currency** | `currency`/`minor_unit_scale` flow descriptor → model → `Intl.NumberFormat` on the frontend from the first commit (no dead declarative fields this time). Non-GBP tenants are config later, not surgery. |
| D13 | **Devices/dispatches are first-class capability domains** | EV/SmartFlex stops being a Kraken special case; capability gating covers it like everything else. See §5 for the provisional domain split. |
| D14 | **Naming is deferred** — domain slug, repo name, brand are chosen once everything else is locked | It is the gate for Phase 0 (§9): the slug lands in every unique id, statistic id and WS command, forever. |

Non-goals carried over unchanged from the predecessor plan: no DCC-direct
access (resellers only), no Octopus-proprietary features (Intelligent
dispatches, Saving Sessions, Octoplus, Home Mini/Pro, etc.).

---

## 2. Layered architecture

Three layers with one-way dependencies. The core knows nothing about Home
Assistant; the HA shell knows nothing about rendering; the frontend consumes
only the generated contract.

```
┌────────────────────────────────────────────────────────────────────┐
│ CORE (pure Python, no homeassistant imports)                       │
│                                                                    │
│  model.py        typed normalised model (§5) — the single model    │
│  adapter.py      Adapter protocol + Capabilities (§6)              │
│  composition.py  HouseholdSnapshot merge + precedence policy (§7)  │
│  freshness.py    per-(supply_point, domain, source) health records │
│  stats_plan.py   pure "import plan" computation for statistics     │
│  conformance/    shared adapter conformance test kit (§6)          │
├────────────────────────────────────────────────────────────────────┤
│ HA SHELL (the custom component)                                    │
│                                                                    │
│  per-source config entries → adapters + IO drivers                 │
│    (DataUpdateCoordinator for pull, MQTT subscription for push)    │
│  household store  (listenable; runs the core composition)          │
│  entities         merged entities read the store;                  │
│                   per-entry diagnostics read their source          │
│  statistics gate  executes core import plans against recorder      │
│  websocket API    projects the store into the generated contract   │
│  config flow / repairs / services / panel registration             │
├────────────────────────────────────────────────────────────────────┤
│ FRONTEND (Lit + TS panel)                                          │
│  api.generated.ts ← codegen from the core model's WS projection    │
└────────────────────────────────────────────────────────────────────┘
```

Notes:

- **IO lives in the shell, never in the core.** Adapters declare capabilities
  and produce provenance-stamped records; the shell schedules them (poll
  intervals, backoff, MQTT lifecycle) and feeds records into the store.
- **The composition engine is pure**: records in → merged view out. All
  composition tests run without an HA test harness, against synthetic
  multi-source fixtures.
- **Statistics split**: the core computes *what* to write (an import plan with
  precedence/dedupe applied, keyed by `(statistic_id, hour)`); the shell's
  gate is the **single writer** that executes plans against the recorder.
  The ported splice-and-recompute machinery lives in the gate.

---

## 3. What ports, what is rebuilt

| From `eon-next-v2` | Disposition |
| --- | --- |
| `statistics.py` (append-only live path, splice-and-recompute historical path, `StatisticsLookupError` discipline) | **Port** into the statistics gate; re-key ids per §4 |
| `backfill.py` (resumable cursor, per-run budget, extend/shrink semantics) | **Port**; writes go through the gate |
| `cost_tracker.py` + `services.py` | **Port** (already source-agnostic) |
| `tariff_helpers.py` / `tariff_patterns.py` | **Port** into the core (operate on normalised tariff records) |
| `scripts/generate_ts_api.py` codegen + `test_frontend.py` contract tests | **Port**; source becomes the core model's WS projection |
| CI, release-please, metadata lockstep, hassfest/HACS actions, commitlint | **Port** wholesale |
| Frontend `src/` (panel, pages, components, WsDataController) | **Port with renames**: neutral element prefix, neutral CSS token namespace, new WS namespace, `BrandConfig` kept; cards excluded (D11) |
| `eonnext.py` (`KrakenClient`) | **Rebuild as the Kraken adapter** behind the protocol; transport/auth/queries carry over nearly verbatim |
| `coordinator.py` | **Dissolved**: fetching moves to per-source IO drivers; assembly/merge/derivation moves to the core composition engine |
| `schemas.py` | **Dissolved** into the core model + its WS projection |
| `providers.py` (`ProviderDescriptor`) | **Port** as the Kraken adapter's per-tenant config; dead fields (`currency`, `minor_unit_scale`, supply-point field names) become live per D12/D4 |
| Legacy back-compat (`EonNext` shim, bare-email unique ids, `get_provider(None)` default) | **Dropped** — no legacy users on the new domain |

---

## 4. Identity scheme

Frozen at first release; everything below is deliberate.

- **`supply_point_id`** — opaque string, market-qualified; the cross-adapter
  join key. UK: MPAN (electricity) / MPRN (gas). Other markets supply their
  own (e.g. PDL/PRM). Sanitised to `[a-z0-9_]` where embedded in ids.
- **Statistic ids**: `<domain>:<fuel>_<supply_point_id>_<direction>_consumption`
  with `direction ∈ {import, export}` explicit (no inference from register
  names). Exact shape finalised in Phase 1; the invariants are: keyed by
  supply point (not serial), direction explicit, fuel explicit.
- **Entity unique ids**: `<supply_point_id>__<direction>__<suffix>`. The meter
  serial is an attribute, not a key — meter replacement no longer orphans
  history (worth a release note at launch).
- **Device registry**: identifier `(DOMAIN, supply_point_id)` so a meter fed
  by multiple config entries is one device in HA.
- **Non-meter key spaces** stay separate: accounts (`account_number`),
  EV/smart devices (`device_id`), cost trackers (`cost_tracker__<entry>__<id>`),
  per-entry diagnostics (`<entry_id>__…`).
- **Unlinked state is first-class**: a source that cannot resolve its supply
  point (some Class-B setups) carries `unlinked` status in the model and is
  excluded from merge until linked. The linking UX itself is an open question
  (§10) — the model just has to be able to represent it from day one.

---

## 5. The normalised model (the single typed model, D5)

```
Household
 └─ Properties[]                                (D10 — usually exactly one)
     ├─ Accounts[]        {account_number, provider, balance?, billing?, source}
     └─ SupplyPoints[]
         ├─ supply_point_id, fuel (electricity|gas), direction(s)
         ├─ meters[]              {serial, active_from/to}   ← attribute, not key
         ├─ consumption           interval energy records
         ├─ demand                instantaneous power (real-time sources only)
         ├─ tariff                agreements: validity, unit rates, TOU schedule
         ├─ standing_charge
         ├─ devices               supplier-connected hardware inventory/state
         ├─ dispatches            planned schedules (EV charge slots, …)
         └─ freshness             per (domain, source): last_success,
                                  last_attempt, status, consecutive_failures
```

Every record carries `source` (adapter instance id) and `ingested_at` —
provenance is first-class, as in the predecessor plan.

**Capability domains** (provisional split — see open question Q3):

| Domain | Notes |
| --- | --- |
| `consumption` | interval energy (kWh, m³) |
| `demand` | instantaneous power; split from consumption because sources, latency and consumers all differ (Glow real-time vs half-hourly intervals; never enters statistics) |
| `tariff` | agreements, unit rates, TOU schedules |
| `standing_charge` | separate because Class-B sources may carry rates but not standing charges (or vice versa) |
| `account` | balance, billing — Class A only |
| `devices` | supplier-connected hardware inventory/state (D13) |
| `dispatches` | time-windowed planned schedules; split from `devices` because the freshness cadence and consumers differ (a device is durable; a dispatch schedule churns daily) |

`export` is a **direction**, not a domain: export consumption/tariff records
are ordinary records with `direction=export`.

The WS contract is a projection of this model and adds per-supply-point
`sources[]` (adapter, domains, freshness status) — the real data behind the
frontend's currently-hardcoded "meter health" tile — plus per-account and
per-property grouping. `DashboardSummary`'s flat meter list and single summed
balance do not survive the port.

---

## 6. Adapter protocol + conformance kit

The protocol is the predecessor plan's (§3.2 there): static `capabilities()`,
`authenticate`, `discover_supply_points`, then only the methods the declared
capabilities require (`fetch_live` / `subscribe_live` / `fetch_backfill`), and
a **mandatory `health()`**.

New, and non-negotiable this time: a **shared conformance test kit** in the
core that every adapter — including Kraken — must pass:

1. Every method implied by the declared capabilities exists and is callable;
   no method outside the declaration is relied upon.
2. Every produced record is stamped with `source` and `ingested_at`.
3. Records only cover declared domains (the normaliser also enforces this at
   merge time, but the kit catches it at the adapter boundary).
4. `health()` returns a record for every declared domain.
5. Supply-point discovery yields well-formed `supply_point_id`s or an explicit
   `unlinked` result — never a silent empty.

Rationale: the `ProviderDescriptor` on `eon-next-v2` declared `currency`,
`minor_unit_scale` and supply-point field names that no code ever read. A
declaration nothing enforces is how an adapter pattern rots. The kit is the
enforcement.

---

## 7. Composition engine

Carried from the predecessor plan (§3.3 there), with three specifics fixed:

1. **Precedence is data, not code.** A per-domain policy table (ordered
   comparators over the capability axes: consumption = local > cloud, then
   realtime > near-realtime > next-day; tariff = supplier > DCC-reseller >
   public product API > manual) that tests enumerate exhaustively. A new
   source slots into the table without touching merge logic.
2. **Same-source revision is always allowed.** Cloud sources correct their own
   past intervals (estimated → actual readings). "Backfill never overwrites
   live" is a *cross-source-class* rule only; it never blocks a source from
   revising its own records.
3. **Conflict ledger.** A bounded log of overridden records (what, by whom,
   under which rule, when), surfaced as a diagnostic. This is the concrete
   meaning of "conflicts are logged, never silently dropped".

Composition still happens at **two layers** (the predecessor's key insight):
the in-memory `HouseholdSnapshot` for current state, and the statistics import
plan for long-term data — both computed in the core, the latter executed only
by the shell's gate. The statistics layer keeps its own adversarial test suite
(idempotent re-import, no regressive sums, no double counting) as the entry
gate for any second consumption source.

---

## 8. HA shell specifics

- **One config entry per source connection** (unchanged): a Kraken account, a
  Hildebrand account, a Glow MQTT device, an n3rgy connection.
- **Household store**: a listenable object subscribed to by merged entities
  and the WS layer. Pull drivers write on poll; push drivers write per
  message with a debounced recompute. Implemented over HA's coordinator/
  listener primitives, but the merge it triggers is the core engine.
- **Entity ownership (D7)**: merged, user-facing entities (per supply point)
  are created once, from the store, regardless of how many entries feed the
  meter. Config entries create only their own diagnostics (per-source
  freshness/health sensors). First-entry-in bootstraps the shared entities;
  the store keeps them alive across entry reloads.
- **Cross-cutting disciplines** carried over verbatim from the predecessor
  plan §5: tiered per-domain polling with per-adapter minimum intervals,
  exponential backoff to a ~30-minute ceiling, HA Repairs for the known
  failure modes, per-tenant capability gating on the Kraken adapter.
- **Frontend**: panel only (D11). Ported with neutral naming; the one
  remaining entity-attribute scrape (cost-tracker breakdown) moves onto the
  WS contract; `setCurrency` is actually wired (D12); the fixed
  one-elec+one-gas page model generalises to N supply points per fuel.

---

## 9. Phases

Naming (D14) is the entry gate for Phase 0. Each phase is independently
useful; tests, docs and changelog discipline carry over from `eon-next-v2`.

- **Phase 0 — Bootstrap.** New repo seeded with the ported branch stack as
  reference. Port tooling (CI, release-please + metadata lockstep, codegen,
  test harness, hassfest/HACS validation). Finalise every identity string
  (§4) — they are frozen after this.
- **Phase 1 — The core engine (the exercise).** Typed model, adapter
  protocol, conformance kit, composition engine + policy tables, freshness
  records, statistics import-plan computation. Pure Python, test-first,
  synthetic multi-source fixtures (overlap, gap-fill, backfill-vs-live,
  same-source revision, precedence flips, unlinked sources). **No HA code in
  this phase.** Exit: the adversarial composition suite passes; a fake
  two-source household merges deterministically.
- **Phase 2 — Kraken adapter + HA shell + frontend port.** Kraken client
  rebuilt behind the protocol (transport/auth/queries carried over);
  household store; merged entities + per-source diagnostics; statistics gate
  wrapping the ported import machinery; WS projection + regenerated frontend
  under the new namespace. Exit: feature parity with today's panel for a
  Kraken household, on the new identity scheme, with real freshness data
  replacing the hardcoded health tile.
- **Phase 3 — Release hardening + going public.** Repairs, polling scheduler
  + backoff, quality-scale checklist (aim Silver), README/docs. Repo goes
  public; `home-assistant/brands` PR and HACS default-listing PR submitted
  the same day so the review queues overlap stabilisation rather than follow
  it. **1.0 releases here** — one adapter, full engine.
- **Phase 4 — Hildebrand cloud (Bright) adapter.** First genuinely different
  source; exercises real composition. Demand-gated.
- **Phase 5 — Glow local MQTT adapter.** Push transport, local>cloud
  precedence, silent-stall mitigation. Demand-gated (shares the Hildebrand
  account/API relationship with Phase 4).
- **Phase 6 — n3rgy backfill adapter.** Backfill-never-overwrites-live at
  scale. Demand-gated.
- **Late phase — Legacy migration tool (D9).** Statistics-only import from a
  co-installed legacy `eon_next` integration: read old serial-keyed ids,
  map serial→supply point, re-import through the gate. Built entirely on
  existing machinery; scheduled after Phase 3, before or alongside Phase 4,
  and — per D9 — never allowed to shape design decisions before then.

---

## 10. Open questions

| # | Question | State |
| --- | --- | --- |
| Q1 | **Name** (domain slug, repo, brand) | Deferred by decision (D14); revisit once the rest is locked. Gate for Phase 0. |
| Q2 | **Class-B linking UX** — how a Glow/n3rgy entry attaches to a supply point when discovery can't resolve it (config-flow step with fuzzy match vs Repairs-driven "unlinked source" flow) | Open; needs domain knowledge from building Phase 4. The model carries `unlinked` from day one so nothing blocks on this. |
| Q3 | **Domain split granularity** — the §5 split (`demand` from `consumption`; `dispatches` from `devices`) is provisional | Confirm during Phase 1 when the policy tables are written; cheap to adjust before first release, frozen after. |
| Q4 | **Multi-property UI** — model supports it (D10); when/whether the panel renders property switching | Defer until a real multi-property user exists. |
| Q5 | **Non-GBP launch tenants** | No (D12). Revisit if OEFR/EDF-France demand materialises; plumbing is ready. |
| Q6 | **Lovelace cards' return** | Deferred entirely (D11); revisit on demand post-1.0. |
