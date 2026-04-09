// Typed wrappers around @forge/bridge invoke() calls
import { invoke } from '@forge/bridge';
import type { Environment, FlagRow, SearchFlag, StoredConfig } from './types';

// ── Config ──────────────────────────────────────────────────────────────────

export async function getConfig(): Promise<StoredConfig | null> {
  return invoke<StoredConfig | null>('getConfig');
}

export async function saveConfig(payload: {
  apiUrl: string;
  accessToken: string;
  environments: Environment[];
  defaultEnvId?: string;
  portalUrl?: string;
  slackBotToken?: string;
  slackChannelId?: string;
}): Promise<{ success: boolean }> {
  return invoke('saveConfig', payload);
}

// ── Environment discovery (Settings page) ───────────────────────────────────

export async function fetchEnvironments(payload: {
  apiUrl: string;
  accessToken: string;
}): Promise<{ environments?: Environment[]; error?: string }> {
  return invoke('fetchEnvironments', payload);
}

// ── Issue panel ──────────────────────────────────────────────────────────────

export async function getFlagsForIssue(issueKey: string): Promise<{
  flags?: FlagRow[];
  environments?: Environment[];
  portalUrl?: string;
  canCreateFlag?: boolean;
  readOnlyEnvIds?: string[];
  error?: string;
}> {
  return invoke('getFlagsForIssue', { issueKey });
}

// ── Flag search ──────────────────────────────────────────────────────────────

export async function searchFlags(
  query: string
): Promise<{ flags?: SearchFlag[]; error?: string }> {
  return invoke('searchFlags', { query });
}

// ── Mutate ───────────────────────────────────────────────────────────────────

export async function createFlag(payload: {
  issueKey: string;
  name: string;
  key: string;
  description?: string;
}): Promise<{
  results?: Array<{ envName: string; success: boolean; error?: string }>;
  error?: string;
}> {
  return invoke('createFlag', payload);
}

export async function linkFlag(payload: {
  issueKey: string;
  flagKey: string;
}): Promise<{
  results?: Array<{ envName: string; success: boolean; error?: string }>;
  error?: string;
}> {
  return invoke('linkFlag', payload);
}

export async function toggleFlag(payload: {
  envId: string;
  flagKey: string;
  enable: boolean;
  issueKey?: string;
}): Promise<{ success?: boolean; error?: string }> {
  return invoke('toggleFlag', payload);
}
