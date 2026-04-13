# FeatBit for Jira — Slack Notification Setup Guide

This guide covers everything a **Slack workspace administrator** needs to create a Slack app and generate a bot token so that the FeatBit Jira integration can post notifications to a Slack channel.

No development knowledge or access to the source code is required.

---

## Overview

When Slack notifications are configured, the FeatBit Jira integration will post a message to a chosen channel whenever a team member:

- Creates a new feature flag from a Jira issue
- Toggles a feature flag on or off from a Jira issue
- Links an existing flag to a Jira issue

---

## Prerequisites

| Requirement                              | Notes                                                           |
| ---------------------------------------- | --------------------------------------------------------------- |
| Slack workspace admin or owner access    | Required to create and install a Slack app                      |
| The FeatBit Jira app already configured  | Complete the steps in JIRA_SETUP.md first                       |
| A Slack channel to receive notifications | Can be an existing channel or a new one (e.g. `#feature-flags`) |

---

## Step 1 — Create a new Slack app

The fastest way is to create the app from the manifest below, which configures the name, bot user, and required scopes in one step.

### Option A — From an app manifest (recommended)

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and sign in with your Slack workspace admin account.
2. Click **Create New App**.
3. Select **From an app manifest**.
4. Select your **workspace** and click **Next**.
5. Replace the contents of the manifest editor with the JSON below and click **Next**.

```json
{
  "display_information": {
    "name": "FeatBit Notifications",
    "description": "Posts feature flag activity from Jira to Slack"
  },
  "features": {
    "bot_user": {
      "display_name": "FeatBit Notifications",
      "always_online": false
    },
    "app_home": {
      "messages_tab_enabled": false,
      "messages_tab_read_only_enabled": false
    }
  },
  "oauth_config": {
    "scopes": {
      "bot": ["chat:write"]
    }
  },
  "settings": {
    "org_deploy_enabled": false,
    "socket_mode_enabled": false,
    "token_rotation_enabled": false
  }
}
```

> **Optional:** If you want the bot to post to _any_ public channel without being invited first, add `"chat:write.public"` to the `bot` scopes array before clicking Next. Without it (recommended for security), you will need to invite the bot to your notification channel in Step 4.

6. Review the summary and click **Create**.

**Skip Step 2** — the manifest has already configured the required scope.

### Option B — From scratch

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and click **Create New App → From scratch**.
2. Enter an **App Name** (e.g. `FeatBit Notifications`), select your workspace, and click **Create App**.

---

## Step 2 — Add the required permission scope

> **Skip this step if you used Option A (app manifest) in Step 1.**

The app needs only a single permission to post messages.

1. In the left sidebar of your new app's settings page, click **OAuth & Permissions**.
2. Scroll down to the **Scopes** section.
3. Under **Bot Token Scopes**, click **Add an OAuth Scope**.
4. Search for and select **`chat:write`**.

> **Optional:** Also add **`chat:write.public`** to allow posting to any public channel without an explicit invitation. Without it you must invite the bot to the channel in Step 4.

---

## Step 3 — Install the app to your workspace

1. Scroll to the top of the **OAuth & Permissions** page.
2. Click **Install to Workspace**.
3. Review the permissions summary and click **Allow**.
4. You will be returned to the **OAuth & Permissions** page. Copy the **Bot User OAuth Token** — it begins with `xoxb-`.

> **Important:** Store this token securely. It grants the ability to post messages to your Slack workspace. Do not share it in chat or commit it to source control.

---

## Step 4 — Invite the bot to your notification channel

> Skip this step if you added the `chat:write.public` scope in Step 2.

1. In Slack, open the channel you want notifications sent to.
2. Type `/invite @FeatBit Notifications` (or whatever name you gave the app) and press Enter.
3. Confirm the invitation when prompted.

---

## Step 5 — Find the channel ID

Slack requires the channel's **ID** (not its display name) to send messages reliably.

1. In Slack, right-click the notification channel in the sidebar and select **View channel details**.
2. Scroll to the bottom of the details pane. The **Channel ID** is shown there (e.g. `C012AB3CD`).
3. Copy the channel ID.

> **Alternative:** Open the channel in a browser. The channel ID is the last segment of the URL, e.g. `https://app.slack.com/client/T012AB3CD/**C012AB3CD**`.

---

## Step 6 — Enter the credentials in the FeatBit Jira settings

1. In Jira, open **Apps → FeatBit Settings**.
2. Scroll down to the **Slack Notifications** section.
3. Paste your `xoxb-...` token into the **Slack Bot Token** field.
4. Paste the channel ID into the **Channel ID** field.
5. Click **Save settings**.

The bot token is stored securely inside Atlassian's Forge infrastructure and is never exposed to the browser or returned by the API.

---

## Verification

To confirm everything is working:

1. Open any Jira issue.
2. Create or toggle a feature flag using the FeatBit panel.
3. Check your Slack channel — a notification message should appear within a few seconds.

If no message appears, check the following:

| Symptom                     | Likely cause                                                            |
| --------------------------- | ----------------------------------------------------------------------- |
| No message in channel       | Bot not invited to the channel (see Step 4)                             |
| "channel_not_found" in logs | Incorrect channel ID entered in settings (see Step 5)                   |
| "invalid_auth" in logs      | Bot token copied incorrectly or has been revoked — regenerate in Step 3 |
| "missing_scope" in logs     | `chat:write` scope was not added — revisit Step 2                       |

---

## Revoking access

To stop the integration from posting to Slack:

- **Temporarily:** Clear the Bot Token field in **Apps → FeatBit Settings** and save.
- **Permanently:** Go to [api.slack.com/apps](https://api.slack.com/apps), open the app, and click **Delete App** — or revoke the token under **OAuth & Permissions → Revoke Token**.
