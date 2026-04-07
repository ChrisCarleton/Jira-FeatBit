// Shared types used across the frontend

export interface Environment {
  id: string;
  key: string;
  name: string;
  projectId: string;
  projectName: string;
  readOnly?: boolean;
}

/** The status of a flag in one environment */
export interface FlagEnvStatus {
  envId: string;
  envName: string;
  /** true = enabled, false = disabled, null = not present in this env */
  isEnabled: boolean | null;
  flagId: string | null;
}

/** A flag row as returned by the getFlagsForIssue resolver */
export interface FlagRow {
  key: string;
  name: string;
  tags: string[];
  environments: FlagEnvStatus[];
}

/** A search result flag (from the primary environment) */
export interface SearchFlag {
  id: string;
  key: string;
  name: string;
  tags: string[];
  isEnabled: boolean;
}

export interface StoredConfig {
  apiUrl: string;
  hasToken: boolean;
  environments: Environment[];
  defaultEnvId?: string;
  portalUrl?: string;
}
