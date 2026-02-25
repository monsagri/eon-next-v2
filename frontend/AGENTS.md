# Frontend Agent Guidance

This file covers the `frontend/` directory — the Lit + TypeScript frontend that produces the sidebar panel and Lovelace cards for the EON Next integration.

For repository-wide guidance, see the root `AGENTS.md`.

## Stack

- **Framework**: Lit 3 (web components)
- **Language**: TypeScript (strict mode, ES2021 target)
- **Bundler**: Rollup (`rollup.config.mjs`) — outputs to `custom_components/eon_next/frontend/`
- **Linter**: ESLint with `typescript-eslint`, `eslint-plugin-lit`, `eslint-plugin-wc`, and `eslint-config-prettier`
- **Formatter**: Prettier (single quotes, no semicolons, no trailing commas)
- **Package manager**: npm (lockfile committed)

## Source Layout

```
frontend/
  src/
    panel.ts              # Sidebar panel entry point
    cards/
      register.ts         # Lovelace card picker registration
      summary-card.ts     # Summary card component
    api.ts                # WebSocket API helpers
    api.generated.ts      # Auto-generated from Python types (do not edit)
    types.ts              # Shared TypeScript types
    controllers/
      ws-data-controller.ts  # Reactive data controller for WS subscriptions
    templates/            # Reusable Lit template functions
    styles/               # CSS modules (imported by Rollup lit-css plugin)
  dev/                    # Local dev server (mock HA environment)
```

## Build Outputs

Rollup produces two bundles consumed by the integration at runtime:

- `custom_components/eon_next/frontend/entrypoint.js` — sidebar panel
- `custom_components/eon_next/frontend/cards.js` — Lovelace cards

These are committed so that HACS installs work without a build step.

## Commands

Run from the `frontend/` directory:

| Command | Purpose |
|---|---|
| `npm run build` | Production build |
| `npm run dev` | Watch mode with live reload |
| `npm run lint` | ESLint check |
| `npm run lint:fix` | ESLint auto-fix |
| `npm run format` | Prettier write |
| `npm run format:check` | Prettier check (CI) |
| `npm run typecheck` | TypeScript `--noEmit` |
| `npm run codegen` | Regenerate `api.generated.ts` from Python types |
| `npm run codegen:check` | Codegen + verify no diff (CI-safe) |

## Conventions

### Code Style

- Single quotes, no semicolons, no trailing commas (enforced by Prettier).
- Arrow parens always: `(x) => ...` not `x => ...`.
- Print width 90.

### Component Patterns

- Components extend `LitElement` and use `@property` / `@state` decorators.
- All components receive `hass: HomeAssistant` as an attribute-less property set by HA.
- Card components implement `setConfig()` and `getCardSize()` per the HA custom card API.
- Data fetching uses `WsDataController` — a reactive controller that calls a WebSocket API function and re-renders on updates.

### Styling

- CSS lives in separate `.css` files under `styles/`, imported via `rollup-plugin-lit-css`.
- Shared styles (`shared.css`) provide common HA-compatible base rules.
- Component-specific styles are co-located by name (e.g. `summary-card.css` for `summary-card.ts`).

### Generated Code

- `api.generated.ts` is produced by `scripts/generate_ts_api.py` and should not be edited by hand.
- After changing Python WebSocket handlers or response shapes, run `npm run codegen` and commit the result.

### Adding a New Card

1. Create the component in `src/cards/`.
2. Import it in `src/cards/register.ts` and add a `window.customCards.push(...)` entry.
3. Add styles in `src/styles/` if needed.
4. Run `npm run build` and commit the updated bundles.

## CI

The `.github/workflows/frontend.yml` workflow runs on PRs and pushes to `main` when `frontend/` files change. It runs:

1. `npm run format:check`
2. `npm run lint`
3. `npm run typecheck`
4. `npm run build`

All four must pass before merge.
