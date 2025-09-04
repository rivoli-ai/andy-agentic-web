export enum AgentType {
  CHATBOT = 'chatbot',
  ASSISTANT = 'assistant',
  AUTOMATION = 'automation',
  ANALYSIS = 'analysis',
  CREATIVE = 'creative'
}

export interface PromptVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  default?: any;
  description?: string;
}

export interface Prompt {
  id: string;
  content: string;
  agentId: string;
  variables: PromptVariable[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentTool {
  id: string;
  name: string;
  type: 'api' | 'internal';
  isActive: boolean;
  toolId?: string; 
  category?: string;
  configuration?: string; 
  authentication?: string; 
  parameters?: Record<string, any>;
  description?: string;
}
export interface AgentTag {
  id: string;
  agentId: string;
  tagId: string;
  tag?: TagDto;
}

export interface TagDto{
  id: string;
  name: string;
  color: string;
}
export interface AgentMCPServer {
  id: string;
  name: string;
  isActive: boolean;
  capabilities: string[];
}

export interface LLMProvider {
  id: string;
  name: string;
  baseUrl: string;
  models: string[];
  isOpenAICompatible: boolean;
}

export interface LLMConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  provider: 'openai' | 'anthropic' | 'google' | 'custom' | 'ollama';
  isActive: boolean;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  type: AgentType;
  isActive: boolean;
  llmConfig: LLMConfig;
  prompts: Prompt[];
  tools: AgentTool[];
  mcpServers: AgentMCPServer[];
  agentTags: AgentTag[];
  executionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentExecutionResult {
  id: string;
  agentId: string;
  status: 'success' | 'error' | 'running';
  result?: any;
  error?: string;
  executionTime: number;
  timestamp: Date;
}
