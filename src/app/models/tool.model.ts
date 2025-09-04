export enum ToolType {
  API = 'api',
  INTERNAL = 'internal'
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  default?: any;
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
  parameters: ToolParameter[];
  createdAt: Date;
  updatedAt: Date;
}
