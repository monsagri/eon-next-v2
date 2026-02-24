# EON Next API Capabilities

Date: 2026-02-24
Source: Extracted and adapted from the appendix in `FEATURE_COMPARISON.md`
Purpose: Document API-supported capabilities and what they enable us to build.

## Confirmed Working Endpoints

| Endpoint | Type | What It Enables |
|---|---|---|
| `obtainKrakenToken` | GraphQL Mutation | Email/password authentication with JWT + refresh token |
| `headerGetLoggedInUser` | GraphQL Query | Account discovery and top-level balance visibility |
| `getAccountMeterSelector` | GraphQL Query | Meter point discovery (MPAN/MPRN), serials, meter metadata |
| `meterReadingsHistoryTableElectricityReadings` | GraphQL Query | Electricity meter reading history |
| `meterReadingsHistoryTableGasReadings` | GraphQL Query | Gas meter reading history |
| `consumptionDataByMpxn` | GraphQL Query | Daily consumption with cost and standing charge fields |
| `getAccountDevices` | GraphQL Query | SmartFlex EV/charger account device discovery |
| `flexPlannedDispatches` | GraphQL Query | Smart charging dispatch schedule retrieval |
| `/v1/electricity-meter-points/{mpan}/meters/{serial}/consumption/` | REST | Half-hourly electricity consumption retrieval |
| `/v1/gas-meter-points/{mprn}/meters/{serial}/consumption/` | REST | Half-hourly gas consumption retrieval |

## Tariff Types Known to Be Relevant

| Tariff | Type | Notes |
|---|---|---|
| Next Flex | Variable | Standard variable tariff |
| Next Fixed / Next Online | Fixed | Fixed-rate tariffs |
| Next Drive | EV ToU | 7-hour off-peak window (00:00-07:00) |
| Next Drive Smart | EV Smart | Smart charging/dispatch model |
| Next Pumped | Heat Pump ToU | Multi-period time-of-use structure |
| Next Smart Saver | ToU | Multiple off-peak/super off-peak windows |
| Next Solar Max | Dynamic | Half-hourly wholesale-linked (eligibility-dependent) |
| Next Gust | Green Fixed | Fixed green tariff |
| Next Export Exclusive | Export Fixed | SEG export tariff |
| Next Export Premium | Export Fixed | Higher export rate with eligibility constraints |
| Next Flex Export | Export Variable | Variable SEG export tariff |

## What This Means We Can Build

### Confirmed from already-working data paths

- Standing charge sensors (electricity and gas)
- Daily/previous-day cost sensors (inc/ex VAT variants where returned)
- Explicit previous-day consumption sensors
- Better Energy Dashboard inputs from stable daily consumption/cost signals
- EV schedule/state sensors from planned dispatch data
- Capability-gated export entities where export meter/tariff data is present

### Likely feasible with additional Kraken query work

- Current/next/previous unit-rate sensors
- Tariff metadata and agreement window sensors
- Off-peak indicator sensors for time-of-use tariffs
- Rate arrays or event-style entities for day-rate schedules
- Balance/payment forecast entities if fields are available per account

### Requires investigation before commitment

- Smart charging control mutations (bump charge, toggles, targets)
- Heat-pump control/telemetry exposure on EON Next accounts
- DFS-style event participation data and actions

## Known Constraints

- No public developer documentation equivalent to an open API portal
- Some Kraken fields can be disabled per client/account (`KT-CT-1113`)
- Real-time live demand features may depend on hardware not exposed through EON Next
- REST availability can vary; GraphQL fallback should remain in place

