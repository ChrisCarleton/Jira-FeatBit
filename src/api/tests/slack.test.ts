// ---------------------------------------------------------------------------
// Mock @slack/web-api before imports. Using `var` ensures the variable
// declaration is hoisted alongside the jest.mock() call so the factory
// closure can assign to it before any import runs.
// ---------------------------------------------------------------------------

// eslint-disable-next-line no-var
var mockPostMessage: jest.Mock;

jest.mock('@slack/web-api', () => {
  mockPostMessage = jest.fn();
  return {
    __esModule: true,
    WebClient: jest.fn().mockImplementation(() => ({
      chat: { postMessage: mockPostMessage },
    })),
  };
});

// ---------------------------------------------------------------------------
// Imports — run after mocks are registered.
// ---------------------------------------------------------------------------

import { WebClient } from '@slack/web-api';
import type { SectionBlock, ContextBlock } from '@slack/web-api';
import {
  sendSlackNotification,
  buildFlagCreatedBlocks,
  buildFlagToggledBlocks,
} from '../src/slack';

const MockWebClient = WebClient as jest.MockedClass<typeof WebClient>;

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockPostMessage.mockResolvedValue({});
});

// ---------------------------------------------------------------------------
// sendSlackNotification
// ---------------------------------------------------------------------------

describe('sendSlackNotification', () => {
  const token = 'xoxb-test-token';
  const channelId = 'C12345';
  const text = 'Test message';
  const blocks: SectionBlock[] = [];

  it('creates a WebClient with the provided token', async () => {
    await sendSlackNotification(token, channelId, blocks, text);
    expect(MockWebClient).toHaveBeenCalledWith(token);
  });

  it('calls chat.postMessage with the correct arguments', async () => {
    await sendSlackNotification(token, channelId, blocks, text);
    expect(mockPostMessage).toHaveBeenCalledWith({
      channel: channelId,
      text,
      blocks,
    });
  });

  it('does not throw when chat.postMessage rejects', async () => {
    mockPostMessage.mockRejectedValueOnce(new Error('Slack is down'));
    await expect(
      sendSlackNotification(token, channelId, blocks, text)
    ).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// buildFlagCreatedBlocks
// ---------------------------------------------------------------------------

describe('buildFlagCreatedBlocks', () => {
  const baseParams = {
    name: 'My Feature Flag',
    key: 'my-feature-flag',
    actorName: 'Alice',
    issueKey: 'PROJ-42',
    envNames: ['Production', 'Staging'],
  };

  it('returns exactly two blocks', () => {
    expect(buildFlagCreatedBlocks(baseParams)).toHaveLength(2);
  });

  it('first block is a section whose text contains name, key, and issueKey', () => {
    const [section] = buildFlagCreatedBlocks(baseParams) as [SectionBlock];
    expect(section.type).toBe('section');
    expect(section.text?.text).toContain('My Feature Flag');
    expect(section.text?.text).toContain('my-feature-flag');
    expect(section.text?.text).toContain('PROJ-42');
  });

  it('section has a button accessory pointing to the flag when portalUrl is provided', () => {
    const [section] = buildFlagCreatedBlocks({
      ...baseParams,
      portalUrl: 'https://featbit.example.com',
    }) as [SectionBlock];
    expect(section.accessory?.type).toBe('button');
    expect((section.accessory as { url?: string }).url).toContain(
      'my-feature-flag'
    );
  });

  it('section has no accessory when portalUrl is omitted', () => {
    const [section] = buildFlagCreatedBlocks(baseParams) as [SectionBlock];
    expect(section.accessory).toBeUndefined();
  });

  it('context block lists actor name and environment names', () => {
    const [, context] = buildFlagCreatedBlocks(baseParams) as [
      SectionBlock,
      ContextBlock,
    ];
    expect(context.type).toBe('context');
    const element = context.elements[0] as { text: string };
    expect(element.text).toContain('Alice');
    expect(element.text).toContain('Production');
    expect(element.text).toContain('Staging');
  });

  it('context block shows (none) when envNames is empty', () => {
    const [, context] = buildFlagCreatedBlocks({
      ...baseParams,
      envNames: [],
    }) as [SectionBlock, ContextBlock];
    const element = context.elements[0] as { text: string };
    expect(element.text).toContain('(none)');
  });
});

// ---------------------------------------------------------------------------
// buildFlagToggledBlocks
// ---------------------------------------------------------------------------

describe('buildFlagToggledBlocks', () => {
  const baseParams = {
    flagKey: 'my-flag',
    enable: true,
    actorName: 'Bob',
    envName: 'Production',
  };

  it('returns exactly two blocks', () => {
    expect(buildFlagToggledBlocks(baseParams)).toHaveLength(2);
  });

  it('title contains the enabled emoji and action text when enable is true', () => {
    const [section] = buildFlagToggledBlocks(baseParams) as [SectionBlock];
    expect(section.text?.text).toContain(':white_check_mark:');
    expect(section.text?.text).toContain('enabled');
    expect(section.text?.text).toContain('my-flag');
  });

  it('title contains the disabled emoji and action text when enable is false', () => {
    const [section] = buildFlagToggledBlocks({
      ...baseParams,
      enable: false,
    }) as [SectionBlock];
    expect(section.text?.text).toContain(':x:');
    expect(section.text?.text).toContain('disabled');
  });

  it('includes the issueKey in the title when provided', () => {
    const [section] = buildFlagToggledBlocks({
      ...baseParams,
      issueKey: 'PROJ-99',
    }) as [SectionBlock];
    expect(section.text?.text).toContain('PROJ-99');
  });

  it('does not mention an issue in the title when issueKey is omitted', () => {
    const [section] = buildFlagToggledBlocks(baseParams) as [SectionBlock];
    expect(section.text?.text).not.toContain('Issue:');
  });

  it('section has a button accessory pointing to the flag when portalUrl is provided', () => {
    const [section] = buildFlagToggledBlocks({
      ...baseParams,
      portalUrl: 'https://featbit.example.com',
    }) as [SectionBlock];
    expect(section.accessory?.type).toBe('button');
    expect((section.accessory as { url?: string }).url).toContain('my-flag');
  });

  it('section has no accessory when portalUrl is omitted', () => {
    const [section] = buildFlagToggledBlocks(baseParams) as [SectionBlock];
    expect(section.accessory).toBeUndefined();
  });

  it('context block identifies the actor', () => {
    const [, context] = buildFlagToggledBlocks(baseParams) as [
      SectionBlock,
      ContextBlock,
    ];
    const element = context.elements[0] as { text: string };
    expect(element.text).toContain('Bob');
  });
});
