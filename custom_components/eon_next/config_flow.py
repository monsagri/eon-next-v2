"""Config flow to configure Eon Next."""

from __future__ import annotations

from collections.abc import Mapping
import logging
from typing import Any

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.config_entries import ConfigEntry
import homeassistant.helpers.config_validation as cv

from .const import CONF_EMAIL, CONF_PASSWORD, CONF_REFRESH_TOKEN, DOMAIN
from .eonnext import EonNext

_LOGGER = logging.getLogger(__name__)


class EonNextConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle Eon Next config flow."""

    VERSION = 1

    def __init__(self) -> None:
        self._reauth_entry: ConfigEntry | None = None

    async def _validate_credentials(self, email: str, password: str) -> str | None:
        """Validate credentials against E.ON Next.

        Returns the refresh token on success, or None on failure.
        """
        api = EonNext()
        try:
            success = await api.login_with_username_and_password(
                email,
                password,
                initialise=False,
            )
            if success:
                return api.auth["refresh"]["token"]
            return None
        except Exception:  # pylint: disable=broad-except
            _LOGGER.exception("Unexpected error during authentication")
            raise
        finally:
            await api.async_close()

    async def async_step_user(self, user_input: dict[str, Any] | None = None):
        """Invoked when a user initiates a flow via the user interface."""
        errors: dict[str, str] = {}

        if user_input is not None:
            email = user_input[CONF_EMAIL].strip().lower()
            password = user_input[CONF_PASSWORD]

            await self.async_set_unique_id(email)
            self._abort_if_unique_id_configured()

            try:
                refresh_token = await self._validate_credentials(email, password)
            except Exception:  # pylint: disable=broad-except
                errors["base"] = "unknown"
            else:
                if refresh_token is not None:
                    return self.async_create_entry(
                        title="Eon Next",
                        data={
                            CONF_EMAIL: email,
                            CONF_PASSWORD: password,
                            CONF_REFRESH_TOKEN: refresh_token,
                        },
                    )
                errors["base"] = "invalid_auth"

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_EMAIL): cv.string,
                    vol.Required(CONF_PASSWORD): cv.string,
                }
            ),
            errors=errors,
        )

    async def async_step_reauth(self, entry_data: Mapping[str, Any]):
        """Handle initiation of re-auth flow."""
        del entry_data
        entry_id = self.context.get("entry_id")
        if not isinstance(entry_id, str):
            return self.async_abort(reason="unknown")

        self._reauth_entry = self.hass.config_entries.async_get_entry(entry_id)
        return await self.async_step_reauth_confirm()

    async def async_step_reauth_confirm(
        self, user_input: dict[str, Any] | None = None
    ):
        """Handle confirmation of re-auth flow."""
        errors: dict[str, str] = {}

        if self._reauth_entry is None:
            return self.async_abort(reason="unknown")

        existing_email = self._reauth_entry.data[CONF_EMAIL]

        if user_input is not None:
            email = user_input[CONF_EMAIL].strip().lower()
            password = user_input[CONF_PASSWORD]

            try:
                refresh_token = await self._validate_credentials(email, password)
            except Exception:  # pylint: disable=broad-except
                errors["base"] = "unknown"
            else:
                if refresh_token is not None:
                    return self.async_update_reload_and_abort(
                        self._reauth_entry,
                        data_updates={
                            CONF_EMAIL: email,
                            CONF_PASSWORD: password,
                            CONF_REFRESH_TOKEN: refresh_token,
                        },
                        reason="reauth_successful",
                    )
                errors["base"] = "invalid_auth"

        return self.async_show_form(
            step_id="reauth_confirm",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_EMAIL, default=existing_email): cv.string,
                    vol.Required(CONF_PASSWORD): cv.string,
                }
            ),
            errors=errors,
        )
