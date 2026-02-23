#!/usr/bin/env python3

import aiohttp
import datetime
import logging

from .const import API_BASE_URL

_LOGGER = logging.getLogger(__name__)

METER_TYPE_GAS = "gas"
METER_TYPE_ELECTRIC = "electricity"
METER_TYPE_UNKNOWN = "unknown"


class EonNextAuthError(Exception):
    """Raised when authentication fails."""


class EonNextApiError(Exception):
    """Raised when an API call fails."""


class EonNext:

    def __init__(self):
        self.username = ""
        self.password = ""
        self._session = None
        self.__reset_authentication()
        self.__reset_accounts()

    def _json_contains_key_chain(self, data: dict, key_chain: list) -> bool:
        for key in key_chain:
            if key in data:
                data = data[key]
            else:
                return False
        return True

    def __current_timestamp(self) -> int:
        now = datetime.datetime.now()
        return int(datetime.datetime.timestamp(now))

    def __reset_authentication(self):
        self.auth = {
            "issued": None,
            "token": {
                "token": None,
                "expires": None
            },
            "refresh": {
                "token": None,
                "expires": None
            }
        }

    def __store_authentication(self, kraken_token: dict):
        self.auth = {
            "issued": kraken_token['payload']['iat'],
            "token": {
                "token": kraken_token['token'],
                "expires": kraken_token['payload']['exp']
            },
            "refresh": {
                "token": kraken_token['refreshToken'],
                "expires": kraken_token['refreshExpiresIn']
            }
        }

    def __auth_token_is_valid(self) -> bool:
        if self.auth['token']['token'] is None:
            return False
        if self.auth['token']['expires'] <= self.__current_timestamp():
            return False
        return True

    def __refresh_token_is_valid(self) -> bool:
        if self.auth['refresh']['token'] is None:
            return False
        if self.auth['refresh']['expires'] <= self.__current_timestamp():
            return False
        return True

    async def __auth_token(self) -> str:
        if not self.__auth_token_is_valid():
            if self.__refresh_token_is_valid():
                await self.__login_with_refresh_token()
            else:
                await self.login_with_username_and_password(
                    self.username, self.password
                )

        if not self.__auth_token_is_valid():
            raise EonNextAuthError("Unable to authenticate")

        return self.auth['token']['token']

    async def _get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession()
        return self._session

    async def async_close(self):
        if self._session and not self._session.closed:
            await self._session.close()
            self._session = None

    async def _graphql_post(self, operation: str, query: str, variables: dict = None, authenticated: bool = True) -> dict:
        if variables is None:
            variables = {}

        use_headers = {}
        if authenticated:
            use_headers['authorization'] = "JWT " + await self.__auth_token()

        session = await self._get_session()
        try:
            async with session.post(
                f"{API_BASE_URL}/graphql/",
                json={"operationName": operation, "variables": variables, "query": query},
                headers=use_headers
            ) as response:
                return await response.json()
        except aiohttp.ClientError as err:
            _LOGGER.error("GraphQL request failed for %s: %s", operation, err)
            raise EonNextApiError(f"API request failed: {err}") from err

    async def login_with_username_and_password(self, username: str = None, password: str = None, initialise: bool = True) -> bool:
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
                        "password": self.password
                    }
                },
                False
            )
        except EonNextApiError:
            self.__reset_authentication()
            return False

        if self._json_contains_key_chain(result, ["data", "obtainKrakenToken", "token"]):
            self.__store_authentication(result['data']['obtainKrakenToken'])
            if initialise:
                await self.__init_accounts()
            return True
        else:
            _LOGGER.error("Authentication failed: %s", result.get("errors", "Unknown error"))
            self.__reset_authentication()
            return False

    async def login_with_refresh_token(self, token: str) -> bool:
        self.auth['refresh']['token'] = token
        return await self.__login_with_refresh_token(True)

    async def __login_with_refresh_token(self, initialise: bool = False) -> bool:
        try:
            result = await self._graphql_post(
                "refreshToken",
                "mutation refreshToken($input: ObtainJSONWebTokenInput!) {  obtainKrakenToken(input: $input) {    payload    refreshExpiresIn    refreshToken    token    __typename  }}",
                {
                    "input": {
                        "refreshToken": self.auth['refresh']['token']
                    }
                },
                False
            )
        except EonNextApiError:
            self.__reset_authentication()
            return False

        if self._json_contains_key_chain(result, ["data", "obtainKrakenToken", "token"]):
            self.__store_authentication(result['data']['obtainKrakenToken'])
            if initialise:
                await self.__init_accounts()
            return True
        else:
            self.__reset_authentication()
            return False

    def __reset_accounts(self):
        self.accounts = []

    async def __get_account_numbers(self) -> list:
        result = await self._graphql_post(
            "headerGetLoggedInUser",
            "query headerGetLoggedInUser {\n  viewer {\n    accounts {\n      ... on AccountType {\n        applications(first: 1) {\n          edges {\n            node {\n              isMigrated\n              migrationSource\n              __typename\n            }\n            __typename\n          }\n          __typename\n        }\n        balance\n        id\n        number\n        __typename\n      }\n      __typename\n    }\n    id\n    preferredName\n    __typename\n  }\n}\n"
        )

        if not self._json_contains_key_chain(result, ["data", "viewer", "accounts"]):
            raise EonNextApiError("Unable to load energy accounts")

        found = []
        for account_entry in result['data']['viewer']['accounts']:
            found.append(account_entry['number'])

        return found

    async def __init_accounts(self):
        if len(self.accounts) == 0:
            for account_number in await self.__get_account_numbers():
                account = EnergyAccount(self, account_number)
                await account._load_meters()
                self.accounts.append(account)

    async def async_get_consumption(self, meter_type: str, supply_point_id: str, serial: str, group_by: str = "day", page_size: int = 10) -> dict | None:
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

        params = {"group_by": group_by, "page_size": str(page_size)}
        headers = {"Authorization": f"JWT {token}"}

        session = await self._get_session()
        try:
            async with session.get(url, params=params, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    if "results" in data:
                        return data
                    return None
                _LOGGER.debug(
                    "REST consumption endpoint returned status %s for %s",
                    response.status, serial
                )
                return None
        except aiohttp.ClientError as err:
            _LOGGER.debug("REST consumption request failed for %s: %s", serial, err)
            return None


class EnergyAccount:

    def __init__(self, api: EonNext, account_number: str):
        self.api = api
        self.account_number = account_number
        self.meters = []

    async def _load_meters(self):
        result = await self.api._graphql_post(
            "getAccountMeterSelector",
            "query getAccountMeterSelector($accountNumber: String!, $showInactive: Boolean!) {\n  properties(accountNumber: $accountNumber) {\n    ...MeterSelectorPropertyFields\n    __typename\n  }\n}\n\nfragment MeterSelectorPropertyFields on PropertyType {\n  __typename\n  electricityMeterPoints {\n    ...MeterSelectorElectricityMeterPointFields\n    __typename\n  }\n  gasMeterPoints {\n    ...MeterSelectorGasMeterPointFields\n    __typename\n  }\n  id\n  postcode\n}\n\nfragment MeterSelectorElectricityMeterPointFields on ElectricityMeterPointType {\n  __typename\n  id\n  mpan\n  meters(includeInactive: $showInactive) {\n    ...MeterSelectorElectricityMeterFields\n    __typename\n  }\n}\n\nfragment MeterSelectorElectricityMeterFields on ElectricityMeterType {\n  __typename\n  activeTo\n  id\n  registers {\n    id\n    name\n    __typename\n  }\n  serialNumber\n}\n\nfragment MeterSelectorGasMeterPointFields on GasMeterPointType {\n  __typename\n  id\n  mprn\n  meters(includeInactive: $showInactive) {\n    ...MeterSelectorGasMeterFields\n    __typename\n  }\n}\n\nfragment MeterSelectorGasMeterFields on GasMeterType {\n  __typename\n  activeTo\n  id\n  registers {\n    id\n    name\n    __typename\n  }\n  serialNumber\n}\n",
            {
                "accountNumber": self.account_number,
                "showInactive": False
            }
        )

        if not self.api._json_contains_key_chain(result, ["data", "properties"]):
            raise EonNextApiError(
                "Unable to load energy meters for account " + self.account_number
            )

        self.meters = []
        for prop in result['data']['properties']:
            for electricity_point in prop['electricityMeterPoints']:
                supply_point_id = electricity_point.get('mpan') or electricity_point.get('id', '')
                for meter_config in electricity_point['meters']:
                    meter = ElectricityMeter(
                        self,
                        meter_config['id'],
                        meter_config['serialNumber'],
                        supply_point_id,
                    )
                    self.meters.append(meter)

            for gas_point in prop['gasMeterPoints']:
                supply_point_id = gas_point.get('mprn') or gas_point.get('id', '')
                for meter_config in gas_point['meters']:
                    meter = GasMeter(
                        self,
                        meter_config['id'],
                        meter_config['serialNumber'],
                        supply_point_id,
                    )
                    self.meters.append(meter)


class EnergyMeter:

    def __init__(self, account: EnergyAccount, meter_id: str, serial: str, supply_point_id: str = ""):
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

    def _convert_datetime_str_to_date(self, datetime_str: str) -> datetime.date:
        date_chunks = str(datetime_str.split("T")[0]).split("-")
        return datetime.date(int(date_chunks[0]), int(date_chunks[1]), int(date_chunks[2]))

    async def _update(self):
        pass


class ElectricityMeter(EnergyMeter):

    def __init__(self, account: EnergyAccount, meter_id: str, serial: str, supply_point_id: str = ""):
        super().__init__(account, meter_id, serial, supply_point_id)
        self.type = METER_TYPE_ELECTRIC

    async def _update(self):
        result = await self.api._graphql_post(
            "meterReadingsHistoryTableElectricityReadings",
            "query meterReadingsHistoryTableElectricityReadings($accountNumber: String!, $cursor: String, $meterId: String!) {\n  readings: electricityMeterReadings(\n    accountNumber: $accountNumber\n    after: $cursor\n    first: 12\n    meterId: $meterId\n  ) {\n    edges {\n      ...MeterReadingsHistoryTableElectricityMeterReadingConnectionTypeEdge\n      __typename\n    }\n    pageInfo {\n      endCursor\n      hasNextPage\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment MeterReadingsHistoryTableElectricityMeterReadingConnectionTypeEdge on ElectricityMeterReadingConnectionTypeEdge {\n  node {\n    id\n    readAt\n    readingSource\n    registers {\n      name\n      value\n      __typename\n    }\n    source\n    __typename\n  }\n  __typename\n}\n",
            {
                "accountNumber": self.account.account_number,
                "cursor": "",
                "meterId": self.meter_id
            }
        )

        if not self.api._json_contains_key_chain(result, ["data", "readings"]):
            _LOGGER.warning("Unable to load readings for meter %s", self.serial)
            return

        readings = result['data']['readings']['edges']
        if len(readings) > 0:
            self.latest_reading = round(float(readings[0]['node']['registers'][0]['value']))
            self.latest_reading_date = self._convert_datetime_str_to_date(readings[0]['node']['readAt'])


class GasMeter(EnergyMeter):

    def __init__(self, account: EnergyAccount, meter_id: str, serial: str, supply_point_id: str = ""):
        super().__init__(account, meter_id, serial, supply_point_id)
        self.type = METER_TYPE_GAS

    async def _update(self):
        result = await self.api._graphql_post(
            "meterReadingsHistoryTableGasReadings",
            "query meterReadingsHistoryTableGasReadings($accountNumber: String!, $cursor: String, $meterId: String!) {\n  readings: gasMeterReadings(\n    accountNumber: $accountNumber\n    after: $cursor\n    first: 12\n    meterId: $meterId\n  ) {\n    edges {\n      ...MeterReadingsHistoryTableGasMeterReadingConnectionTypeEdge\n      __typename\n    }\n    pageInfo {\n      endCursor\n      hasNextPage\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment MeterReadingsHistoryTableGasMeterReadingConnectionTypeEdge on GasMeterReadingConnectionTypeEdge {\n  node {\n    id\n    readAt\n    readingSource\n    registers {\n      name\n      value\n      __typename\n    }\n    source\n    __typename\n  }\n  __typename\n}\n",
            {
                "accountNumber": self.account.account_number,
                "cursor": "",
                "meterId": self.meter_id
            }
        )

        if not self.api._json_contains_key_chain(result, ["data", "readings"]):
            _LOGGER.warning("Unable to load readings for meter %s", self.serial)
            return

        readings = result['data']['readings']['edges']
        if len(readings) > 0:
            self.latest_reading = round(float(readings[0]['node']['registers'][0]['value']))
            self.latest_reading_date = self._convert_datetime_str_to_date(readings[0]['node']['readAt'])

    def get_latest_reading_kwh(self, m3_value: float) -> float:
        """Convert gas m3 reading to kWh."""
        from .const import GAS_CALORIC_VALUE, GAS_VOLUME_CORRECTION
        kwh = m3_value * GAS_VOLUME_CORRECTION
        kwh = kwh * GAS_CALORIC_VALUE
        kwh = kwh / 3.6
        return round(kwh)
