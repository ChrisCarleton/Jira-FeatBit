---
name: featbit-api
description: 'Expert guidance for working with the FeatBit REST API. Use for: calling FeatBit API endpoints, authenticating with access tokens, managing feature flags via API, toggling flags, creating/updating segments, paginating results, using JSON patch, reading API responses, handling errors, managing projects/environments/members/policies via API. Keywords: FeatBit API, Authorization header, access token, feature flag CRUD, REST API calls, envId, OpenAPI.'
argument-hint: "Describe what you want to do with the FeatBit API (e.g., 'toggle a feature flag', 'list all flags', 'create a segment')"
---

# FeatBit REST API

Expert guidance for calling the FeatBit REST API (v1) to manage feature flags, segments, projects, environments, members, policies, and more.

> **Do NOT use this API to evaluate feature flags in application code.** Use FeatBit SDKs for that — they provide caching and streaming that the REST API does not.

## Authentication — CRITICAL

**Every request requires an `Authorization` header.** No other authentication mechanism is supported.

```
Authorization: YOUR-ACCESS-TOKEN
```

> **No `Bearer` prefix.** FeatBit uses raw token auth — do NOT prepend `Bearer `. Sending `Authorization: Bearer <token>` will result in a 401 Unauthorized.

- Tokens are created at **Integrations → Access tokens** in the FeatBit UI
- Two token types:
  - **Personal token** — inherits your permissions; automatically downgraded if your permissions are reduced
  - **Service token** — independent of your profile; permissions fixed at creation; preferred for long-lived integrations
- Tokens are shown **once** at creation — copy and store securely immediately
- A deactivated token returns `403 Forbidden`
- Apply **least privilege**: only grant permissions the token actually needs

### Required Headers

| Header          | Required                       | Value                                   |
| --------------- | ------------------------------ | --------------------------------------- |
| `Authorization` | **Always**                     | Your access token (personal or service) |
| `Content-Type`  | For POST/PUT/PATCH with a body | `application/json`                      |
| `Organization`  | Some endpoints                 | Organization UUID                       |
| `Workspace`     | Some endpoints                 | Workspace UUID                          |

### curl Example

```bash
curl -X GET \
  'http://YOUR_API_HOST/api/v1/envs/{envId}/feature-flags' \
  -H 'Authorization: YOUR-ACCESS-TOKEN' \
  -H 'Content-Type: application/json'
```

For a local instance the base URL is `http://localhost:5000`. For the hosted demo it is `https://app-api.featbit.co`.

---

## Data Hierarchy

```
Workspace
└── Organization(s)
    └── Project(s)
        └── Environment(s)
            ├── Feature Flags  (environment-specific)
            └── Segments       (environment-specific OR shared)
```

- Feature flags and their targeting rules are **scoped to an environment** — you must supply `envId` for all flag operations
- Get environment IDs from **Organization → Projects** in the UI (click "Copy Id")

---

## Response Format

All endpoints return JSON with a consistent envelope:

```json
{
  "success": true,
  "errors": [],
  "data": { ... }
}
```

On failure:

```json
{
  "success": false,
  "errors": ["Unauthorized"],
  "data": null
}
```

Common HTTP status codes: `200 OK`, `401 Unauthorized`, `403 Forbidden`.

---

## Pagination

Paginated endpoints accept `PageIndex` (0-based, default `0`) and `PageSize` (default `10`) as query parameters. Responses include `totalCount` and `items`:

```json
{
  "data": {
    "totalCount": 42,
    "items": [ ... ]
  }
}
```

---

## Feature Flags

All flag endpoints use the base path `/api/v1/envs/{envId}/feature-flags`.

| Operation                   | Method | Path                                                       |
| --------------------------- | ------ | ---------------------------------------------------------- |
| List flags                  | GET    | `/api/v1/envs/{envId}/feature-flags`                       |
| Get flag                    | GET    | `/api/v1/envs/{envId}/feature-flags/{key}`                 |
| Create flag                 | POST   | `/api/v1/envs/{envId}/feature-flags`                       |
| Delete flag                 | DELETE | `/api/v1/envs/{envId}/feature-flags/{key}`                 |
| Partial update (JSON Patch) | PATCH  | `/api/v1/envs/{envId}/feature-flags/{key}`                 |
| Toggle on/off               | PUT    | `/api/v1/envs/{envId}/feature-flags/{key}/toggle/{status}` |
| Update name                 | PUT    | `/api/v1/envs/{envId}/feature-flags/{key}/name`            |
| Update description          | PUT    | `/api/v1/envs/{envId}/feature-flags/{key}/description`     |
| Update variations           | PUT    | `/api/v1/envs/{envId}/feature-flags/{key}/variations`      |
| Update off-variation        | PUT    | `/api/v1/envs/{envId}/feature-flags/{key}/off-variation`   |
| Archive flag                | PUT    | `/api/v1/envs/{envId}/feature-flags/{key}/archive`         |
| Restore flag                | PUT    | `/api/v1/envs/{envId}/feature-flags/{key}/restore`         |
| Clone flag                  | POST   | `/api/v1/envs/{envId}/feature-flags/clone/{key}`           |
| Set tags                    | PUT    | `/api/v1/envs/{envId}/feature-flags/{key}/tags`            |
| Get all tags                | GET    | `/api/v1/envs/{envId}/feature-flags/all-tags`              |
| Pending changes             | GET    | `/api/v1/envs/{envId}/feature-flags/{key}/pending-changes` |

### List Flags — Query Parameters

| Parameter                | Type     | Description                             |
| ------------------------ | -------- | --------------------------------------- |
| `Name`                   | string   | Filter by name/key (partial match)      |
| `Tags`                   | string[] | Filter by tags (exact match)            |
| `IsEnabled`              | boolean  | Filter by enabled status                |
| `IsArchived`             | boolean  | Filter archived flags (default `false`) |
| `SortBy`                 | string   | Sort field (default `createdAt`)        |
| `PageIndex` / `PageSize` | int      | Pagination                              |

### Create Flag — Request Body

```json
{
  "envId": "uuid",
  "name": "My Flag",
  "key": "my-flag",
  "isEnabled": false,
  "description": "optional",
  "variationType": "boolean",
  "variations": [
    { "id": "uuid-must-be-provided", "value": "true" },
    { "id": "uuid-must-be-provided", "value": "false" }
  ],
  "enabledVariationId": "uuid-of-true-variation",
  "disabledVariationId": "uuid-of-false-variation",
  "tags": []
}
```

> **`id` is required on every variation** — omitting it causes a `variations_is_invalid` 400 error. Generate UUIDs client-side (e.g. `crypto.randomUUID()`). `enabledVariationId` and `disabledVariationId` must also be provided and match variation IDs.

### Toggle Flag

```bash
PUT /api/v1/envs/{envId}/feature-flags/{key}/toggle/true   # enable
PUT /api/v1/envs/{envId}/feature-flags/{key}/toggle/false  # disable
```

### JSON Patch Update

Use JSON Patch (RFC 6902) for partial updates to flags or segments:

```json
[
  { "op": "replace", "path": "/name", "value": "New Name" },
  { "op": "replace", "path": "/description", "value": "New description" }
]
```

Variations/targeting updates that need **optimistic concurrency** require the `revision` UUID from the flag's current state.

---

## Segments

All segment endpoints use the base path `/api/v1/envs/{envId}/segments`.

| Operation                   | Method | Path                                                     |
| --------------------------- | ------ | -------------------------------------------------------- |
| List segments               | GET    | `/api/v1/envs/{envId}/segments`                          |
| Get segment                 | GET    | `/api/v1/envs/{envId}/segments/{id}`                     |
| Get by IDs                  | GET    | `/api/v1/envs/{envId}/segments/by-ids?ids=uuid&ids=uuid` |
| Create segment              | POST   | `/api/v1/envs/{envId}/segments`                          |
| Delete segment              | DELETE | `/api/v1/envs/{envId}/segments/{id}`                     |
| Partial update (JSON Patch) | PATCH  | `/api/v1/envs/{envId}/segments/{id}`                     |
| Update name                 | PUT    | `/api/v1/envs/{envId}/segments/{id}/name`                |
| Update description          | PUT    | `/api/v1/envs/{envId}/segments/{id}/description`         |
| Update targeting rules      | PUT    | `/api/v1/envs/{envId}/segments/{id}/targeting`           |
| Archive                     | PUT    | `/api/v1/envs/{envId}/segments/{id}/archive`             |
| Restore                     | PUT    | `/api/v1/envs/{envId}/segments/{id}/restore`             |
| Flag references             | GET    | `/api/v1/envs/{envId}/segments/{id}/flag-references`     |
| Set tags                    | PUT    | `/api/v1/envs/{envId}/segments/{id}/tags`                |
| Get all tags                | GET    | `/api/v1/envs/{envId}/segments/all-tags`                 |

Segment `type` can be `"environment-specific"` or `"shared"`. Shared segments have `scopes` (array of environment IDs).

---

## Projects & Environments

### Projects

| Operation      | Method | Path                           |
| -------------- | ------ | ------------------------------ |
| List projects  | GET    | `/api/v1/projects`             |
| Get project    | GET    | `/api/v1/projects/{projectId}` |
| Create project | POST   | `/api/v1/projects`             |
| Update project | PUT    | `/api/v1/projects/{id}`        |
| Delete project | DELETE | `/api/v1/projects/{id}`        |

Create project body: `{ "organizationId": "uuid", "name": "...", "key": "..." }`

### Environments

| Operation          | Method | Path                                        |
| ------------------ | ------ | ------------------------------------------- |
| Get environment    | GET    | `/api/v1/projects/{projectId}/envs/{envId}` |
| Create environment | POST   | `/api/v1/projects/{projectId}/envs`         |
| Update environment | PUT    | `/api/v1/projects/{projectId}/envs/{id}`    |
| Delete environment | DELETE | `/api/v1/projects/{projectId}/envs/{id}`    |

---

## Members, Groups & Policies

### Members (`/api/v1/members`)

| Operation             | Method | Path                                                  |
| --------------------- | ------ | ----------------------------------------------------- |
| List members          | GET    | `/api/v1/members`                                     |
| Get member            | GET    | `/api/v1/members/{memberId}`                          |
| Remove from org       | DELETE | `/api/v1/members/remove-from-org/{memberId}`          |
| Remove from workspace | DELETE | `/api/v1/members/remove-from-workspace/{memberId}`    |
| Add policy            | PUT    | `/api/v1/members/{memberId}/add-policy/{policyId}`    |
| Remove policy         | PUT    | `/api/v1/members/{memberId}/remove-policy/{policyId}` |
| Get member groups     | GET    | `/api/v1/members/{memberId}/groups`                   |
| Get member policies   | GET    | `/api/v1/members/{memberId}/policies`                 |

### Groups (`/api/v1/groups`)

CRUD plus: add/remove members, add/remove policies.

### Policies (`/api/v1/policies`)

CRUD plus: clone, set statements, assign to members/groups.

Policy statements define RBAC rules with `resourceType`, `effect` (`allow`/`deny`), `actions`, and `resources`.

---

## Workspace

| Operation        | Method | Path                          |
| ---------------- | ------ | ----------------------------- |
| Get workspace    | GET    | `/api/v1/workspaces`          |
| Update workspace | PUT    | `/api/v1/workspaces`          |
| Update license   | PUT    | `/api/v1/workspaces/license`  |
| Update OIDC SSO  | PUT    | `/api/v1/workspaces/sso-oidc` |

Workspace ID is inferred from the `Workspace` request header.

---

## Audit Logs

```
GET /api/v1/envs/{envId}/audit-logs
```

Query params: `Query`, `CreatorId`, `RefId`, `RefType` (`FeatureFlag` or `Segment`), `From`/`To` (unix ms), `CrossEnvironment`, `PageIndex`/`PageSize`.

---

## Common Patterns

### Get environment ID

1. Go to **Organization → Projects**
2. Find the project and environment
3. Click **Copy Id** to get the `envId` UUID

### Always include both required headers

```bash
-H 'Authorization: YOUR-ACCESS-TOKEN' \
-H 'Content-Type: application/json'
```

### Context headers for multi-org/workspace setups

Some endpoints require `Organization` and/or `Workspace` headers (the UUID, not the name).

### OpenAPI Spec

Full interactive spec: https://app-api.featbit.co/docs/index.html  
Download JSON: https://app-api.featbit.co/swagger/OpenApi/swagger.json  
Self-hosted: `http://YOUR_API_HOST/docs`
