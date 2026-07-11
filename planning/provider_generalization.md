# Generalising the app across energy providers

Date: 2026-07-09
Status: Evaluation / architecture proposal (no code changes). Targets a 2.0
milestone (redesigned dashboard + multi-provider framework).
Scope: Assess whether the E.ON Next integration + redesigned dashboard (PR #80,
branch `claude/eon-next-dashboard-redesign-h2fogg`) can be generalised into a
reusable, multi-provider framework with one shared design, and describe the
pattern to get there.

---

## TL;DR

**Yes, and the app is already ~80% of the way there.** The single most
important fact is that the backend is not an "E.ON API client" - it is a
**Kraken platform client**. E.ON Next, Octopus Energy, So Energy, Good Energy
and a long list of other suppliers all run the *same* Kraken GraphQL + REST
API. Our auth mutation (`obtainKrakenToken`), every GraphQL query, and the REST
consumption endpoints are the standard Kraken contract - they would work against
another Kraken tenant unchanged. **The only functional value that is
E.ON-specific is one base URL.**

Everything else that ties us to E.ON is either (a) branding/namespacing
(`eon_next` domain, "E.ON Next" strings, warm-cream theme tokens) or (b) UK
market assumptions shared with all UK Kraken suppliers (MPAN/MPRN, pence→GBP,
gas m³→kWh). None of it is deep coupling.

The recommended shape is a **provider-descriptor + registry pattern** on the
backend feeding a **normalised WebSocket data contract** that the frontend
already consumes, plus a **theme/branding layer** on the frontend so the exact
same UI reskins per provider. The normalised contract (`DashboardSummary` /
`MeterSummary`) already exists and carries no E.ON-specific fields - it is the
natural "port" every provider adapter targets.

Two viable architectures are described below; the recommended one is a **single
multi-provider integration** with a provider-selection step in the config flow -
crucially, **the HA `domain` stays `eon_next` and is never renamed** (§4), so
existing users carry over with zero migration and zero lost history. This lands
naturally as a **2.0 release** (§4a): a major *milestone*, but additive rather
than breaking.

---

## 1. Why this is feasible: the Kraken insight

| Layer | What it actually talks to | Provider-specific? |
| --- | --- | --- |
| Auth | `obtainKrakenToken` / `refreshToken` GraphQL mutations, `authorization: JWT` header | No - standard Kraken |
| Account/meter discovery | `viewer.accounts`, `properties{electricityMeterPoints{mpan}, gasMeterPoints{mprn}}` | No - standard Kraken (UK identifiers) |
| Consumption | REST `/v1/electricity-meter-points/{mpan}/meters/{serial}/consumption/` | No - standard Kraken REST |
| Tariff/agreements | `getAccountAgreements` → `TariffType`/`StandardTariff`/`HalfHourlyTariff` | No - standard Kraken schema |
| EV / SmartFlex | `getAccountDevices`, `flexPlannedDispatches` | No - standard Kraken SmartFlex |
| **Base URL** | `https://api.eonnext-kraken.energy/v1` (`const.py:38`) | **Yes - the one value that changes** |

Octopus's public API is `https://api.octopus.energy/v1` with the identical
schema. So the client is already a generic Kraken client wearing an `EonNext`
name.

**Caveat (honest scoping):** "many energy providers" splits into two tiers.

- **Kraken suppliers** (E.ON Next, Octopus, So Energy, Good Energy, Rebel,
  Ostrom (DE), etc.): supported by *config only* - a base URL + branding. This
  is the high-value, low-effort win.
- **Non-Kraken suppliers** (British Gas/Hive, OVO, EDF, most non-UK utilities):
  require a *new adapter* implementing the same normalised contract. The
  framework should make this possible, but each one is real work (different
  auth, different data model). Generalising the architecture is what unlocks
  them; it does not make them free.

---

## 2. Current coupling map

### Backend (`custom_components/eon_next/`)

**Already generic (reusable as-is):**
- GraphQL/REST transport, token lifecycle, 401 retry - `eonnext.py:258-469`
- All GraphQL queries + REST endpoints (standard Kraken)
- Statistics import, resumable backfill, cost tracker, TOU rate resolution
- WebSocket response schemas (`schemas.py`) - generic energy fields only

**Hardcoded to E.ON:**
- `API_BASE_URL` host - `const.py:38` *(the only functional one)*
- `KNOWN_TARIFF_PATTERNS` product prefixes `NEXT-DRIVE`, `NEXT-PUMPED` -
  `tariff_patterns.py:29-43` (a fallback registry for off-peak windows when the
  API schedule omits them; Octopus would need `GO`, `INTELLI`, `COSY`, …)
- Domain/branding `eon_next` / "E.ON Next" - `const.py`, `manifest.json`,
  `strings.json`, translations
- Config flow assumes the single E.ON client - `config_flow.py:59-64`

**Hardcoded to the UK market (shared with all UK Kraken suppliers, not just E.ON):**
- MPAN/MPRN supply-point IDs, electricity/gas-only model - `eonnext.py:59-110`
- Pence→GBP - `coordinator.py:453`, `tariff_helpers.py:43`
- Gas m³→kWh with UK calorific constants - `const.py:39-40`, `eonnext.py:1065`
- Half-hourly settlement assumptions (44-entry threshold, DST slots) -
  `coordinator.py:132,411`

### Frontend (`frontend/src/`)

**Already generic / reskinnable:**
- Design tokens as CSS custom properties in one file - `styles/dashboard-tokens.css:27-79`
- `WsDataController`, `stacked-bar-chart`, `halfhour-strip` - fully provider-agnostic
- The normalised `DashboardSummary`/`MeterSummary` WS model - generic fields
- Entity lookups centralised in `utils/dashboard-data.ts`, keyed off meter
  serials (not the `eon_next` domain prefix)
- `FUEL` descriptor centralises per-fuel presentation - `utils/dashboard-data.ts:53-76`

**Hardcoded to E.ON:**
- Brand name/sub, inline SVG logo, Google-Fonts URL - `panel.ts:29-31,138-149`
- `--eon-*` token names across all CSS
- WS command domain `eon_next/` - codegen + literals in `api.ts:40,53`
- Two-fuel assumption: `FuelKind = 'electricity' | 'gas'` and the fixed
  elec/gas layouts in overview & tariff pages
- **Path-B entity vocabulary** (`_unit_rate`, `_off_peak`, `current_day_rates`,
  `is_off_peak`, `tariff_valid_from`, `_account_balance`) - richer tariff detail
  the WS API doesn't carry is read straight from HA entity attributes
- GBP currency + `kWh`/`m³`/`p` literals in all formatters and page copy -
  `dashboard-data.ts:229-245`

---

## 3. The framework pattern

The core idea: **define one normalised energy-domain contract, make every
provider an adapter that fills it, and make branding/theming pure data.**
Components and pages depend only on the contract and the theme, never on a
provider.

```
                 ┌─────────────────────────────────────────────┐
                 │   Normalised contract (the "port")           │
                 │   DashboardSummary / MeterSummary /          │
                 │   ConsumptionHistory / Tariff / EvSchedule   │
                 └─────────────────────────────────────────────┘
                     ▲                                   │
   fills the contract│                                   │consumed by
                     │                                   ▼
 ┌───────────────────┴───────────┐        ┌──────────────────────────────┐
 │  ProviderAdapter (backend)    │        │  Dashboard app (frontend)     │
 │  ├─ KrakenAdapter (base URL)  │        │  reskinned by a ThemeConfig   │
 │  │   ├─ EON Next descriptor   │        │  + BrandConfig, one fuels     │
 │  │   ├─ Octopus descriptor    │        │  registry, currency/unit layer│
 │  │   └─ So Energy descriptor  │        └──────────────────────────────┘
 │  └─ (future) OvoAdapter, …    │
 └───────────────────────────────┘
```

### 3a. Backend: provider descriptor + registry

Introduce a small, declarative descriptor and a registry keyed by provider id:

```python
@dataclass(frozen=True, slots=True)
class ProviderDescriptor:
    id: str                      # "eon_next", "octopus", …
    display_name: str            # "E.ON Next"
    platform: str                # "kraken"
    base_url: str                # the one functional value today
    currency: str                # "GBP"
    tariff_patterns: TariffPatternRegistry   # replaces the module-level dict
    # market/locale knobs (all default to UK today):
    supply_point_fields: tuple[str, str] = ("mpan", "mprn")
    gas_conversion: GasConversion = UK_GAS_CONVERSION
    minor_unit_scale: int = 100  # pence→pounds

PROVIDERS: dict[str, ProviderDescriptor] = {...}
```

Then:
- Rename the monolithic `EonNext` client to a generic `KrakenClient` that takes
  a `ProviderDescriptor` (its queries are already provider-neutral). `EonNext`
  becomes a thin alias/descriptor for backward compatibility.
- `tariff_patterns.KNOWN_TARIFF_PATTERNS` moves onto the descriptor so
  `NEXT-DRIVE`/`NEXT-PUMPED` are E.ON's, and Octopus's `GO`/`INTELLI` are
  Octopus's.
- `_pence_to_pounds`, the gas constants and the mpan/mprn field names read from
  the descriptor instead of module constants.

This is a **strategy/registry pattern**: one code path, provider-specific data
injected. `ProviderAdapter` stays an interface so a non-Kraken supplier can be a
sibling of `KrakenClient` that fills the same contract with entirely different
plumbing.

### 3b. The normalised contract is the pivot (and already exists)

`schemas.py` already declares provider-neutral shapes (`MeterSummary`:
`serial, type, unit_rate, standing_charge, daily_consumption, tariff_name,
latest_reading`) and is the single source of truth that generates
`frontend/src/api.generated.ts`. **This is the contract every adapter targets
and every component consumes.** The work here is *additive*: fold the data the
frontend currently scrapes from HA entity attributes (Path B) into the WS model
(§3d) so the contract is complete.

### 3c. Frontend: theme + brand as data, one shared UI

The design stays identical across providers because the UI is already token- and
descriptor-driven. Generalise the three hardcoded spots:

1. **BrandConfig** (name, sub-text, logo asset, font stack, token overrides)
   injected at panel level, replacing `panel.ts:29-31,138-149`. Keep the
   `--eon-*` custom properties as the *neutral* variable namespace (rename to
   `--nrg-*`/`--app-*` in one sweep if desired) and let a provider ship an
   override block. Because every component imports `dashboard-tokens.css` first,
   overriding ~50 variables reskins the whole app - the layout, spacing and
   component structure are untouched, so "same look regardless of provider" is
   satisfied by construction.
2. **Fuels registry**: generalise `FUEL`/`FuelKind` (`dashboard-data.ts:19,
   53-76`) from a fixed elec+gas map to an N-fuel registry, and make the
   overview/tariff pages iterate it instead of hardcoding two columns. Covers
   electricity-only suppliers and future fuels.
3. **Currency/unit layer**: replace the `£`/`p`/`kWh` literals
   (`dashboard-data.ts:229-245`) with an `Intl.NumberFormat`-based helper keyed
   off the descriptor's `currency` - important once a non-GBP (e.g. Ostrom DE)
   provider appears.

### 3d. Close the Path-B leak

The frontend reaches into raw HA entity attributes for richer tariff detail
(previous/next rates, today's rate shape, off-peak windows, account balance) -
keyed on suffix/attribute conventions (`_unit_rate`, `is_off_peak`,
`current_day_rates`, `tariff_valid_from`, `_account_balance`). Those conventions
are *this integration's* entity naming; a different adapter would expose
different names and the lookups would silently return null.

**Fix:** promote that data into the WS `DashboardSummary` model so components
depend on the contract, not on entity naming. This both decouples the frontend
from any single provider and removes the fragile per-render entity scanning.

---

## 4. The Home Assistant domain question - don't rename the domain

This is the one genuinely structural decision, and the answer is
counter-intuitive: **keep the existing `eon_next` domain frozen and never
rename it.** The domain is an internal slug, not user-facing branding, and
renaming it is a hard breaking migration with no first-class support in HA.

### Why a domain rename is the thing to avoid

HA ties three things to the integration `domain`, and none migrate cleanly
across a rename:

1. **Config entries.** HA's `async_migrate_entry` only migrates an entry's
   *format/version within the same domain*. There is no supported path to move
   config entries to a *different* domain - users would have to delete and
   re-add the integration.
2. **Entity registry.** Entities are keyed by `(platform=domain, unique_id)`. A
   new domain means new registry rows and new `entity_id`s by default, so every
   history/automation reference detaches unless each id is hand-preserved.
   (CLAUDE.md / `docs/ai/conventions.md` already make `unique_id` stability
   non-negotiable.)
3. **Long-term statistics.** External statistic ids are literally
   `eon_next:<name>` (`statistics.py:59`). Renaming an *entity_id* auto-updates
   its statistic id (and even that has known bugs that orphan LTS); changing the
   *domain* is not handled at all. Recovery is manual recorder-API / SQL surgery,
   not a migration users should ever run.

The WS command namespace (`eon_next/*`) and panel URL are also domain-derived,
but those are cosmetic and internal.

### The move: freeze the slug, rebrand around it

Users never really see the domain - it only appears buried inside `entity_id`s.
What they see is `manifest.json`'s `"name"`, the config-entry title, and the
panel branding. So:

- Keep the domain `eon_next` forever (or accept it as an opaque id).
- Change the **display name / config-entry title / panel branding** per provider
  and add the **provider-selection step** to the config flow (§3a).
- **Existing E.ON users: zero disruption** - no migration, no lost statistics,
  no re-onboarding.
- **New Octopus (etc.) users:** pick their provider at setup; their
  entities/stats sit under the `eon_next` slug internally but read as their
  provider everywhere in the UI.

The only cost is a cosmetically legacy domain string - extremely common in HA,
where many integrations kept their original slug through rebrands. It is a wart,
not a problem.

### Two architectures (and the repo/HACS implication)

**Option A - one multi-provider integration (recommended).**
Single frozen HA `domain`, provider-selection step in the config flow picks the
descriptor → base URL/branding. One codebase, one repo, one HACS entry, one
panel that reskins per config entry.
- Pros: least code; shared bug-fixes; users can run E.ON + Octopus side by side
  as two config entries; the normalised contract does all the work; **no new
  repo and no migration** - existing users are untouched.
- Cons: the domain slug no longer matches the brand (cosmetic only).

**Option B - shared library + thin per-provider integrations.**
Extract the Kraken client + contract + dashboard into an installable package;
ship `eon_next`, `octopus_kraken`, … as slim integrations, each pinning a
descriptor and its own domain.
- Pros: each brand keeps its own domain/HACS listing/identity; cleanest per-brand
  statistics namespacing.
- Cons: much heavier. **HACS distributes one integration per repository**, so
  this means either N separate repos or a monorepo publishing a shared library to
  PyPI plus N thin integration repos - N HACS listings, N release trains, and the
  frontend bundle shared or duplicated. And a brand-new domain still can't adopt
  existing E.ON users without the breaking migration above.

**"Fresh repo for a new integration?"** Only under Option B. Option A is *not* a
new integration - it stays this repo, this domain. A fresh repo/domain is only
worth it if a clean per-brand identity ever becomes a hard product requirement,
and even then it should ship as an opt-in "start fresh" install *alongside* the
legacy integration, never as a forced switch.

Recommendation: **Option A.** It delivers "reusable for many providers" with the
least surface area and keeps every existing user with zero history loss.

---

## 4a. Release framing: this is the 2.0

The redesigned dashboard (PR #80) plus the multi-provider framework is a natural
**2.0 milestone** - a major visual + capability leap. One nuance to plan for:

- **SemVer vs. milestone.** If we follow Option A and keep the domain frozen,
  the changes are *additive and non-breaking* for existing users (new provider
  support, a rebuilt UI). Under Conventional Commits / release-please that
  computes to a **minor** bump, not a major. There is no actual breaking change
  to justify `2.0.0` semantically.
- **Publishing it as 2.0 anyway.** A "2.0" here is a product/marketing milestone,
  which is legitimate for a redesign of this scale. To land it, use release-please's
  `Release-As: 2.0.0` commit footer on the release-triggering commit rather than
  fabricating a `BREAKING CHANGE:` - keep the changelog honest about what did and
  didn't break.
- **If any genuine break sneaks in** (e.g. a `unique_id` change, an entity rename,
  a dropped service), that *does* warrant a real major and **must** carry a
  migration plan + release note per the guardrails. The whole point of Option A is
  to avoid needing one.
- **Metadata lockstep still applies:** `manifest.json` version == top
  `CHANGELOG.md` version == `.release-please-manifest.json`, enforced by CI.

Practically: sequence the phased roadmap (§5) as the 2.0 line, ship phases 1-4
behind the frozen domain, and cut `2.0.0` when the first second provider (phase 5)
proves the framework end-to-end.

---

## 5. Phased roadmap

Each phase is independently shippable and preserves current behaviour.

1. **Extract the provider descriptor (backend, no behaviour change).**
   Move `base_url`, tariff patterns, currency, gas constants and mpan/mprn
   fields onto a `ProviderDescriptor`; register E.ON as the sole provider;
   rename `EonNext` → `KrakenClient` with an `EonNext` shim. Pure refactor,
   fully covered by existing tests.

2. **Complete the normalised contract (backend + codegen).**
   Add previous/next rates, today's rate shape, off-peak windows and account
   balance to `schemas.py`/`DashboardSummary`; regenerate `api.generated.ts`.

3. **Decouple the frontend (frontend, no visual change).**
   Introduce `BrandConfig` + theme-override mechanism, the N-fuel registry and
   the currency/unit layer; switch pages to consume the completed contract
   instead of Path-B entity scraping. Screenshots must be pixel-identical.

4. **Add provider selection (config flow).**
   Provider dropdown → descriptor. E.ON stays the default; unique-ids and
   statistic ids unchanged for existing users.

5. **Onboard a second Kraken provider (proof).**
   Add an Octopus descriptor (base URL + branding + tariff patterns). This is
   the milestone that proves the framework - ideally little more than config.

6. **(Optional) Non-Kraken adapter.**
   Implement one non-Kraken supplier against the contract to validate that the
   adapter seam is real, not just a Kraken-shaped hole.

---

## 6. Risks & non-negotiables

- **Entity/`unique_id` and statistic-id stability** (`docs/ai/conventions.md`,
  CLAUDE.md guardrails). Any generalisation must not silently change existing
  E.ON users' `unique_id`s or statistic ids - that breaks history and the Energy
  Dashboard. Keep the domain and id scheme stable in Option A; if a rename is
  ever required, it needs an explicit migration + release note.
- **Release-metadata lockstep** (manifest/CHANGELOG/release-please) is enforced
  by CI - refactors must respect it.
- **Two UI surfaces exist:** the new multi-page panel *and* the older Lovelace
  `cards/`. Both hardcode currency/units. Decide whether to generalise both or
  formally freeze the cards.
- **Provider ToS / API access.** Octopus's API is public; other Kraken tenants
  may not welcome third-party clients. Confirm before advertising support.
- **Scope honesty.** "Many providers" = cheap for Kraken suppliers (config),
  real work per non-Kraken supplier (a new adapter). Set expectations
  accordingly.

---

## 7. Effort estimate (rough)

| Phase | Effort | Risk |
| --- | --- | --- |
| 1 Provider descriptor | S-M | Low (pure refactor, tested) |
| 2 Complete contract | M | Low-Med |
| 3 Frontend decouple + theme | M | Med (must stay pixel-identical) |
| 4 Config-flow provider select | S | Low |
| 5 Second Kraken provider | S | Low (validates the design) |
| 6 Non-Kraken adapter | L (per provider) | High |

Phases 1-5 turn this into a genuine multi-Kraken-provider app with a single
shared, reskinnable design, at modest, low-risk effort - because the hard part
(a Kraken client and a normalised, provider-neutral data contract) is already
built.
