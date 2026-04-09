import { WebClient } from '@slack/web-api';
import type { KnownBlock, SectionBlock, ContextBlock } from '@slack/web-api';

/**
 * Sends a Slack message. Best-effort — never throws so that a Slack failure
 * cannot block the primary flag operation.
 */
export async function sendSlackNotification(
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

export function buildFlagCreatedBlocks(params: {
  name: string;
  key: string;
  actorName: string;
  issueKey: string;
  envNames: string[];
  portalUrl?: string;
}): KnownBlock[] {
  const { name, key, actorName, issueKey, envNames, portalUrl } = params;
  const flagUrl = portalUrl
    ? `${portalUrl}/en/feature-flags/${key}/targeting`
    : undefined;

  const titleText = `:triangular_flag_on_post: *Feature flag created: ${name}*\nKey: \`${key}\` · Issue: ${issueKey}`;

  const section: SectionBlock = {
    type: 'section',
    text: { type: 'mrkdwn', text: titleText },
    ...(flagUrl && {
      accessory: {
        type: 'button',
        text: { type: 'plain_text', text: 'View in FeatBit', emoji: true },
        url: flagUrl,
      },
    }),
  };

  const envList = envNames.length > 0 ? envNames.join(', ') : '(none)';
  const context: ContextBlock = {
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `By *${actorName}* · Environments: ${envList}`,
      },
    ],
  };

  return [section, context];
}

export function buildFlagToggledBlocks(params: {
  flagKey: string;
  enable: boolean;
  actorName: string;
  envName: string;
  issueKey?: string;
  portalUrl?: string;
}): KnownBlock[] {
  const { flagKey, enable, actorName, envName, issueKey, portalUrl } = params;
  const flagUrl = portalUrl
    ? `${portalUrl}/en/feature-flags/${flagKey}/targeting`
    : undefined;

  const emoji = enable ? ':white_check_mark:' : ':x:';
  const action = enable ? 'enabled' : 'disabled';
  const issueContext = issueKey ? ` · Issue: ${issueKey}` : '';
  const titleText = `${emoji} *Feature flag ${action}: \`${flagKey}\`*\nEnvironment: ${envName}${issueContext}`;

  const section: SectionBlock = {
    type: 'section',
    text: { type: 'mrkdwn', text: titleText },
    ...(flagUrl && {
      accessory: {
        type: 'button',
        text: { type: 'plain_text', text: 'View in FeatBit', emoji: true },
        url: flagUrl,
      },
    }),
  };

  const context: ContextBlock = {
    type: 'context',
    elements: [{ type: 'mrkdwn', text: `By *${actorName}*` }],
  };

  return [section, context];
}
