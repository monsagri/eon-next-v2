# EON Next API Spec (Custom, Integration-Oriented)

Date: 2026-02-25  
Scope: API paths and methods used by this integration, plus live curl verification results.

## Base

- Host: `https://api.eonnext-kraken.energy`
- API prefix: `/v1`
- Primary GraphQL endpoint: `/v1/graphql/`

## Authentication Contract

- GraphQL login mutation (`loginEmailAuthentication`) returns JWT + refresh token.
- GraphQL refresh mutation (`refreshToken`) exchanges refresh token for new JWT + refresh token.
- Authenticated GraphQL operations require header `authorization: JWT <token>`.
- REST consumption operations require header `Authorization: JWT <token>`.

## Route Inventory Used By Integration

### GraphQL operations

| Operation Name                                 | Method              | Auth | Purpose                                |
| ---------------------------------------------- | ------------------- | ---- | -------------------------------------- |
| `loginEmailAuthentication`                     | `POST /v1/graphql/` | no   | Email/password login                   |
| `refreshToken`                                 | `POST /v1/graphql/` | no   | Refresh JWT                            |
| `headerGetLoggedInUser`                        | `POST /v1/graphql/` | yes  | Discover account numbers               |
| `getAccountMeterSelector`                      | `POST /v1/graphql/` | yes  | Discover meters and MPAN/MPRN          |
| `meterReadingsHistoryTableElectricityReadings` | `POST /v1/graphql/` | yes  | Electricity readings history           |
| `meterReadingsHistoryTableGasReadings`         | `POST /v1/graphql/` | yes  | Gas readings history                   |
| `getAccountDevices`                            | `POST /v1/graphql/` | yes  | EV/SmartFlex devices                   |
| `getSmartChargingSchedule`                     | `POST /v1/graphql/` | yes  | EV planned dispatches                  |
| `getAccountAgreements`                         | `POST /v1/graphql/` | yes  | Tariff metadata                        |

### REST operations

| Path                                                                          | Method | Auth | Purpose                                           |
| ----------------------------------------------------------------------------- | ------ | ---- | ------------------------------------------------- |
| `/v1/electricity-meter-points/{supply_point_id}/meters/{serial}/consumption/` | `GET`  | yes  | Electricity consumption (`group_by`, `page_size`) |
| `/v1/gas-meter-points/{supply_point_id}/meters/{serial}/consumption/`         | `GET`  | yes  | Gas consumption (`group_by`, `page_size`)         |

## Known Drift / Watch Items

- `consumptionDataByMpxn` was removed from the Kraken GraphQL schema (confirmed 2026-02-27). The integration now relies solely on REST consumption endpoints. A replacement GraphQL query (e.g. `consumptionEstimates`) may be available in the future.

## Recommended Verification Command Set

1. Transport: `curl -4/-6` against `/v1/graphql/`.
2. Login: `loginEmailAuthentication`.
3. JWT auth: `headerGetLoggedInUser` with returned JWT.
4. Refresh: `refreshToken` with returned refresh token.
5. Consumption: REST electricity/gas route with valid JWT and real meter identifiers.
