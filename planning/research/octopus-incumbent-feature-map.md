# Incumbent Feature & Issues Map — `BottlecapDave/HomeAssistant-OctopusEnergy`

**Purpose:** Understand exactly what the dominant Kraken/Octopus integration does, so your generalised multi-provider app can decide what to match, what to skip, and where the incumbent is weak.

**Snapshot:** ~950 GitHub stars, ~100+ forks, one of the most actively maintained energy integrations in the HA ecosystem. Solo-maintained (BottlecapDave, with contributor Sam Reed), funded via GitHub Sponsors + Octopus referral link. HACS *default* repository (not just custom).

**Date compiled:** 11 July 2026

---

## 1. Feature map

### Core (portable — every Kraken tenant should support these)

| Feature | Notes | Portable to other tenants? |
|---------|-------|----------------------------|
| Electricity meter support | Consumption + rate/standing-charge info | ✅ Yes — core Kraken |
| Gas meter support | Consumption + rate info (kWh + m³) | ✅ Yes |
| Current/next rate sensors | Per 30-min slot | ✅ Yes (static tariffs); dynamic only where sold |
| Previous-day consumption import | Backfills Energy Dashboard via `async_import_statistics` | ✅ Yes |
| Cost Tracker sensors | Tracks *any* HA sensor's consumption → daily cost | ✅ Yes — provider-agnostic by design |
| Tariff Comparison sensors | Compares your usage cost against another tariff | ✅ Yes (needs product catalogue API) |
| Energy Dashboard integration | Properly-formed `total_increasing` kWh sensors | ✅ Yes |
| Events + Services + Blueprints | Automation hooks | ✅ Mechanism portable |

### Octopus-specific (NOT portable — do not try to replicate generically)

| Feature | Why it's Octopus-only |
|---------|----------------------|
| **Intelligent tariff** entities/dispatches | Octopus Intelligent product; EV/dispatch scheduling |
| **Saving Sessions / Octoplus** | Octopus loyalty + demand-response programme |
| **Wheel of Fortune** | Octopus monthly customer game |
| **Greenness Forecast / Greener Days** | Octopus-specific grid-greenness product |
| **Heat Pump** (Cosy 6) support | Octopus-sold hardware |
| **Home Mini** (near-real-time) | Octopus-only consumer hardware; live demand sensor |
| **Home Pro** (experimental) | Octopus-only hardware, now discontinued |

> **Design takeaway:** roughly half the incumbent's surface area is Octopus-proprietary. On other tenants these fields simply won't exist. Your capability map should treat the **Core** block as the baseline contract and everything else as tenant-gated extensions.

---

## 2. Architecture observations worth stealing

- **Tiered polling by data type.** Different refresh intervals per data class to avoid hammering the API — explicitly done at Octopus's request. Given ~95% of Kraken's API traffic reportedly comes from this integration, tenants are polling-sensitive. **Copy this discipline** — a naive multi-provider poller could get IPs rate-limited across tenants.
- **Exponential backoff on failure** up to a 30-minute ceiling.
- **Repairs framework.** Ships first-class HA "Repairs" for common failure states (account not found, no active tariff, meter removed, unknown product, empty tariff rates). Good UX model to emulate — these map cleanly to multi-tenant failure modes.
- **Architecture Decision Records** in-repo — a maturity signal; shows how features get deprecated (e.g. target-rate sensor removal).

---

## 3. Long-standing / recurring issue themes

Pulled from the issue tracker and HA community. These are the incumbent's persistent weak spots — and therefore your opportunities.

| Theme | Example issues | Nature |
|-------|---------------|--------|
| **Home Mini reliability** | #914 (live data stops updating every minute), community reports of sensors going `unavailable` en masse | Live-data pipeline is fragile; depends on Octopus app data availability upstream |
| **Consumption data stalls** | #1733 (usage not updating for 3–4 days despite valid API key) | Recurring "data silently stops" class — hard to diagnose for users |
| **Rate sensors going unknown** | #897 (current rate won't populate) | Tariff-resolution edge cases |
| **HA core API drift** | #1606 (`mean_type` not specified in `async_import_statistics`; breaks in HA 2026.11) | Statistics API is a moving target; needs ongoing maintenance |
| **Intelligent dispatch edge cases** | #754 (partial IO slots), #573 (Ohme/IOG control conflicts) | Octopus-specific complexity you can *avoid* by not implementing it |
| **Cost sensor jumps** | Documented behaviour when planned dispatches don't become started dispatches | Intelligent-specific accounting quirk |

### Patterns to learn from

1. **"Silent stall" is the #1 user pain** — data stops without an obvious error. A multi-provider app should surface data-freshness/health sensors (last-successful-update timestamp per provider) as a first-class feature. The incumbent's users repeatedly get caught out by this.
2. **Upstream fragility, not code bugs** — many issues trace to Octopus's own API/app rather than the integration. A generic client should treat every tenant as independently unreliable and degrade gracefully per-provider.
3. **HA statistics-API churn** is unavoidable maintenance overhead — budget for it regardless of provider.
4. **The Octopus-specific features generate a disproportionate share of the issue volume** (Intelligent, Home Mini). Skipping them isn't just a scope saving — it removes your most failure-prone surface.

---

## 4. Competitive positioning summary

- **Don't** try to out-Octopus the incumbent. It's a HACS-default, ~950-star, actively maintained project with deep Octopus-proprietary integration you can't easily match.
- **Do** own the **Core** contract cleanly across *multiple* tenants, add **per-provider data-health/freshness** sensors (addressing the incumbent's #1 pain), and degrade gracefully where a tenant lacks a feature.
- The incumbent is, in effect, a single-tenant reference client for the exact platform you're generalising. Treat its Core feature set as your spec and its Octopus-specific half as explicitly out of scope.
