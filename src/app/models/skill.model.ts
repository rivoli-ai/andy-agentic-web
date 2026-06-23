/**
 * Authentication type for a skill registry connection.
 */
export type SkillRegistryAuthType = 'none' | 'api_key' | 'bearer' | 'basic' | 'oauth2';

/**
 * A connection to an external agent-skill registry (e.g. andy-skills).
 */
export interface SkillRegistry {
  id: string;
  name: string;
  description: string;
  baseUrl: string;
  authType: SkillRegistryAuthType;
  /** Write-only: sent on create/update, never returned by the API. */
  authConfig?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Payload for creating or updating a registry connection.
 */
export interface SkillRegistryInput {
  name: string;
  description?: string;
  baseUrl: string;
  authType: SkillRegistryAuthType;
  authConfig?: string;
  isActive: boolean;
}

/**
 * A single skill hit returned from a registry search.
 */
export interface SkillSearchResult {
  namespace: string;
  skillSlug: string;
  version: string;
  displayName: string;
  description: string;
}

/**
 * A skill attached to an agent.
 */
export interface AgentSkill {
  id: string;
  agentId: string;
  skillRegistryId: string;
  namespace: string;
  skillSlug: string;
  version: string;
  displayName: string;
  description: string;
  isActive: boolean;
  createdAt: Date;
}

/**
 * Payload for attaching a skill to an agent.
 */
export interface AttachSkillInput {
  skillRegistryId: string;
  namespace: string;
  skillSlug: string;
  version: string;
  displayName: string;
  description: string;
  isActive: boolean;
}
