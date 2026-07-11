# Spec 01 - Entry Lifecycle, Auth, and Token Handling

Scope: `__init__.py`, `eonnext.py` (auth/session paths), `config_flow.py`.

## Critical

### 1.1 Refresh-token persistence reload-loops the integration [verified]

- Where: `custom_components/eon_next/__init__.py:193-200` (`_persist_refresh_token`),
  `__init__.py:255` (listener registration), `__init__.py:181-185` (listener).
- Problem: `_persist_refresh_token` writes each rotated refresh token into
  `entry.data` via `async_update_entry`. The update listener registered at line 255
  fires on **any** entry update (data included, not just options) and unconditionally
  calls `async_reload`.
- Failure scenario: at runtime the access token expires (~hourly), the client
  refreshes it, Kraken rotates the refresh token, the token is persisted, and HA
  reloads the whole integration mid-coordinator-update - the aiohttp session is
  closed under in-flight requests ("Session is closed"), backfill restarts, entities
  flap. Repeats every rotation. Masked in tests because setup-time persists happen
  before the listener is registered.
- Fix: in `_async_update_listener`, compare old vs new and reload only when
  **options** changed; or persist the token without notifying listeners. Add a
  regression test that a data-only `async_update_entry` does not reload.

## High

### 1.2 Single 401 escalates straight to re-auth prompt [reported]

- Where: `custom_components/eon_next/eonnext.py:214` (expiry check, no margin),
  `eonnext.py:278-279`, `eonnext.py:471-473` (401/403 → `EonNextAuthError`),
  `coordinator.py:303-307` (→ `ConfigEntryAuthFailed`).
- Problem: token validity is checked with `expires <= now` (no safety margin) and a
  401 on any authenticated call raises `EonNextAuthError` with no
  refresh-and-retry. The coordinator maps that directly to `ConfigEntryAuthFailed`.
- Failure scenario: token expires between `__auth_token()` returning and the request
  landing (or server clock skew) → one 401 → HA starts a re-auth flow and pesters the
  user for credentials that are perfectly valid.
- Fix: add ~60 s expiry margin in `__auth_token_is_valid`, plus a one-shot
  "force-refresh under `_auth_lock`, retry once" on the first 401 in
  `_graphql_post` / `async_get_consumption` before raising.

### 1.3 Setup path can escape with unmapped exceptions and leak the session [reported]

- Where: `custom_components/eon_next/__init__.py:209-231` (only `EonNextApiError`
  caught around login), `eonnext.py:378-385, 412-422, 704-739`
  (`__init_accounts`/`_load_meters` can raise `EonNextAuthError` or raw `KeyError` on
  unexpected payloads), `__init__.py:239-240` (`backfill.async_prime()` /
  `cost_trackers.async_initialize()` outside any try/finally).
- Failure scenario: an auth blip or malformed payload during account/meter loading
  escapes `async_setup_entry` unhandled - the entry shows "Error" with a stack trace
  instead of triggering re-auth (`ConfigEntryAuthFailed`) or retry
  (`ConfigEntryNotReady`); the authenticated `ClientSession` leaks. A storage error in
  `async_prime` leaks a session per setup retry ("Unclosed client session").
- Fix: broaden the setup try/except to cover initialisation, mapping
  `EonNextAuthError → ConfigEntryAuthFailed` and everything else transient →
  `ConfigEntryNotReady`; wrap post-login setup in try/finally that closes the API on
  failure. Structural alternative: inject HA's shared session
  (`async_get_clientsession(hass)`) so there is no owned session to leak.

## Medium

### 1.4 Reauth accepts a different account without unique_id validation [reported]

- Where: `custom_components/eon_next/config_flow.py:144-164`.
- Problem: the reauth confirm step lets the user submit a different email but never
  calls `async_set_unique_id` / `_abort_if_unique_id_mismatch` before
  `async_update_entry`.
- Failure scenario: user enters account B's credentials during account A's reauth -
  entry data now belongs to B while `unique_id` remains A's email. Adding B later is
  silently possible (duplicate entries, colliding meter-serial unique_ids); re-adding
  A is wrongly blocked.
- Fix: set/verify the unique_id in the reauth step and abort on mismatch
  (`reauth_account_mismatch`).

### 1.5 Auth-error sniffing by substring can misfire [reported] (uncertain)

- Where: `custom_components/eon_next/eonnext.py:157-177` (`_has_auth_error`).
- Problem: substring match of "jwt"/"unauthor"/"authentication" in **any** GraphQL
  error message on **any** operation escalates to `EonNextAuthError`.
- Failure scenario: a field-level permission error (e.g. "not authorized to view
  devices" on a restricted account) triggers a full re-auth flow instead of being a
  per-feature failure.
- Fix: match on GraphQL error `extensions.errorCode`/`errorType` where available, or
  restrict the substring check to the auth mutations plus a 401/403 transport status.

### 1.6 Auth errors inside backfill are swallowed [reported]

- Where: `custom_components/eon_next/backfill.py:487-494` (broad `except` in
  `_async_run`).
- Problem: `EonNextAuthError` raised during a backfill cycle is caught and logged as
  a warning; nothing reaches `ConfigEntryAuthFailed`.
- Failure scenario: expired refresh token → backfill hammers the API with a bad token
  every cycle forever; no reauth flow starts (violates the auth-mapping guardrail in
  `AGENTS.md`).
- Fix: catch `EonNextAuthError` explicitly, stop the loop, and trigger reauth via
  `entry.async_start_reauth(hass)`.

## Low

### 1.7 GraphQL error handling assumes dict body [reported]

- Where: `custom_components/eon_next/eonnext.py:293-304`.
- Problem: `result.get("errors")` raises `AttributeError` when the JSON body is
  `null` or a list (proxy/CDN error pages), escaping the client's error taxonomy
  instead of raising `EonNextApiError`.

### 1.8 Kraken token payload indexed without shape validation [reported] (uncertain)

- Where: `custom_components/eon_next/eonnext.py:189-199` (`__store_authentication`).
- Problem: `kraken_token["payload"]["iat"]`/`["exp"]`/`["refreshToken"]` indexed
  blind; a missing/renamed field raises raw `KeyError`/`TypeError` out of the login
  methods (compounds 1.3).

### 1.9 Raw auth-mutation error array logged at ERROR level [reported]

- Where: `custom_components/eon_next/eonnext.py:346`.
- Problem: logs the raw `errors` array from the auth mutation response. Today it
  contains only messages, but it is a raw-auth-payload log path per
  `docs/ai/conventions.md`; log a sanitized summary instead. (No credential/token
  leakage was found in any other `_LOGGER` call.)

## Non-findings (checked, OK)

- Token refresh is correctly serialized under `_auth_lock`
  (`eonnext.py:228-243`); inner logins use `authenticated=False`, no deadlock.
- `_get_session` has no await between check and assign - no double-session race.
- All HTTP calls inherit the session-level 30 s `ClientTimeout`.
- `entry.runtime_data` is used consistently as the state source.
- Config-flow duplicate prevention via email unique_id in `async_step_user` is
  correct (initial add path).
