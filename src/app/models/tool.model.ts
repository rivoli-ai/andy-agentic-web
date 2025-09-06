export enum ToolType {
  API = 'api',
  MCP = 'mcp'
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
}
