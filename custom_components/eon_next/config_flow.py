"""Config flow to configure Eon Next."""
from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol

from homeassistant import config_entries
import homeassistant.helpers.config_validation as cv

from .eonnext import EonNext
from .const import DOMAIN, CONF_EMAIL, CONF_PASSWORD

_LOGGER = logging.getLogger(__name__)


class EonNextConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle Eon Next config flow."""

    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None):
        """Invoked when a user initiates a flow via the user interface."""
        errors = {}
        if user_input is not None:
            en = EonNext()
            try:
                success = await en.login_with_username_and_password(
                    user_input[CONF_EMAIL],
                    user_input[CONF_PASSWORD],
                    False
                )
            except Exception:
                _LOGGER.exception("Unexpected error during authentication")
                errors["base"] = "unknown"
            else:
                if success:
                    await en.async_close()
                    return self.async_create_entry(title="Eon Next", data={
                        CONF_EMAIL: user_input[CONF_EMAIL],
                        CONF_PASSWORD: user_input[CONF_PASSWORD]
                    })
                else:
                    errors["base"] = "invalid_auth"
            finally:
                await en.async_close()

        return self.async_show_form(step_id="user", data_schema=vol.Schema({
            vol.Required(CONF_EMAIL): cv.string,
            vol.Required(CONF_PASSWORD): cv.string
        }), errors=errors)
