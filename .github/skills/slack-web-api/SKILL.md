---
name: slack-web-api
description: 'Expert guidance for sending Slack messages using @slack/web-api. Use when: posting messages to Slack channels, building Block Kit payloads, using WebClient, chat.postMessage, Slack bot tokens, handling Slack API errors, sending notifications from backend code. Keywords: @slack/web-api, WebClient, chat.postMessage, Block Kit, SectionBlock, KnownBlock, Slack bot token, xoxb, Slack notifications.'
argument-hint: "Describe what you want to do with Slack (e.g., 'post a Block Kit message', 'send a flag toggle notification', 'handle Slack API errors')"
---

# @slack/web-api — Slack Messaging

Expert guidance for using the official `@slack/web-api` Node.js SDK to post messages to Slack using bot tokens and the `chat.postMessage` API.

> **Incoming webhooks are NOT deprecated.** They remain a supported, simpler option for posting to a single fixed channel. Use `@slack/web-api` when you need flexibility (dynamic channel targeting, other API methods, typed Block Kit) or when you already have a bot token.

---

## Setup

```bash
npm install @slack/web-api
```

### Authentication — Bot Token

The `WebClient` requires a Slack **bot token** (`xoxb-...`). Obtain one by:

1. Creating a Slack app at https://api.slack.com/apps
2. Adding the `chat:write` OAuth scope under **OAuth & Permissions**
3. Installing the app to your workspace
4. Copying the **Bot User OAuth Token** (`xoxb-...`) from **OAuth & Permissions**

> The bot must be **invited to the channel** before it can post there, unless posting to a public channel with `chat:write.public` scope.

---

## Send a Message

```typescript
import { WebClient } from '@slack/web-api';

const client = new WebClient(botToken);

await client.chat.postMessage({
  channel: 'C012AB3CD', // channel ID, not name
  text: 'Fallback text', // required for notifications/accessibility
  blocks: [
    /* Block Kit blocks */
  ],
});
```

**Key rules:**

- `channel` must be a **channel ID** (e.g. `C012AB3CD`), not a name. Find it in Slack: right-click channel → Copy link → ID is the last segment.
- `text` is required even when using `blocks` — it's used as the notification preview and screen-reader fallback.
- Response includes `ts` (message timestamp), useful for threading replies.

---

## Block Kit

The package exports typed Block Kit interfaces. Import only what you need:

```typescript
import type {
  KnownBlock,
  SectionBlock,
  ContextBlock,
  DividerBlock,
} from '@slack/web-api';
```

### Common Pattern — Notification Card

```typescript
function buildNotificationBlocks(params: {
  title: string;
  detail: string;
  actorName: string;
  url?: string;
}): KnownBlock[] {
  const blocks: KnownBlock[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${params.title}*\n${params.detail}`,
      },
      // Optional button in the accessory position:
      ...(params.url && {
        accessory: {
          type: 'button',
          text: { type: 'plain_text', text: 'View in FeatBit', emoji: true },
          url: params.url,
        },
      }),
    } satisfies SectionBlock,
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `By *${params.actorName}*` }],
    } satisfies ContextBlock,
  ];
  return blocks;
}
```

### Mrkdwn Formatting

| Syntax         | Result      |
| -------------- | ----------- | ------------------------ |
| `*bold*`       | **bold**    |
| `_italic_`     | _italic_    |
| `~strike~`     | ~~strike~~  |
| `<https://url  | link text>` | [link text](https://url) |
| `:emoji_name:` | emoji       |
| `` `code` ``   | `code`      |

---

## Error Handling

```typescript
import { WebClient, ErrorCode } from '@slack/web-api';

try {
  await client.chat.postMessage({ channel, text, blocks });
} catch (err: unknown) {
  if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === ErrorCode.PlatformError
  ) {
    // Slack returned an API error (e.g. channel_not_found, not_in_channel)
    console.error('Slack API error:', (err as { data: unknown }).data);
  }
  // All other errors (network, etc.) fall through here
}
```

**Common Slack API errors:**
| Error | Cause |
|-------|-------|
| `not_in_channel` | Bot not invited to the channel |
| `channel_not_found` | Bad channel ID |
| `invalid_auth` | Bad or revoked token |
| `missing_scope` | Token lacks `chat:write` scope |

---

## Best-effort Fire-and-Forget Pattern

For notifications that should never block the main operation:

```typescript
async function sendSlackNotification(
  token: string,
  channelId: string,
  blocks: KnownBlock[],
  text: string
): Promise<void> {
  try {
    const client = new WebClient(token);
    await client.chat.postMessage({ channel: channelId, text, blocks });
  } catch {
    // Best-effort — never fail the primary operation
  }
}
```

---

## Forge Compatibility Note

This app runs on **Atlassian Forge** (Node.js 20). The existing codebase uses `api.fetch` from `@forge/api` for HTTP calls, which wraps Forge's sandboxed fetch.

`@slack/web-api` uses **axios** internally. As long as the Forge manifest permits outbound HTTPS (`'*'` in `permissions.external.fetch.backend`), this should work in production. The manifest in this repo already has `'*'`, so no changes are needed.

> **If issues arise** with axios in Forge's sandbox, you can fall back to a raw `api.fetch`-based implementation that POSTs to `https://slack.com/api/chat.postMessage` directly with `Authorization: Bearer <token>` and `Content-Type: application/json`. This is functionally equivalent for `chat.postMessage`.

---

## Stored Config Fields

For this app, Slack credentials are stored in Forge KVS alongside FeatBit config:

| KVS Field        | Type   | Notes                                                                 |
| ---------------- | ------ | --------------------------------------------------------------------- |
| `slackBotToken`  | string | `xoxb-...`; sensitive — masked in frontend (`hasSlackToken: boolean`) |
| `slackChannelId` | string | e.g. `C012AB3CD`; not sensitive — shown in settings UI                |

**Frontend masking pattern** (same as FeatBit `accessToken`):

- `getConfig` resolver returns `hasSlackToken: Boolean(cfg.slackBotToken)` (never the raw token)
- `saveConfig` resolver: if `slackBotToken` is blank, preserve the stored one
- Settings page: password-type input; placeholder `"(token saved – leave blank to keep)"` when `hasSlackToken` is true
