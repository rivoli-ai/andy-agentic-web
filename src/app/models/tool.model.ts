export enum ToolType {
  API = 'ApiTool',
  MCP = 'McpTool',
  INTERNAL = 'InternalTool'
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  default?: any;
  description?: string;
}

export interface ToolHeader {
  name: string;
  value: string;
  required: boolean;
  description?: string;
}

export interface ToolAuthentication {
  type: 'api_key' | 'basic' | 'bearer' | 'none';
  apiKey?: string;
  username?: string;
  password?: string;
  headers?: Record<string, string>;
  required?: boolean;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  type: ToolType;
  category?: string;
  isActive: boolean;
  configuration?: string;
  authentication: ToolAuthentication;
  parameters?: ToolParameter[];
  headers?: ToolHeader[];
  createdAt: Date;
  updatedAt: Date;
  createdByUserId?: string;
  isPublic: boolean;
}

// MCP Tool Discovery interfaces
export interface McpToolDiscovery {
  name: string;
  description: string;
  inputSchema?: McpToolInputSchema;
}

export interface McpToolInputSchema {
  type: string;
  properties?: { [key: string]: McpToolProperty };
  required?: string[];
}

export interface McpToolProperty {
  type: string;
  description?: string;
  default?: any;
  enum?: any[];
  items?: McpToolProperty;
}

export interface McpToolDiscoveryResponse {
  tools: McpToolDiscovery[];
  error?: string;
  success: boolean;
}