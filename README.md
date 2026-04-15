# Jira Extension For FeatBit Feature Flag Management

[![CI](https://github.com/ChrisCarleton/Jira-FeatBit/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/ChrisCarleton/Jira-FeatBit/actions/workflows/ci.yml?query=branch%3Amain)

Atlassian Forge app that integrates [FeatBit](https://github.com/featbit/featbit) feature flags directly into Jira. From any Jira ticket you can view linked flags across multiple environments, create new flags, and link existing ones — all without leaving Jira.

## How it works

FeatBit flags are linked to Jira tickets using **FeatBit tags**. When a flag is tagged with a Jira issue key (e.g. `PROJ-123`), it appears in that ticket's feature flag panel. Flags tagged with a parent epic's key are also surfaced on all child tickets.

The app consists of two packages managed as a [Lerna](https://lerna.js.org/) + Yarn workspace monorepo:

- **Forge backend** (`src/api/`) — TypeScript resolver functions that run server-side inside Atlassian's infrastructure. They call the FeatBit REST API and use Forge Storage to persist configuration. The FeatBit access token is stored here and never sent to the browser.
- **Custom UI frontend** (`src/ui/`) — A Vue app served by Forge. It calls the backend resolvers via `@forge/bridge`. It renders as either the issue panel or the settings page depending on which Forge module loaded it.

```
Browser (Jira)
    │
    │  @forge/bridge invoke()
    ▼
Forge Runtime (src/index.ts resolvers)
    │
    │  FeatBit REST API  (Bearer token)
    ▼
FeatBit API Server
```

## Project structure

This is a Lerna monorepo with two Yarn workspace packages under `src/`.

```
featbit-jira/
├── lerna.json                # Lerna configuration (independent versioning, yarn)
├── manifest.yml              # Forge app manifest — modules, permissions, resource
├── package.json              # Workspace root — global devDeps, Lerna scripts
├── docker-compose.yml        # Local FeatBit instance for testing
│
├── src/
│   ├── api/                  # @featbit-jira/api — Forge backend
│   │   ├── package.json
│   │   ├── tsconfig.json         # TypeScript config (CommonJS output for webpack)
│   │   ├── tsconfig.test.json    # TypeScript config used by Jest
│   │   ├── jest.config.cjs       # Jest configuration
│   │   ├── webpack.config.cjs    # Bundles to ../../dist/ (project root)
│   │   ├── src/
│   │   │   ├── index.ts          # All Forge resolver functions (backend entry point)
│   │   │   ├── featbit.ts        # FeatBit REST API client
│   │   │   └── slack.ts          # Slack notification helpers
│   │   └── tests/
│   │       ├── featbit.test.ts   # Unit tests for the FeatBit API client
│   │       └── index.test.ts     # Unit tests for all Forge resolver handlers
│   │
│   └── ui/                   # @featbit-jira/ui — Custom UI (Vue + Vite)
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── index.html
│       └── src/
│           ├── main.ts           # Vue entry point
│           ├── App.vue           # Renders IssuePanel or Settings based on moduleKey
│           ├── api.ts            # Typed invoke() wrappers (bridge → resolver)
│           ├── types.ts          # Shared TypeScript interfaces
│           ├── views/
│           │   ├── IssuePanel.vue   # Panel shown on every Jira issue
│           │   └── Settings.vue     # Global settings page
│           └── components/
│               ├── FlagTable.vue        # Multi-environment flag status table
│               ├── CreateFlagModal.vue  # Create a new flag modal
│               └── LinkFlagModal.vue    # Search and link an existing flag modal
```

## Forge modules

| Module            | Key                   | Description                                                                           |
| ----------------- | --------------------- | ------------------------------------------------------------------------------------- |
| `jira:issuePanel` | `featbit-flags-panel` | Shown on every Jira issue. Displays linked flags.                                     |
| `jira:globalPage` | `featbit-settings`    | Admin page for entering the FeatBit API URL, access token and selecting environments. |

Both modules share the same Vue app entry point (`src/ui/dist`). `App.vue` reads `ctx.moduleKey` from the Forge context to decide which view to render.

## Resolver functions

All backend logic lives in `src/api/src/index.ts`. Each resolver is called from the frontend via `invoke()`.

| Resolver            | Description                                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getConfig`         | Returns stored API URL, environment list, and whether a token is saved (token itself is never returned).                                                            |
| `saveConfig`        | Persists API URL, access token, and environment list to Forge Storage.                                                                                              |
| `fetchEnvironments` | Calls the FeatBit API with supplied credentials to discover all projects and their environments (used during setup to test the connection).                         |
| `getFlagsForIssue`  | Given an issue key, queries each configured environment for flags tagged with that key or its parent epic's key. Returns a merged list with per-environment status. |
| `searchFlags`       | Full-text search of flags by name or key across all configured environments. Used by the "Link existing flag" modal.                                                |
| `createFlag`        | Creates a boolean flag in all configured environments simultaneously, pre-tagged with the issue key.                                                                |
| `linkFlag`          | Adds the issue key tag to an existing flag across all environments.                                                                                                 |

## FeatBit API client (`src/api/src/featbit.ts`)

Thin, typed wrapper around the FeatBit REST API. All requests include a 15-second timeout via `AbortController`. Functions:

- `listProjects` — fetch all projects + their embedded environments
- `listFlagsByTag` — list flags filtered by a single tag (used for the panel display)
- `searchFlags` — full-text search by name/key (used for linking)
- `createFlag` — create a boolean flag with the given name, key, and tags
- `updateFlagTags` — replace a flag's full tag array

## Flag linking model

A flag is considered linked to a Jira ticket when its FeatBit tags include the ticket's issue key. The panel also shows flags tagged with the ticket's **parent epic key**, so an epic-level flag automatically appears on all its stories.

When a flag is created or linked through the Jira UI the tag is written to **every configured environment** so that the flag appears in the panel regardless of which environment you're looking at.

Flags that don't exist in a given environment show `N/A` rather than `Disabled`.

## Prerequisites

- Node.js v18 or later
- Yarn (v4 — managed via `packageManager` field in `package.json`)
- [Atlassian Forge CLI](https://developer.atlassian.com/platform/forge/cli-reference/) (`npm install -g @forge/cli`)
- Docker + Docker Compose (for the local FeatBit test instance)

## Initial setup

For instructions specific to Jira administrators check [here](JIRA_SETUP.md).

For instructions on setting up Slack notifications check [here](SLACK_SETUP.md).

### 1. Install dependencies

```bash
yarn install
```

This installs all dependencies for every workspace package (`@featbit-jira/api` and `@featbit-jira/ui`) in one step.

Then initialize the git hooks (required once after cloning):

```bash
yarn husky
```

### 2. Start a local FeatBit instance (optional, for testing)

This project ships a standalone FeatBit stack (PostgreSQL only — no Redis, no Kafka) via `docker-compose.yml`.

#### First-time startup

```bash
docker compose up -d
```

On the very first run PostgreSQL automatically executes every `.sql` file in `docker/postgres/` (the official FeatBit schema + migrations). Wait about 10–15 seconds for the containers to become healthy before opening the UI.

Services:

|                   | URL                   |
| ----------------- | --------------------- |
| Admin UI          | http://localhost:8081 |
| API server        | http://localhost:5000 |
| Evaluation server | http://localhost:5100 |

Default credentials: `test@featbit.com` / `123456`

#### Manual database seed

If the `postgres` Docker volume already exists the automatic init scripts are skipped (PostgreSQL only runs them against a brand-new, empty data directory). Use the seed script to initialise the database without recreating the volume:

```bash
yarn init-featbit
```

To **wipe all data** and start fresh:

```bash
yarn init-featbit --reset
# equivalent to: docker compose down -v && docker compose up -d
```

Tear down: `docker compose down` (keep data) or `docker compose down -v` (wipe data).

### 3. Register the Forge app

```bash
forge login
forge register       # first time only — updates app.id in manifest.yml
```

### 4. Build and deploy

```bash
yarn build           # Lerna builds both packages (API → dist/, UI → src/ui/dist/)
forge deploy
forge install        # install in your Jira cloud site
```

### 5. Create a FeatBit access token

The app authenticates with the FeatBit management API using a **Service Access Token**.

To create one:

1. In the FeatBit Admin UI, go to **Integrations → Access Tokens** and click **Add**.
2. Give it a descriptive name (e.g. `jira-integration`) and set **Type** to `Service`.
3. Assign the following permissions:

   | Resource         | Permissions required               |
   | ---------------- | ---------------------------------- |
   | **Feature flag** | All resources — full access (`*`)  |
   | **Project**      | All resources — `CanAccessProject` |
   | **Environment**  | All resources — `CanAccessEnv`     |

4. Click **Save** and copy the generated token — it will not be shown again.

### 6. Configure the app in Jira

1. In Jira, open **Apps → FeatBit Settings**.
2. Enter your FeatBit API URL (e.g. `http://localhost:5000` for local Docker).
3. Enter your FeatBit access token.
4. Click **Test connection & load environments**, choose the environments you want visible, then **Save settings**.

## Development workflow

### Both at once (recommended)

`yarn build:watch` runs the backend webpack watcher and frontend Vite build watcher in parallel via Lerna:

```bash
# Terminal 1 — rebuild both on change
yarn build:watch

# Terminal 2 — tunnel (proxies Forge invocations to your local process)
forge tunnel
```

### Backend only

Edit files in `src/api/src/`, then:

```bash
yarn build && forge deploy
```

Or watch mode for the backend alone:

```bash
# Terminal 1 — rebuild backend on change
yarn workspace @featbit-jira/api build:watch

# Terminal 2
forge tunnel
```

### Frontend only

```bash
# Terminal 1 — Vite dev server on :3000 (hot-reload)
yarn workspace @featbit-jira/ui dev

# Terminal 2 — tunnel with Custom UI port forwarding
forge tunnel
```

Forge tunnel proxies the Custom UI resource to `localhost:3000` during development, so hot-reload works normally.

### After changes are ready for deployment

```bash
yarn build
forge deploy
```

### For deployment to production

```bash
yarn build
forge deploy --environment production
```

## Useful commands

| Command                                  | What it does                                        |
| ---------------------------------------- | --------------------------------------------------- |
| `yarn build`                             | Build both packages via Lerna                       |
| `yarn build:watch`                       | Watch and rebuild both packages in parallel         |
| `yarn build:typecheck`                   | Type-check both packages without emitting           |
| `yarn test`                              | Run all unit tests (API Jest + UI Vitest) via Lerna |
| `yarn test:coverage`                     | Run all tests with console + lcov coverage reports  |
| `yarn lint`                              | ESLint across both packages                         |
| `yarn lint:fix`                          | Auto-fix lint issues across both packages           |
| `yarn format`                            | Prettier-format source across both packages         |
| `yarn init-featbit`                      | Seed the FeatBit PostgreSQL database                |
| `yarn init-featbit --reset`              | Wipe and re-seed the FeatBit database               |
| `yarn workspace @featbit-jira/ui dev`    | Start Vite dev server for the frontend              |
| `yarn workspace @featbit-jira/api build` | Build the API package only                          |
| `yarn workspace @featbit-jira/ui build`  | Build the UI package only                           |
| `forge deploy`                           | Deploy the app to Atlassian infrastructure          |
| `forge install`                          | Install the deployed app in a Jira site             |
| `forge tunnel`                           | Proxy Forge invocations to your local machine       |
| `forge logs`                             | Stream live logs from the deployed app              |

## CI

A GitHub Actions workflow at [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs automatically on every push and pull request. It:

1. Installs all workspace dependencies with a single `yarn install` (Yarn 4 via Corepack)
2. Type-checks the API package (`tsc --noEmit`)
3. Runs the API Jest test suite
4. Type-checks and builds the UI package (`vue-tsc` + Vite)
5. Runs the UI Vitest suite

## Testing

API unit tests cover the FeatBit API client (`src/api/src/featbit.ts`) and all resolver handlers (`src/api/src/index.ts`). Tests run with [Jest](https://jestjs.io/) via [ts-jest](https://kulshekhar.github.io/ts-jest/) and do not require a running FeatBit instance — all external dependencies (`@forge/api`, `@forge/resolver`, `fetch`) are mocked.

```bash
yarn test
```

### Test layout

| File                            | What it covers                                                                                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/api/tests/featbit.test.ts` | `listProjects`, `listFlagsByTag`, `searchFlags`, `createFlag`, `updateFlagTags` — correct URLs, request headers/bodies, response parsing, URL-encoding, error propagation |
| `src/api/tests/index.test.ts`   | All 7 resolver handlers — config CRUD, environment discovery, flag querying (including parent-epic tag logic and flag de-duplication), flag creation and linking          |

### Manual Regression Testing

The script found [here](QA_TEST_SCRIPT.md) is a useful guide for testing the UI for
regression issues.

### Coverage

Run both test suites with coverage enabled:

```bash
yarn test:coverage
```

This prints a per-file coverage table to the console and writes `lcov.info` files for each package:

| Package             | Output                       |
| ------------------- | ---------------------------- |
| `@featbit-jira/api` | `src/api/coverage/lcov.info` |
| `@featbit-jira/ui`  | `src/ui/coverage/lcov.info`  |

You can open the HTML report locally:

```bash
# API
open src/api/coverage/lcov-report/index.html

# UI
open src/ui/coverage/lcov-report/index.html
```

To run coverage for a single package:

```bash
yarn workspace @featbit-jira/api test:coverage
yarn workspace @featbit-jira/ui test:coverage
```

### Mocking strategy

- **`@forge/resolver`** — the `Resolver` constructor mock captures each `resolver.define()` call so tests can invoke handlers directly without the Forge runtime.
- **`@forge/api`** — `storage.get`/`storage.set` are `jest.fn()` mocks; the Jira API client (`api.asApp().requestJira`) is mocked per-test to simulate different issue shapes (story with parent epic, standalone epic, etc.).
- **`../src/featbit`** — auto-mocked (relative to `src/api/tests/`) so resolver tests are fully isolated from HTTP.
- **`global.fetch`** — replaced with a `jest.fn()` in `featbit.test.ts` so HTTP behaviour can be verified without network access.

## Resources

- [Forge Documentation](https://developer.atlassian.com/platform/forge/)
- [Forge API Reference](https://developer.atlassian.com/platform/forge/apis/)
