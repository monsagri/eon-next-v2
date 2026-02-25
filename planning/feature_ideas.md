# EON Next Integration: Forward-Looking Feature Roadmap

Date: 2026-02-24
Scope: Features that are feasible or potentially feasible for future implementation in `eon-next-v2`

## Goal

Evolve the integration from core monitoring into a richer energy-management integration while staying aligned with EON Next API capabilities.

## Feature Feasibility Tiers

### Tier 1: Confirmed Feasible (API data already validated)

- ~~Standing charge sensors (electricity and gas)~~ **Done (v1.3.0)**
- ~~Previous-day cost sensors (electricity and gas)~~ **Done (v1.3.0)**
- Previous-day consumption sensors (explicit day-based presentation)
- Gas daily consumption parity improvements
- EV dispatching binary/state indicators derived from planned dispatches
- ~~Diagnostics for data freshness and retrieval timestamps~~ **Done (v1.3.0)**
- ~~Basic local cost tracker logic~~ **Done (v1.3.0)**

### Tier 2: Likely Feasible (Kraken schema suggests support, requires validation)

- ~~Current electricity and gas unit rate sensors~~ **Done (v1.4.0)**
- ~~Tariff metadata sensors (tariff code/product/agreement windows)~~ **Done (v1.4.0)**
- Previous/next unit rate sensors
- Day-rate event-style data entities for time-of-use tariffs
- Off-peak indicator sensors for supported tariff patterns
- Export tariff rate/consumption/earnings sensors
- Balance and payment-related account sensors
- Configurable options flow (intervals and feature toggles)

### Tier 3: Possible but Uncertain (needs API mutation/access testing)

- Intelligent charging controls (bump charge, smart charge toggle)
- Charge target and ready-by controls
- Greenness-style forecast signals if exposed to EON Next accounts
- Heat-pump device control and telemetry (only if account/device APIs are available)
- Demand Flexibility Service feature integration if addressable by API

### Tier 4: Not Feasible with Current Provider Constraints

- Features tied to products/programs not offered to EON Next customers
- Features requiring provider-specific hardware telemetry not available via EON Next

## Suggested Delivery Phases

### Phase 1: Core Cost and Diagnostics

- Add standing charge and previous-day cost sensors
- Normalize previous-day consumption presentation
- Add diagnostics for freshness and retrieval health
- Improve Energy Dashboard readiness for consumption/cost metrics

### Phase 2: Tariff and Time-of-Use Awareness (In Progress)

- ~~Implement tariff and unit-rate query layer~~ **Done**
- ~~Add current rate sensors~~ **Done**
- Add previous/next rate sensors
- Add off-peak indicators and day-rate data entities
- Add export tariff support where account data exists

### Phase 3: Smart Charging and Local Analytics

- Expand EV entities with dispatch state and richer schedule metadata
- Add local cost tracker entities and helper services
- Add options flow for update controls and optional feature toggles

### Phase 4: Advanced/Investigative Features

- Validate and potentially expose SmartFlex control mutations
- Investigate DFS and heat-pump integration feasibility
- Add advanced comparative analytics if stable tariff/product metadata is available

## Technical Prerequisites

- Introduce modular coordinators by domain (meters, tariffs, EV, billing)
- Add feature gating for account capability detection
- Add rate-limiting protections for EV and mutation endpoints
- Expand diagnostics and structured logging for failed field access

## Risks and Dependencies

- Per-client disabled fields in Kraken responses
- API behavior differences between tariff/account types
- Mutation availability may differ by account eligibility
- REST endpoint intermittency requires maintained GraphQL fallback paths

## Definition of Success

- Users can monitor daily usage and cost with minimal manual templating
- Time-of-use customers can automate around reliable off-peak signals
- EV users can observe useful dispatch state without sacrificing stability
- Advanced features remain capability-gated and do not degrade baseline reliability
