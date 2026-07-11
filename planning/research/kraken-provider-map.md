# Kraken Public API — Provider Map

**Purpose:** Establish the realistic set of Kraken-powered energy suppliers your multi-provider Home Assistant integration could target, based on which tenants expose a usable public/partner-facing GraphQL API.

**Date compiled:** 11 July 2026

---

## 1. Key architectural facts

- **Kraken is multi-tenant, but not a single shared API.** Each licensee runs its own isolated Kraken instance behind its own hostname. There is no universal `api.kraken.energy` endpoint; there is a *family* of near-identical endpoints, one per brand.
- **The endpoint naming convention is predictable:** `https://api.<brand>-kraken.energy/v1/graphql/` (Octopus is the exception, using its legacy `https://api.octopus.energy/v1/graphql/`).
- **The GraphQL schema is broadly shared** across tenants (same `ObtainKrakenToken` mutation, same `account`/`properties`/`meterPoint` shapes), because it is the same underlying platform. This is what makes a single abstraction layer viable.
- **Auth is uniform in mechanism:** the `ObtainKrakenToken` mutation, authenticating via email/password, an API key, or a pre-signed key. Tokens are valid for 60 minutes; refresh tokens for 7 days.
- **Feature availability is NOT uniform.** A tenant only exposes fields for products it actually sells. Octopus-specific concepts (Agile/dynamic tariffs, Intelligent dispatches, saving sessions, Octoplus, Wheel of Fortune, greenness forecast) will be absent or stubbed on other tenants. Your abstraction needs a **per-provider capability map**, not an assumption of parity.
- **Rate limits are enforced** (10,000 nodes/request max; dynamic per-viewer/IP limits that do not auto-reset). Octopus has stated ~95% of its API traffic comes from the community integration — so tenants are sensitive to polling behaviour. Design conservative polling from day one.

---

## 2. Confirmed usable endpoints (realistic launch set)

These have confirmed public GraphQL endpoints and, in most cases, an existing community integration proving real-world access with customer credentials.

| Provider | Region | GraphQL endpoint | Evidence of usable access | Notes |
|----------|--------|------------------|---------------------------|-------|
| **Octopus Energy** | UK | `api.octopus.energy/v1/graphql/` | Public GraphiQL playground + full developer portal + incumbent integration | The reference implementation. Richest feature set. |
| **E.ON Next** | UK | `api.eonnext-kraken.energy/v1/graphql/` | Working community integration (`PhilTee/homeassistant_eon_next`) with documented curl calls | Second-largest realistic UK target. No dynamic tariffs. |
| **Good Energy** | UK | `developer.good-kraken.energy` (docs) → `api.good-kraken.energy/v1/graphql/` (inferred) | Public developer docs portal live | Verify live endpoint host before building. |
| **EDF (France, OEFR)** | FR | `api.oefr-kraken.energy/v1/graphql/` | Full public docs at `docs.oefr-kraken.energy` | "OEFR" = Octopus Energy France/EDF stack. Docs are the most complete after Octopus. |

---

## 3. Licensed but access-unconfirmed (needs verification)

These brands are confirmed Kraken licensees, but a public/customer-facing GraphQL endpoint has **not** been confirmed. A licence covers back-office/CRM; it does **not** guarantee a customer-facing API. Verify each before committing.

| Provider | Region | Expected endpoint (pattern guess) | Status |
|----------|--------|-----------------------------------|--------|
| EDF Energy (UK) | UK | `api.<?>-kraken.energy` | Licensee; UK customer API unconfirmed |
| Origin Energy | AU | unknown | Licensee; verify |
| Tokyo Gas | JP | unknown | Licensee; localisation likely differs |
| Plenitude (Eni) | IT/FR/GR/PT/SI/ES | unknown | Licensee; multi-country |
| Maingau Energie | DE | unknown | Licensee (2024) |
| Nectr (Hanwha) | AU | unknown | Early licensee |
| National Grid (US) | US | unknown | First integrated US utility |
| Saint John Energy | CA | unknown | Small utility |
| Octopus Germany | DE | `api.oeg-kraken.energy` (guess) | Separate community forks exist (`thecem/octopus_germany`) |

> **Non-energy Kraken tenants** (Severn Trent water, Portsmouth Water, TalkTalk/Cuckoo broadband) are out of scope — no electricity/gas meter data.

---

## 4. Endpoint-discovery method (for verification)

To confirm an unlisted tenant's endpoint:

1. Look for a public developer portal at `developer.<brand>-kraken.energy` or `docs.<brand>-kraken.energy`.
2. Inspect the brand's own web app / mobile app network traffic for calls to `api.<brand>-kraken.energy/v1/graphql/`.
3. Test the `ObtainKrakenToken` mutation with real customer credentials — if it returns a token, the tenant is accessible.
4. Run an introspection query to diff the tenant's schema against the Octopus baseline — this **directly populates your capability map**.

---

## 5. Recommended launch tiering

- **Tier 1 (launch):** Octopus Energy, E.ON Next — both UK, both proven, together covering a large share of UK Kraken households.
- **Tier 2 (fast follow):** Good Energy (UK), EDF/OEFR (FR) — public docs exist, lower community demand.
- **Tier 3 (opportunistic):** Any Tier-2/3 licensee whose endpoint + token flow you can verify, prioritised by user demand.

**Strategic note:** the underserved non-Octopus tenants are the real gap. The Octopus niche is saturated by the incumbent (see feature map). Leading with *breadth* (a clean provider-abstraction covering E.ON Next, Good Energy, EDF) is more defensible than trying to out-feature the incumbent on Octopus.
