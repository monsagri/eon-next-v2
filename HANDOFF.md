# Handoff — Fusebox greenfield build

Audience: the agent session bootstrapping `monsagri/ha-fusebox-energy`.
This file is the bridge from the planning work in `eon-next-v2` to the fresh
build. Read it top to bottom before touching the new repo.

## Read first

1. `planning/greenfield_build_plan.md` (this branch) — **the** build plan:
   decisions ledger D1-D15, target architecture, identity scheme, phase order,
   port inventory, open questions. Everything below assumes it.
2. Its predecessors, for background only: `planning/adapter_normaliser_architecture.md`,
   `planning/provider_generalization.md`, `planning/research/*`.

## Decisions locked after the plan was written

These are not yet in the plan doc; treat them as D16-D18.

- **D16 — Name: Fusebox.** HA domain `fusebox`; HACS title "Fusebox";
  statistic-id prefix `fusebox:`; WS namespace `fusebox/*`; custom-element
  prefix `fb-`; CSS token namespace `--fb-*`; core package
  `custom_components/fusebox/core/`. The metaphor: the household fuse box is
  where every circuit meets — the composition engine in one word.
  **Before freezing any identity string**, run the verification checklist
  (Phase 0 gate): grep the HA core integrations list for a `fusebox` domain
  collision, search HACS default + community repos, quick UK/EU trademark
  check (class 9/42), optional defensive PyPI registration, and check the
  name renders sensibly in `home-assistant/brands`.
- **D17 — Repo: `monsagri/ha-fusebox-energy`.** Private until Phase 3
  (release hardening / going public). Repo name ≠ domain slug is fine; only
  the brands entry and HACS listing reference the repo.
- **D18 — License: Apache 2.0.** Rationale: §6 trademark carve-out protects
  the Fusebox name, §5 auto-licenses contributions (incl. patents) without a
  CLA, and it matches HA core. `LICENSE` at root plus a `NOTICE` file naming
  the project. Code ported from `eon-next-v2` is the same author's MIT code —
  relicensing is fine.

## What to do, in order (plan §9, condensed)

1. **Phase 0 — Bootstrap `ha-fusebox-energy`.**
   - Run the D16 verification checklist; then freeze the identity strings.
   - Scaffold: `LICENSE` (Apache 2.0), `NOTICE`, `hacs.json`, manifest
     skeleton (`domain: fusebox`, `integration_type: hub`,
     `config_flow: true`), README stub.
   - Port tooling from `eon-next-v2`: CI workflows, release-please +
     metadata-lockstep check, TS codegen script, pytest harness
     (`pytest-homeassistant-custom-component`), hassfest + HACS validation,
     commitlint/Husky.
   - Add the **core boundary check**: CI fails if anything under
     `custom_components/fusebox/core/` imports `homeassistant` (or uses
     absolute self-imports).
   - Port the `planning/` docs from this branch into the new repo.
2. **Phase 1 — The core engine** (pure Python, no HA, test-first): typed
   model, adapter protocol + conformance kit, composition engine with
   precedence-as-data policy tables, freshness records, statistics
   import-plan computation, adversarial synthetic multi-source fixtures.
3. **Phases 2+** per the plan: Kraken adapter + HA shell + frontend port,
   then release hardening, then Class-B adapters (demand-gated).

## Source material in `eon-next-v2`

Port for reference, then the branches here get deleted (owner action):

- `claude/adapter-normaliser-architecture-mwr1d8` — planning docs + the full
  Phase 1-6 multi-tenant implementation (ProviderDescriptor, provider config
  flow, enriched WS contract, Octopus tenant, connected-accounts surface).
- `claude/energy-provider-generalization-phase{2..6}-mwr1d8` — the individual
  phase commits if finer-grained archaeology is needed.
- `origin/main` — the released 1.10.x integration: the mature machinery the
  plan says to port wholesale (`statistics.py`, `backfill.py`,
  `cost_tracker.py`, `tariff_helpers.py`, frontend `src/`, tests).

## Guardrails carried over

- Nothing new lands in `eon-next-v2` except legacy bug fixes; it stays on the
  `eon_next` domain in maintenance mode.
- `ha-fusebox-energy` stays private until Phase 3; brands + HACS-default PRs
  go out the day it goes public.
- Identity strings (domain, unique_ids, statistic ids, WS commands) are
  frozen once Phase 0 completes — treat any later change as a breaking
  migration.
- Entity unique_ids and statistic ids are keyed by **supply point id**
  (MPxN in the UK), never meter serial (plan §4).

## Open questions (plan §10, updated)

- ~~Q1 name~~ — resolved: Fusebox (D16).
- Q2 Class-B linking UX — still open; model carries `unlinked` from day one.
- Q3 capability-domain split granularity — confirm while writing Phase 1
  policy tables.
- Q4 multi-property UI, Q5 non-GBP tenants, Q6 Lovelace cards — all deferred
  by decision.
