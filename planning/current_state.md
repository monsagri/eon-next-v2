# EON Next Integration: Available Features

Date: 2026-02-25
Scope: Implemented capabilities in this repository (`eon-next-v2`)

## Summary

The integration currently provides cloud-polled monitoring for EON Next accounts through Home Assistant `sensor` entities.

- Platform support: `sensor` only
- Services exposed: none
- Options flow: backfill configuration
- Default polling interval: 30 minutes
- Auth: email/password with refresh token persistence

## Implemented Setup and Account Handling

- Home Assistant config flow with credential validation
- Re-auth flow for credential refresh
- Multiple account support (all discovered accounts are loaded)
- Refresh token persistence to reduce full re-login frequency
- Options flow for historical backfill configuration

## Implemented Sensor Features

### Meter sensors (per meter)

- Latest reading date
- Latest meter reading
- Daily consumption total (kWh-equivalent rollup)
- Standing charge (daily, inc VAT, GBP)
- Previous day cost (total inc VAT, GBP)
- Current tariff name (with tariff code, type, unit rate, standing charge, and validity period as attributes)
- Current unit rate (GBP/kWh, converted from pence)

Electricity meters add:
- Electricity reading (kWh)

Gas meters add:
- Gas reading (m3)
- Gas reading converted to kWh

### EV smart charging sensors (per supported charger)

- Smart charging schedule status (`Active` or `No Schedule`)
- Schedule slot list as sensor attributes
- Next charge start timestamp
- Next charge end timestamp
- Second charge slot start timestamp (if present)
- Second charge slot end timestamp (if present)

### Diagnostic sensors

- Historical backfill status (state, progress, meter completion)

## Implemented Data Retrieval Behavior

- Meter readings: GraphQL account/meter reading queries
- Consumption retrieval: REST first, GraphQL fallback (`consumptionDataByMpxn`) when needed
- Cost data: GraphQL `consumptionDataByMpxn` for standing charge and total cost
- Tariff data: GraphQL `getAccountAgreements` for active tariff agreements per meter point
- EV schedules: SmartFlex planned dispatch query (`flexPlannedDispatches`)
- Historical backfill: configurable, resumable, throttled statistics import
- External statistics import for Energy Dashboard
- Resilience: reuses previous coordinator data on transient update failures
- Resilience: raises re-auth when auth failure is detected

## Current Gaps (Not Yet Implemented)

- No next/previous rate sensors (only current tariff)
- No off-peak/time-of-use indicator sensors
- No export tariff/export earnings sensors
- No cost tracker entities or services
- No binary sensors/events/calendars/switch/number/select/time/climate/water_heater platforms
- No Home Assistant services
- No configurable update interval (options flow exists for backfill only)

## Notes

This document intentionally describes only currently implemented capabilities in this repository.
