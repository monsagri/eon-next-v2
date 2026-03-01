#!/usr/bin/env python3

from __future__ import annotations

import asyncio
import datetime
import logging
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

import aiohttp

from .const import API_BASE_URL

_LOGGER = logging.getLogger(__name__)

METER_TYPE_GAS = "gas"
METER_TYPE_ELECTRIC = "electricity"
METER_TYPE_UNKNOWN = "unknown"


GET_ACCOUNT_DEVICES_QUERY = """
query getAccountDevices($accountNumber: String!) {
  devices(accountNumber: $accountNumber) {
    id
    provider
    deviceType
    status {
      current
    }
    __typename
    ... on SmartFlexVehicle {
      make
      model
    }
    ... on SmartFlexChargePoint {
      make
      model
    }
  }
}
"""

GET_SMART_CHARGING_SCHEDULE_QUERY = """
query getSmartChargingSchedule($deviceId: String!) {
  flexPlannedDispatches(deviceId: $deviceId) {
    start
    end
    type
    energyAddedKwh
  }
}
"""

GET_ACCOUNT_AGREEMENTS_QUERY = """
query getAccountAgreements($accountNumber: String!) {
  properties(accountNumber: $accountNumber) {
    electricityMeterPoints {
      mpan
      agreements {
        id
        validFrom
        validTo
        tariff {
          __typename
          ... on TariffType {
            displayName
            fullName
            tariffCode
          }
          ... on StandardTariff {
            unitRate
            standingCharge
          }
          ... on PrepayTariff {
            unitRate
            standingCharge
          }
          ... on HalfHourlyTariff {
            unitRates {
              value
              validFrom
              validTo
            }
            standingCharge
          }
        }
      }
    }
    gasMeterPoints {
      mprn
      agreements {
        id
        validFrom
        validTo
        tariff {
          __typename
          ... on TariffType {
            displayName
            fullName
            tariffCode
          }
          ... on GasTariffType {
            unitRate
            standingCharge
          }
        }
      }
    }
  }
}
"""


class EonNextAuthError(Exception):
    """Raised when authentication fails."""


class EonNextApiError(Exception):
    """Raised when an API call fails."""


@dataclass(slots=True)
class SmartChargingDevice:
    """Smart charging device metadata."""

    device_id: str
    serial: str


class EonNext:
    """API client for E.ON Next."""

    def __init__(self):
        self.username = ""
        self.password = ""
        self._session: aiohttp.ClientSession | None = None
        self._auth_lock = asyncio.Lock()
        self._on_token_update: Callable[[str], None] | None = None
        self.__reset_authentication()
        self.__reset_accounts()

    def set_token_update_callback(
        self, callback: Callable[[str], None] | None
    ) -> None:
        """Register a callback for refresh token updates."""
        self._on_token_update = callback

    def _json_contains_key_chain(self, data: Any, key_chain: list[str]) -> bool:
        for key in key_chain:
            if not isinstance(data, dict) or key not in data:
                return False
            data = data[key]
        return True

    @staticmethod
    def _has_auth_error(errors: Any) -> bool:
        if not isinstance(errors, list):
            return False

        for error in errors:
            if not isinstance(error, dict):
                continue

            message = str(error.get("message", "")).lower()
            code = str(error.get("extensions", {}).get("code", "")).lower()
            if (
                "authentication" in message
                or "authenticated" in message
                or "unauthor" in message
                or "jwt" in message
                or "unauthenticated" in code
                or "invalid_token" in code
            ):
                return True
        return False

    def __current_timestamp(self) -> int:
        return int(datetime.datetime.now().timestamp())

    def __reset_authentication(self):
        self.auth = {
            "issued": None,
            "token": {"token": None, "expires": None},
            "refresh": {"token": None, "expires": None},
        }

    def __store_authentication(self, kraken_token: dict):
        issued_at = kraken_token["payload"]["iat"]
        self.auth = {
            "issued": issued_at,
            "token": {
                "token": kraken_token["token"],
                "expires": kraken_token["payload"]["exp"],
            },
            "refresh": {
                "token": kraken_token["refreshToken"],
                "expires": issued_at + kraken_token["refreshExpiresIn"],
            },
        }
        if self._on_token_update is not None:
            try:
                self._on_token_update(self.auth["refresh"]["token"])
            except Exception:  # pylint: disable=broad-except
                _LOGGER.exception("Error while running token update callback")

    def __auth_token_is_valid(self) -> bool:
        if self.auth["token"]["token"] is None:
            return False
        token_expires = self.auth["token"]["expires"]
        if token_expires is None or not isinstance(token_expires, int | float):
            return False
        if token_expires <= self.__current_timestamp():
            return False
        return True

    def __refresh_token_is_valid(self) -> bool:
        if self.auth["refresh"]["token"] is None:
            return False
        refresh_expires = self.auth["refresh"]["expires"]
        if refresh_expires is None or not isinstance(refresh_expires, int | float):
            return False
        if refresh_expires <= self.__current_timestamp():
            return False
        return True

    async def __auth_token(self) -> str:
        async with self._auth_lock:
            if not self.__auth_token_is_valid():
                if self.__refresh_token_is_valid():
                    await self.__login_with_refresh_token()
                else:
                    await self.login_with_username_and_password(
                        self.username,
                        self.password,
                        initialise=False,
                    )

            if not self.__auth_token_is_valid():
                raise EonNextAuthError("Unable to authenticate")

            return self.auth["token"]["token"]

    async def _get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=30),
            )
        return self._session

    async def async_close(self):
        if self._session and not self._session.closed:
            await self._session.close()
            self._session = None

    async def _graphql_post(
        self,
        operation: str,
        query: str,
        variables: dict | None = None,
        authenticated: bool = True,
    ) -> dict:
        if variables is None:
            variables = {}

        headers: dict[str, str] = {}
        if authenticated:
            headers["authorization"] = f"JWT {await self.__auth_token()}"

        session = await self._get_session()
        try:
            async with session.post(
                f"{API_BASE_URL}/graphql/",
                json={"operationName": operation, "variables": variables, "query": query},
                headers=headers,
            ) as response:
                if authenticated and response.status in (401, 403):
                    raise EonNextAuthError("Authentication rejected by API")

                try:
                    result = await response.json(content_type=None)
                except aiohttp.ContentTypeError as err:
                    text = await response.text()
                    _LOGGER.debug(
                        "Non-JSON response for %s (status %s): %s",
                        operation,
                        response.status,
                        text[:500],
                    )
                    raise EonNextApiError("Invalid API response") from err

                if self._has_auth_error(result.get("errors")):
                    raise EonNextAuthError("Authentication failed")

                errors = result.get("errors")
                if errors and isinstance(errors, list):
                    _LOGGER.warning(
                        "GraphQL errors in %s response: %s",
                        operation,
                        [e.get("message", str(e)) for e in errors if isinstance(e, dict)],
                    )

                return result

        except aiohttp.ClientError as err:
            _LOGGER.error("GraphQL request failed for %s: %s", operation, err)
            raise EonNextApiError(f"API request failed: {err}") from err

    async def login_with_username_and_password(
        self,
        username: str | None = None,
        password: str | None = None,
        initialise: bool = True,
    ) -> bool:
        if username is not None:
            self.username = username
        if password is not None:
            self.password = password

        try:
            result = await self._graphql_post(
                "loginEmailAuthentication",
                "mutation loginEmailAuthentication($input: ObtainJSONWebTokenInput!) {obtainKrakenToken(input: $input) {    payload    refreshExpiresIn    refreshToken    token    __typename}}",
                {
                    "input": {
                        "email": self.username,
                        "password": self.password,
                    }
                },
                False,
            )
        except EonNextAuthError:
            self.__reset_authentication()
            return False
        except EonNextApiError:
            # API/transient error — don't destroy auth state.
            raise

        if self._json_contains_key_chain(result, ["data", "obtainKrakenToken", "token"]):
            self.__store_authentication(result["data"]["obtainKrakenToken"])
            if initialise:
                await self.__init_accounts()
            return True

        _LOGGER.error("Authentication failed: %s", result.get("errors", "Unknown error"))
        self.__reset_authentication()
        return False

    async def login_with_refresh_token(self, token: str) -> bool:
        return await self.__login_with_refresh_token(True, token)

    async def __login_with_refresh_token(
        self,
        initialise: bool = False,
        token: str | None = None,
    ) -> bool:
        refresh_token = token or self.auth["refresh"]["token"]
        if refresh_token is None:
            return False

        try:
            result = await self._graphql_post(
                "refreshToken",
                "mutation refreshToken($input: ObtainJSONWebTokenInput!) {  obtainKrakenToken(input: $input) {    payload    refreshExpiresIn    refreshToken    token    __typename  }}",
                {"input": {"refreshToken": refresh_token}},
                False,
            )
        except EonNextAuthError:
            self.__reset_authentication()
            return False
        except EonNextApiError as err:
            # API/transient error — don't destroy the refresh token so it
            # can be retried once the API recovers.
            _LOGGER.debug("API error during token refresh, will retry later: %s", err)
            raise

        if self._json_contains_key_chain(result, ["data", "obtainKrakenToken", "token"]):
            self.__store_authentication(result["data"]["obtainKrakenToken"])
            if initialise:
                await self.__init_accounts()
            return True

        self.__reset_authentication()
        return False

    def __reset_accounts(self):
        self.accounts: list[EnergyAccount] = []

    async def __get_account_numbers(self) -> list[str]:
        result = await self._graphql_post(
            "headerGetLoggedInUser",
            "query headerGetLoggedInUser {\n  viewer {\n    accounts {\n      ... on AccountType {\n        applications(first: 1) {\n          edges {\n            node {\n              isMigrated\n              migrationSource\n              __typename\n            }\n            __typename\n          }\n          __typename\n        }\n        balance\n        id\n        number\n        __typename\n      }\n      __typename\n    }\n    id\n    preferredName\n    __typename\n  }\n}\n",
        )

        if not self._json_contains_key_chain(result, ["data", "viewer", "accounts"]):
            raise EonNextApiError("Unable to load energy accounts")

        found = []
        for account_entry in result["data"]["viewer"]["accounts"]:
            found.append(account_entry["number"])

        return found

    async def __init_accounts(self):
        if len(self.accounts) != 0:
            return

        for account_number in await self.__get_account_numbers():
            account = EnergyAccount(self, account_number)
            await account._load_meters()
            await account._load_ev_chargers()
            self.accounts.append(account)

    async def async_get_consumption(
        self,
        meter_type: str,
        supply_point_id: str,
        serial: str,
        group_by: str = "day",
        page_size: int = 10,
        period_from: str | None = None,
        period_to: str | None = None,
    ) -> dict | None:
        """Fetch consumption data from the REST API endpoint."""
        if not supply_point_id:
            return None

        token = await self.__auth_token()

        if meter_type == METER_TYPE_ELECTRIC:
            url = f"{API_BASE_URL}/electricity-meter-points/{supply_point_id}/meters/{serial}/consumption/"
        elif meter_type == METER_TYPE_GAS:
            url = f"{API_BASE_URL}/gas-meter-points/{supply_point_id}/meters/{serial}/consumption/"
        else:
            return None

        params: dict[str, str] = {"group_by": group_by, "page_size": str(page_size)}
        if period_from:
            params["period_from"] = period_from
        if period_to:
            params["period_to"] = period_to
        headers = {"Authorization": f"JWT {token}"}

        session = await self._get_session()
        try:
            async with session.get(url, params=params, headers=headers) as response:
                if response.status in (401, 403):
                    raise EonNextAuthError("Authentication rejected by API")

                if response.status == 200:
                    data = await response.json()
                    if "results" in data:
                        return data
                    return None

                _LOGGER.debug(
                    "REST consumption endpoint returned status %s for %s",
                    response.status,
                    serial,
                )
                return None
        except aiohttp.ClientError as err:
            _LOGGER.debug("REST consumption request failed for %s: %s", serial, err)
            return None

    async def async_get_consumption_data_by_mpxn_range(
        self,
        mpxn: str,
        start_date: datetime.date,
        end_date: datetime.date,
    ) -> list[dict[str, Any]] | None:
        """Fetch daily consumption data for a specific date range via GraphQL.

        Note: The consumptionDataByMpxn query has been removed from the Kraken
        API.  This stub returns None so callers fall back to REST consumption.
        """
        return None

    async def async_get_consumption_data_by_mpxn(
        self,
        mpxn: str,
        days: int = 7,
    ) -> list[dict[str, Any]] | None:
        """Fetch daily consumption data via GraphQL.

        Note: The consumptionDataByMpxn query has been removed from the Kraken
        API.  This stub returns None so callers fall back to REST consumption.
        """
        return None

    async def async_get_daily_costs(
        self,
        mpxn: str,
    ) -> dict[str, Any] | None:
        """Fetch cost and standing charge data for a recent complete day.

        Note: The consumptionDataByMpxn query that powered this method has been
        removed from the Kraken API.  Returns None until a replacement query is
        available; callers already handle None gracefully.
        """
        return None

    async def async_get_smart_charging_schedule(
        self,
        device_id: str,
    ) -> list[dict[str, Any]] | None:
        """Fetch smart charging schedule for a specific EV device."""
        if not device_id:
            return None

        result = await self._graphql_post(
            "getSmartChargingSchedule",
            GET_SMART_CHARGING_SCHEDULE_QUERY,
            {"deviceId": device_id},
        )
        if not self._json_contains_key_chain(result, ["data", "flexPlannedDispatches"]):
            return None

        schedule = result["data"]["flexPlannedDispatches"]
        if isinstance(schedule, list):
            return schedule
        return None

    async def async_get_tariff_data(
        self,
        account_number: str,
    ) -> dict[str, dict[str, Any]] | None:
        """Fetch active tariff agreements for all meter points on an account.

        Returns a dict keyed by supply point ID (MPAN/MPRN) with the
        currently active tariff details for each meter point.  Agreements
        are filtered so only the one whose validity window contains today
        is returned per meter point.

        Tariff values (unit rate, standing charge) are returned as-is from
        the API — callers should interpret them as pence/kWh or pence/day.
        """
        if not account_number:
            return None

        result = await self._graphql_post(
            "getAccountAgreements",
            GET_ACCOUNT_AGREEMENTS_QUERY,
            {"accountNumber": account_number},
        )
        if not self._json_contains_key_chain(result, ["data", "properties"]):
            return None

        tariffs: dict[str, dict[str, Any]] = {}
        today = datetime.date.today().isoformat()

        for prop in result["data"]["properties"]:
            if not isinstance(prop, dict):
                continue

            for elec_point in prop.get("electricityMeterPoints", []):
                mpan = elec_point.get("mpan")
                if not mpan:
                    continue
                active = self._find_active_agreement(
                    elec_point.get("agreements", []), today
                )
                if active:
                    tariffs[mpan] = active

            for gas_point in prop.get("gasMeterPoints", []):
                mprn = gas_point.get("mprn")
                if not mprn:
                    continue
                active = self._find_active_agreement(
                    gas_point.get("agreements", []), today
                )
                if active:
                    tariffs[mprn] = active

        return tariffs or None

    @staticmethod
    def _find_active_agreement(
        agreements: list[Any],
        today_iso: str,
    ) -> dict[str, Any] | None:
        """Return the currently active agreement from a list.

        An agreement is active when ``validFrom <= today`` and either
        ``validTo`` is null/empty or ``validTo >= today``.
        """
        if not isinstance(agreements, list):
            return None

        for agreement in agreements:
            if not isinstance(agreement, dict):
                continue

            valid_from = agreement.get("validFrom") or ""
            valid_to = agreement.get("validTo") or ""

            # Skip agreements with no known start date.
            if not valid_from:
                continue
            if valid_from > today_iso:
                continue
            if valid_to and valid_to < today_iso:
                continue

            tariff = agreement.get("tariff")
            if not isinstance(tariff, dict):
                continue

            unit_rate = tariff.get("unitRate")
            unit_rates_schedule: list[dict[str, Any]] | None = None
            tariff_is_tou = False

            if unit_rate is None:
                # HalfHourlyTariff stores rates in unitRates list
                unit_rates = tariff.get("unitRates")
                if isinstance(unit_rates, list) and unit_rates:
                    float_values: list[float] = []
                    schedule_entries: list[dict[str, Any]] = []
                    for r in unit_rates:
                        if not isinstance(r, dict):
                            continue
                        val = r.get("value")
                        if val is None:
                            continue
                        try:
                            float_values.append(float(val))
                        except (TypeError, ValueError):
                            continue
                        schedule_entries.append({
                            "value": float(val),
                            "validFrom": r.get("validFrom"),
                            "validTo": r.get("validTo"),
                        })
                    if float_values:
                        unit_rate = sum(float_values) / len(float_values)
                    if schedule_entries:
                        unit_rates_schedule = schedule_entries

            # Detect time-of-use: HalfHourlyTariff typename or multiple
            # distinct rate values in the schedule.
            typename = tariff.get("__typename") or ""
            if typename == "HalfHourlyTariff":
                tariff_is_tou = True
            elif unit_rates_schedule:
                distinct = {e["value"] for e in unit_rates_schedule}
                tariff_is_tou = len(distinct) > 1

            return {
                "tariff_name": tariff.get("displayName") or tariff.get("fullName"),
                "tariff_code": tariff.get("tariffCode"),
                "tariff_type": typename,
                "unit_rate": unit_rate,
                "standing_charge": tariff.get("standingCharge"),
                "valid_from": valid_from,
                "valid_to": valid_to,
                "unit_rates_schedule": unit_rates_schedule,
                "tariff_is_tou": tariff_is_tou,
            }

        return None


class EnergyAccount:
    """Represents an energy account."""

    def __init__(self, api: EonNext, account_number: str):
        self.api = api
        self.account_number = account_number
        self.meters: list[EnergyMeter] = []
        self.ev_chargers: list[SmartChargingDevice] = []

    async def _load_meters(self):
        result = await self.api._graphql_post(
            "getAccountMeterSelector",
            "query getAccountMeterSelector($accountNumber: String!, $showInactive: Boolean!) {\n  properties(accountNumber: $accountNumber) {\n    ...MeterSelectorPropertyFields\n    __typename\n  }\n}\n\nfragment MeterSelectorPropertyFields on PropertyType {\n  __typename\n  electricityMeterPoints {\n    ...MeterSelectorElectricityMeterPointFields\n    __typename\n  }\n  gasMeterPoints {\n    ...MeterSelectorGasMeterPointFields\n    __typename\n  }\n  id\n  postcode\n}\n\nfragment MeterSelectorElectricityMeterPointFields on ElectricityMeterPointType {\n  __typename\n  id\n  mpan\n  meters(includeInactive: $showInactive) {\n    ...MeterSelectorElectricityMeterFields\n    __typename\n  }\n}\n\nfragment MeterSelectorElectricityMeterFields on ElectricityMeterType {\n  __typename\n  activeTo\n  id\n  registers {\n    id\n    name\n    __typename\n  }\n  serialNumber\n}\n\nfragment MeterSelectorGasMeterPointFields on GasMeterPointType {\n  __typename\n  id\n  mprn\n  meters(includeInactive: $showInactive) {\n    ...MeterSelectorGasMeterFields\n    __typename\n  }\n}\n\nfragment MeterSelectorGasMeterFields on GasMeterType {\n  __typename\n  activeTo\n  id\n  registers {\n    id\n    name\n    __typename\n  }\n  serialNumber\n}\n",
            {
                "accountNumber": self.account_number,
                "showInactive": False,
            },
        )

        if not self.api._json_contains_key_chain(result, ["data", "properties"]):
            raise EonNextApiError(
                "Unable to load energy meters for account " + self.account_number
            )

        self.meters = []
        for prop in result["data"]["properties"]:
            for electricity_point in prop["electricityMeterPoints"]:
                supply_point_id = electricity_point.get("mpan") or electricity_point.get(
                    "id",
                    "",
                )
                for meter_config in electricity_point["meters"]:
                    meter = ElectricityMeter(
                        self,
                        meter_config["id"],
                        meter_config["serialNumber"],
                        supply_point_id,
                    )
                    self.meters.append(meter)

            for gas_point in prop["gasMeterPoints"]:
                supply_point_id = gas_point.get("mprn") or gas_point.get("id", "")
                for meter_config in gas_point["meters"]:
                    meter = GasMeter(
                        self,
                        meter_config["id"],
                        meter_config["serialNumber"],
                        supply_point_id,
                    )
                    self.meters.append(meter)

    async def _load_ev_chargers(self):
        """Load SmartFlex EV devices if available for the account."""
        self.ev_chargers = []
        try:
            result = await self.api._graphql_post(
                "getAccountDevices",
                GET_ACCOUNT_DEVICES_QUERY,
                {"accountNumber": self.account_number},
            )
        except (EonNextApiError, EonNextAuthError) as err:
            _LOGGER.debug("Unable to load EV devices for %s: %s", self.account_number, err)
            return

        if not self.api._json_contains_key_chain(result, ["data", "devices"]):
            return

        seen: set[str] = set()
        for device in result["data"]["devices"]:
            if not isinstance(device, dict):
                continue

            device_id = device.get("id")
            if not device_id or device_id in seen:
                continue

            status = device.get("status", {}).get("current")
            if status and status != "LIVE":
                _LOGGER.debug(
                    "Skipping account device %s due to status=%s",
                    device_id,
                    status,
                )
                continue

            device_type = str(device.get("deviceType", "")).upper()
            typename = str(device.get("__typename", ""))
            is_ev_device = (
                "SMARTFLEX" in typename.upper()
                or "SMART_FLEX" in device_type
                or "VEHICLE" in device_type
                or "CHARGE_POINT" in device_type
            )
            if not is_ev_device:
                _LOGGER.debug(
                    "Skipping non-EV account device %s (typename=%s, deviceType=%s)",
                    device_id,
                    typename or "<unknown>",
                    device_type or "<unknown>",
                )
                continue

            make = str(device.get("make") or "").strip()
            model = str(device.get("model") or "").strip()
            display_name = " ".join(part for part in [make, model] if part).strip()
            if not display_name:
                display_name = str(device.get("provider") or device_id)

            self.ev_chargers.append(
                SmartChargingDevice(device_id=device_id, serial=display_name)
            )
            seen.add(device_id)


class EnergyMeter:
    """Base class for meters."""

    def __init__(
        self,
        account: EnergyAccount,
        meter_id: str,
        serial: str,
        supply_point_id: str = "",
    ):
        self.account = account
        self.api = account.api

        self.type = METER_TYPE_UNKNOWN
        self.meter_id = meter_id
        self.serial = serial
        self.supply_point_id = supply_point_id

        self.latest_reading = None
        self.latest_reading_date = None

    def get_type(self) -> str:
        return self.type

    def get_serial(self) -> str:
        return self.serial

    def _convert_datetime_str_to_date(self, datetime_str: str) -> datetime.date | None:
        try:
            return datetime.date.fromisoformat(str(datetime_str).split("T", 1)[0])
        except ValueError as err:
            _LOGGER.debug(
                "Unable to parse reading date for meter %s from value %r: %s",
                self.serial,
                datetime_str,
                err,
            )
            return None

    async def _update(self):
        pass


class ElectricityMeter(EnergyMeter):
    """Electricity meter."""

    def __init__(
        self,
        account: EnergyAccount,
        meter_id: str,
        serial: str,
        supply_point_id: str = "",
    ):
        super().__init__(account, meter_id, serial, supply_point_id)
        self.type = METER_TYPE_ELECTRIC

    async def _update(self):
        result = await self.api._graphql_post(
            "meterReadingsHistoryTableElectricityReadings",
            "query meterReadingsHistoryTableElectricityReadings($accountNumber: String!, $cursor: String, $meterId: String!) {\n  readings: electricityMeterReadings(\n    accountNumber: $accountNumber\n    after: $cursor\n    first: 12\n    meterId: $meterId\n  ) {\n    edges {\n      ...MeterReadingsHistoryTableElectricityMeterReadingConnectionTypeEdge\n      __typename\n    }\n    pageInfo {\n      endCursor\n      hasNextPage\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment MeterReadingsHistoryTableElectricityMeterReadingConnectionTypeEdge on ElectricityMeterReadingConnectionTypeEdge {\n  node {\n    id\n    readAt\n    readingSource\n    registers {\n      name\n      value\n      __typename\n    }\n    source\n    __typename\n  }\n  __typename\n}\n",
            {
                "accountNumber": self.account.account_number,
                "cursor": "",
                "meterId": self.meter_id,
            },
        )

        if not self.api._json_contains_key_chain(result, ["data", "readings"]):
            _LOGGER.warning("Unable to load readings for meter %s", self.serial)
            return

        readings = result["data"]["readings"]["edges"]
        if len(readings) > 0:
            self.latest_reading = round(float(readings[0]["node"]["registers"][0]["value"]))
            self.latest_reading_date = self._convert_datetime_str_to_date(
                readings[0]["node"]["readAt"]
            )


class GasMeter(EnergyMeter):
    """Gas meter."""

    def __init__(
        self,
        account: EnergyAccount,
        meter_id: str,
        serial: str,
        supply_point_id: str = "",
    ):
        super().__init__(account, meter_id, serial, supply_point_id)
        self.type = METER_TYPE_GAS

    async def _update(self):
        result = await self.api._graphql_post(
            "meterReadingsHistoryTableGasReadings",
            "query meterReadingsHistoryTableGasReadings($accountNumber: String!, $cursor: String, $meterId: String!) {\n  readings: gasMeterReadings(\n    accountNumber: $accountNumber\n    after: $cursor\n    first: 12\n    meterId: $meterId\n  ) {\n    edges {\n      ...MeterReadingsHistoryTableGasMeterReadingConnectionTypeEdge\n      __typename\n    }\n    pageInfo {\n      endCursor\n      hasNextPage\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment MeterReadingsHistoryTableGasMeterReadingConnectionTypeEdge on GasMeterReadingConnectionTypeEdge {\n  node {\n    id\n    readAt\n    readingSource\n    registers {\n      name\n      value\n      __typename\n    }\n    source\n    __typename\n  }\n  __typename\n}\n",
            {
                "accountNumber": self.account.account_number,
                "cursor": "",
                "meterId": self.meter_id,
            },
        )

        if not self.api._json_contains_key_chain(result, ["data", "readings"]):
            _LOGGER.warning("Unable to load readings for meter %s", self.serial)
            return

        readings = result["data"]["readings"]["edges"]
        if len(readings) > 0:
            self.latest_reading = round(float(readings[0]["node"]["registers"][0]["value"]))
            self.latest_reading_date = self._convert_datetime_str_to_date(
                readings[0]["node"]["readAt"]
            )

    def get_latest_reading_kwh(self, m3_value: float) -> float:
        """Convert gas m3 reading to kWh."""
        from .const import GAS_CALORIC_VALUE, GAS_VOLUME_CORRECTION

        kwh = m3_value * GAS_VOLUME_CORRECTION
        kwh = kwh * GAS_CALORIC_VALUE
        kwh = kwh / 3.6
        return round(kwh)
