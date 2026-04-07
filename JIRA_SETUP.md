# FeatBit for Jira — Administrator Setup Guide

This guide covers everything a **Jira or FeatBit administrator** needs to install and configure the FeatBit integration. No development knowledge or access to the source code is required.

---

## Overview

The integration adds a **FeatBit Flags** panel to every Jira issue. Team members can view which feature flags are linked to a ticket, see their status across environments, toggle them on or off, create new flags, and link existing ones — without leaving Jira.

Flags are linked to issues via **FeatBit tags**: when a flag carries a tag matching a Jira issue key (e.g. `PROJ-123`), it surfaces in that issue's panel. Flags tagged with an epic's key automatically appear on all child stories too.

---

## Prerequisites

| Requirement                       | Notes                                                                              |
| --------------------------------- | ---------------------------------------------------------------------------------- |
| Jira Cloud site with admin access | Required to install Forge apps                                                     |
| FeatBit instance                  | Self-hosted or cloud; must be reachable from Atlassian infrastructure              |
| FeatBit admin access              | Required to create a service access token                                          |
| The app already deployed          | A developer must have run `forge deploy` and `forge install` before you begin here |

---

## Step 1 — Create a FeatBit service access token

The integration authenticates with FeatBit using a **Service Access Token**. This token is stored securely inside Atlassian's Forge infrastructure and is never exposed to the browser.

1. In the FeatBit Admin UI, go to **Integrations → Access Tokens** and click **Add**.
2. Enter a descriptive **Name** (e.g. `jira-integration`).
3. Set **Type** to `Service`.
4. Assign the following permissions:

   | Resource         | Permissions required               |
   | ---------------- | ---------------------------------- |
   | **Feature flag** | All resources — full access (`*`)  |
   | **Project**      | All resources — `CanAccessProject` |
   | **Environment**  | All resources — `CanAccessEnv`     |

5. Click **Save** and **copy the generated token immediately** — it will not be shown again.

> **Tip:** Name the token clearly (e.g. `jira-integration`) so that FeatBit audit log entries from the plugin are easy to identify.

---

## Step 2 — Configure the app in Jira

1. In Jira, open **Apps** in the top navigation and select **FeatBit Settings**.
2. In the **API URL** field, enter the base URL of your FeatBit API server (e.g. `https://featbit.your-company.com`). Do not include a trailing slash.
3. Paste the service access token you copied in Step 1 into the **Access token** field.
4. Click **Test connection & load environments**. If the connection succeeds, your FeatBit projects and environments will appear.
5. Select the **environments** you want visible in Jira issue panels. You can select multiple environments — each will appear as a separate column in the flags table.
6. Optionally, set a **Default environment** — this is pre-selected when team members create a new flag from within Jira.
7. Optionally, enter your **FeatBit portal URL** (e.g. `https://featbit.your-company.com`). When set, flag names in the panel become clickable links that open the flag's targeting page in FeatBit.
8. Click **Save settings**.

---

## Step 3 — Verify the integration

1. Open any Jira issue.
2. The **FeatBit Flags** panel should appear in the right-hand sidebar.
   - If no flags are linked yet, the panel will show a prompt to create or link a flag.
   - If the panel shows a configuration error, revisit Step 2 and confirm the API URL and token are correct.
3. Try clicking **+ Create flag** to create a test flag — it should appear in FeatBit tagged with the issue key.

---

## Troubleshooting

| Symptom                                 | Likely cause                                     | Resolution                                                                                                                      |
| --------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Panel shows "FeatBit is not configured" | Settings have not been saved                     | Complete Step 2                                                                                                                 |
| "Test connection" fails                 | Incorrect API URL or token; network connectivity | Verify the URL is reachable from outside your network (Atlassian calls it, not the user's browser); check the token permissions |
| No environments listed after test       | Token lacks `CanAccessProject` / `CanAccessEnv`  | Re-create the token with the permissions in Step 1                                                                              |
| Flags not appearing on an issue         | Flag is not tagged with the issue key            | Tag the flag in FeatBit with the exact Jira issue key, or link it via the panel                                                 |
| Toggle has no effect                    | Token lacks Feature flag write permission        | Re-create the token ensuring the Feature flag `*` permission is granted                                                         |

---

## Security notes

- The FeatBit access token is stored in **Atlassian Forge Storage**, a server-side key-value store. It is never transmitted to users' browsers.
- The token grants management-API access to your FeatBit instance. Treat it like a password — rotate it if it is ever leaked.
- Only users with the **Jira global admin** role can access the FeatBit Settings page.
