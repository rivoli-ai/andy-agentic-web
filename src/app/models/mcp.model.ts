export interface MCPAuthentication {
  type: 'api_key' | 'basic' | 'none';
  apiKey?: string;
  username?: string;
  password?: string;
  headers?: Record<string, string>;
}

export interface MCPServer {
  id: string;
  name: string;
  description: string;
  host: string;
  port: number;
  isActive: boolean;
  authentication: MCPAuthentication;
  capabilities: string[];
  lastConnected: Date;
  createdAt: Date;
  updatedAt: Date;
}
