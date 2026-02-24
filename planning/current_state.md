# EON Next Integration: Available Features

Date: 2026-02-24
Scope: Implemented capabilities in this repository (`eon-next-v2`)

## Summary

The integration currently provides cloud-polled monitoring for EON Next accounts through Home Assistant `sensor` entities.

- Platform support: `sensor` only
- Services exposed: none
- Options flow: none
- Default polling interval: 30 minutes
- Auth: email/password with refresh token persistence

## Implemented Setup and Account Handling

- Home Assistant config flow with credential validation
- Re-auth flow for credential refresh
- Multiple account support (all discovered accounts are loaded)
- Refresh token persistence to reduce full re-login frequency

## Implemented Sensor Features

### Meter sensors (per meter)

- Latest reading date
- Latest meter reading
- Daily consumption total (kWh-equivalent rollup)

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

## Implemented Data Retrieval Behavior

- Meter readings: GraphQL account/meter reading queries
- Consumption retrieval: REST first, GraphQL fallback (`consumptionDataByMpxn`) when needed
- EV schedules: SmartFlex planned dispatch query (`flexPlannedDispatches`)
- Resilience: reuses previous coordinator data on transient update failures
- Resilience: raises re-auth when auth failure is detected

## Current Gaps (Not Yet Implemented)

- No tariff/rate sensors (current/next/previous)
- No standing charge sensors
- No daily/period cost sensors
- No export tariff/export earnings sensors
- No cost tracker entities or services
- No binary sensors/events/calendars/switch/number/select/time/climate/water_heater platforms
- No Home Assistant services
- No configurable options flow for update intervals or per-account toggles

## Notes

This document intentionally describes only currently implemented capabilities in this repository.
