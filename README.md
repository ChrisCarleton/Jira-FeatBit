# featbit-jira

Atlassian Forge app that integrates [FeatBit](https://github.com/featbit/featbit) feature flags directly into Jira. From any Jira ticket you can view linked flags across multiple environments, create new flags, and link existing ones — all without leaving Jira.

## How it works

FeatBit flags are linked to Jira tickets using **FeatBit tags**. When a flag is tagged with a Jira issue key (e.g. `PROJ-123`), it appears in that ticket's feature flag panel. Flags tagged with a parent epic's key are also surfaced on all child tickets.

The app consists of two parts:

- **Forge backend** (`src/`) — TypeScript resolver functions that run server-side inside Atlassian's infrastructure. They call the FeatBit REST API and use Forge Storage to persist configuration. The FeatBit access token is stored here and never sent to the browser.
- **Custom UI frontend** (`static/`) — A React app served by Forge. It calls the backend resolvers via `@forge/bridge`. It renders as either the issue panel or the settings page depending on which Forge module loaded it.

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

```
featbit-jira/
├── manifest.yml              # Forge app manifest — modules, permissions, resource
├── package.json              # Backend dependencies (Yarn, ESM)
├── tsconfig.json             # Backend TypeScript config
├── tsconfig.test.json        # TypeScript config used by Jest (CommonJS, includes tests/)
├── jest.config.cjs           # Jest configuration
├── docker-compose.yml        # Local FeatBit instance for testing
│
├── src/
│   ├── index.ts              # All Forge resolver functions (the backend entry point)
│   └── featbit.ts            # FeatBit REST API client
│
├── tests/
│   ├── featbit.test.ts       # Unit tests for the FeatBit API client
│   └── index.test.ts         # Unit tests for all Forge resolver handlers
│
└── static/                   # Custom UI (React + Vite)
    ├── index.html
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    └── src/
        ├── main.tsx          # React entry point
        ├── App.tsx           # Renders IssuePanel or Settings based on moduleKey
        ├── api.ts            # Typed invoke() wrappers (bridge → resolver)
        ├── types.ts          # Shared TypeScript interfaces
        ├── views/
        │   ├── IssuePanel.tsx   # Panel shown on every Jira issue
        │   └── Settings.tsx     # Global settings page
        └── components/
            ├── FlagTable.tsx        # Multi-environment flag status table
            ├── CreateFlagModal.tsx  # Create a new flag modal
            └── LinkFlagModal.tsx    # Search and link an existing flag modal
```

## Forge modules

| Module            | Key                   | Description                                                                           |
| ----------------- | --------------------- | ------------------------------------------------------------------------------------- |
| `jira:issuePanel` | `featbit-flags-panel` | Shown on every Jira issue. Displays linked flags.                                     |
| `jira:globalPage` | `featbit-settings`    | Admin page for entering the FeatBit API URL, access token and selecting environments. |

Both modules share the same React app entry point (`static/dist`). `App.tsx` reads `ctx.moduleKey` from the Forge context to decide which view to render.

## Resolver functions

All backend logic lives in `src/index.ts`. Each resolver is called from the frontend via `invoke()`.

| Resolver            | Description                                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getConfig`         | Returns stored API URL, environment list, and whether a token is saved (token itself is never returned).                                                            |
| `saveConfig`        | Persists API URL, access token, and environment list to Forge Storage.                                                                                              |
| `fetchEnvironments` | Calls the FeatBit API with supplied credentials to discover all projects and their environments (used during setup to test the connection).                         |
| `getFlagsForIssue`  | Given an issue key, queries each configured environment for flags tagged with that key or its parent epic's key. Returns a merged list with per-environment status. |
| `searchFlags`       | Full-text search of flags by name or key in the primary environment. Used by the "Link existing flag" modal.                                                        |
| `createFlag`        | Creates a boolean flag in all configured environments simultaneously, pre-tagged with the issue key.                                                                |
| `linkFlag`          | Adds the issue key tag to an existing flag across all environments.                                                                                                 |

## FeatBit API client (`src/featbit.ts`)

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

### 1. Install dependencies

```bash
# Backend
yarn install

# Frontend
cd static && yarn install && cd ..
```

### 2. Start a local FeatBit instance (optional, for testing)

```bash
docker compose up -d
```

Services:
| | URL |
|---|---|
| Admin UI | http://localhost:8081 |
| API server | http://localhost:5000 |
| Evaluation server | http://localhost:5100 |

Default credentials: `test@featbit.com` / `123456`

Tear down: `docker compose down` (keep data) or `docker compose down -v` (wipe data).

### 3. Register the Forge app

```bash
forge login
forge register       # first time only — updates app.id in manifest.yml
```

### 4. Build and deploy

```bash
# Build the frontend first — Forge deploys the pre-built static/dist/
cd static && yarn build && cd ..

yarn build           # compile backend TypeScript to dist/
forge deploy
forge install        # install in your Jira cloud site
```

### 5. Configure the app in Jira

1. In Jira, open **Apps → FeatBit Settings**.
2. Enter your FeatBit API URL (e.g. `http://localhost:5000` for local Docker).
3. Enter your FeatBit access token.
4. Click **Test connection & load environments**, choose the environments you want visible, then **Save settings**.

## Development workflow

### Backend changes

Edit files in `src/`, then:

```bash
yarn build && forge deploy
```

Or, for a faster iteration loop with live tunnelling:

```bash
# Terminal 1 — rebuild on change
yarn build --watch

# Terminal 2 — tunnel (proxies Forge invocations to your local process)
forge tunnel
```

### Frontend changes

```bash
# Terminal 1 — Vite dev server on :3000
cd static && yarn dev

# Terminal 2 — tunnel with Custom UI port forwarding
forge tunnel
```

Forge tunnel proxies the Custom UI resource to `localhost:3000` during development, so hot-reload works normally.

### After frontend changes are ready for deployment

```bash
cd static && yarn build && cd ..
forge deploy
```

## Useful commands

| Command                   | What it does                                  |
| ------------------------- | --------------------------------------------- |
| `yarn build`              | Compile backend TypeScript                    |
| `yarn test`               | Run the backend unit test suite               |
| `yarn lint`               | ESLint the backend source                     |
| `yarn lint:fix`           | Auto-fix lint issues                          |
| `yarn format`             | Prettier-format backend source                |
| `forge deploy`            | Deploy the app to Atlassian infrastructure    |
| `forge install`           | Install the deployed app in a Jira site       |
| `forge tunnel`            | Proxy Forge invocations to your local machine |
| `forge logs`              | Stream live logs from the deployed app        |
| `cd static && yarn dev`   | Start Vite dev server for the frontend        |
| `cd static && yarn build` | Build the frontend for deployment             |

- `src/index.ts` - Main resolver functions
- `manifest.yml` - Forge app configuration
- `tsconfig.json` - TypeScript configuration

## Testing

Backend unit tests cover the FeatBit API client (`src/featbit.ts`) and all resolver handlers (`src/index.ts`). Tests run with [Jest](https://jestjs.io/) via [ts-jest](https://kulshekhar.github.io/ts-jest/) and do not require a running FeatBit instance — all external dependencies (`@forge/api`, `@forge/resolver`, `fetch`) are mocked.

```bash
yarn test
```

### Test layout

| File                    | What it covers                                                                                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/featbit.test.ts` | `listProjects`, `listFlagsByTag`, `searchFlags`, `createFlag`, `updateFlagTags` — correct URLs, request headers/bodies, response parsing, URL-encoding, error propagation |
| `tests/index.test.ts`   | All 7 resolver handlers — config CRUD, environment discovery, flag querying (including parent-epic tag logic and flag de-duplication), flag creation and linking          |

### Mocking strategy

- **`@forge/resolver`** — the `Resolver` constructor mock captures each `resolver.define()` call so tests can invoke handlers directly without the Forge runtime.
- **`@forge/api`** — `storage.get`/`storage.set` are `jest.fn()` mocks; the Jira API client (`api.asApp().requestJira`) is mocked per-test to simulate different issue shapes (story with parent epic, standalone epic, etc.).
- **`../src/featbit`** — auto-mocked so resolver tests are fully isolated from HTTP.
- **`global.fetch`** — replaced with a `jest.fn()` in `featbit.test.ts` so HTTP behaviour can be verified without network access.

## Resources

- [Forge Documentation](https://developer.atlassian.com/platform/forge/)
- [Forge API Reference](https://developer.atlassian.com/platform/forge/apis/)
