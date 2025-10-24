import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay, catchError, map } from 'rxjs/operators';
import { Tool, ToolType, ToolAuthentication, McpToolDiscoveryResponse } from '../../models/tool.model';
import { ApiService } from './api.service';

// Backend DTOs
interface ToolDto {
  id: string;
  name: string;
  description: string;
  type: string;
  category?: string;
  isActive: boolean;
  configuration?: string;
  authentication?: string;
  parameters?: string;
  headers?: string;
  createdAt: string;
  updatedAt: string;
  createdByUserId?: string;
  isPublic: boolean;
}

interface CreateToolDto {
  name: string;
  description: string;
  type: string;
  category?: string;
  isActive: boolean;
  configuration?: string;
  authentication?: string;
  parameters?: string;
  headers?: string;
}

interface UpdateToolDto extends CreateToolDto {}

@Injectable({
  providedIn: 'root'
})
export class ToolService {
  constructor(private apiService: ApiService) {}

  // Convert backend DTOs to frontend models
  private mapToolDto(dto: ToolDto): Tool {
    return {
      id: dto.id,
      name: dto.name,
      description: dto.description,
      type: this.mapToolType(dto.type),
      category: dto.category,
      isActive: dto.isActive,
      configuration: dto.configuration,
      authentication: dto.authentication || '{"type":"none","required":false}', // Keep as JSON string
      parameters: dto.parameters ? JSON.parse(dto.parameters) : [],
      headers: dto.headers ? JSON.parse(dto.headers) : [],
      createdAt: new Date(dto.createdAt),
      updatedAt: new Date(dto.updatedAt),
      createdByUserId: dto.createdByUserId,
      isPublic: dto.isPublic
    };
  }

  private parseAuthentication(authString?: string): ToolAuthentication {
    if (!authString) {
      return { type: 'none' };
    }
    
    try {
      const parsed = JSON.parse(authString);
      // S'assurer que la structure correspond à ToolAuthentication
      const auth: ToolAuthentication = {
        type: parsed.type || 'none',
        apiKey: parsed.apiKey,
        username: parsed.username,
        password: parsed.password,
        token: parsed.token,
        accessToken: parsed.accessToken,
        clientId: parsed.clientId,
        clientSecret: parsed.clientSecret,
        tokenUrl: parsed.tokenUrl,
        tenantId: parsed.tenantId,
        resource: parsed.resource,
        scopes: parsed.scopes,
        headers: parsed.headers || {},
        required: parsed.required || false
      };
      
      // Validation des types d'authentification
      if (!['api_key', 'basic', 'bearer', 'oauth2', 'azure_oauth2', 'none'].includes(auth.type)) {
        console.warn(`Invalid authentication type: ${auth.type}, defaulting to 'none'`);
        auth.type = 'none';
      }
      
      return auth;
    } catch (error) {
      console.warn('Failed to parse authentication JSON:', error);
      return { type: 'none' };
    }
  }

  private mapToolType(type: string): ToolType {
    switch (type.toLowerCase()) {
      case 'apitool':
        return ToolType.API;
      case 'mcptool':
        return ToolType.MCP;
      case 'internaltool':
        return ToolType.INTERNAL;
      default:
        return ToolType.MCP; // Default fallback
    }
  }

  // API Methods
  getTools(): Observable<Tool[]> {
    return this.apiService.get<ToolDto[]>('/tools').pipe(
      map(dtos => dtos.map(dto => this.mapToolDto(dto))),
      catchError(error => {
        console.error('Error fetching tools:', error);
        return throwError(() => new Error('Failed to fetch tools'));
      })
    );
  }

  getToolById(id: string): Observable<Tool> {
    return this.apiService.get<ToolDto>(`/tools/${id}`).pipe(
      map(dto => this.mapToolDto(dto)),
      catchError(error => {
        console.error('Error fetching tool:', error);
        return throwError(() => new Error('Failed to fetch tool'));
      })
    );
  }

  createTool(tool: CreateToolDto): Observable<Tool> {
    const dto = {
      ...tool,
      configuration: tool.configuration || undefined,
      authentication: tool.authentication || undefined,
      parameters: tool.parameters || undefined,
      headers: tool.headers || undefined
    };

    return this.apiService.post<ToolDto>('/tools', dto).pipe(
      map(responseDto => this.mapToolDto(responseDto)),
      catchError(error => {
        console.error('Error creating tool:', error);
        return throwError(() => new Error('Failed to create tool'));
      })
    );
  }

  updateTool(id: string, tool: UpdateToolDto): Observable<Tool> {
    const dto = {
      ...tool,
      configuration: tool.configuration || undefined,
      authentication: tool.authentication || undefined,
      parameters: tool.parameters || undefined,
      headers: tool.headers || undefined
    };

    return this.apiService.put<ToolDto>(`/tools/${id}`, dto).pipe(
      map(responseDto => this.mapToolDto(responseDto)),
      catchError(error => {
        console.error('Error updating tool:', error);
        return throwError(() => new Error('Failed to update tool'));
      })
    );
  }

  deleteTool(id: string): Observable<boolean> {
    return this.apiService.delete<any>(`/tools/${id}`).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error deleting tool:', error);
        return throwError(() => new Error('Failed to delete tool'));
      })
    );
  }

  searchTools(query: string): Observable<Tool[]> {
    const params = this.apiService.createParams({ q: query });
    return this.apiService.get<ToolDto[]>('/tools/search', params).pipe(
      map(dtos => dtos.map(dto => this.mapToolDto(dto))),
      catchError(error => {
        console.error('Error searching tools:', error);
        return throwError(() => new Error('Failed to search tools'));
      })
    );
  }

  getToolsByCategory(category: string): Observable<Tool[]> {
    const params = this.apiService.createParams({ category });
    return this.apiService.get<ToolDto[]>('/tools/category', params).pipe(
      map(dtos => dtos.map(dto => this.mapToolDto(dto))),
      catchError(error => {
        console.error('Error fetching tools by category:', error);
        return throwError(() => new Error('Failed to fetch tools by category'));
      })
    );
  }

  getToolsByType(type: string): Observable<Tool[]> {
    const params = this.apiService.createParams({ type });
    return this.apiService.get<ToolDto[]>('/tools/type', params).pipe(
      map(dtos => dtos.map(dto => this.mapToolDto(dto))),
      catchError(error => {
        console.error('Error fetching tools by type:', error);
        return throwError(() => new Error('Failed to fetch tools by type'));
      })
    );
  }

  discoverMcpTools(url: string): Observable<McpToolDiscoveryResponse> {
    const params = this.apiService.createParams({ url });
    return this.apiService.get<McpToolDiscoveryResponse>('/tools/discover-mcp', params).pipe(
      catchError(error => {
        console.error('Error discovering MCP tools:', error);
        return throwError(() => new Error('Failed to discover MCP tools'));
      })
    );
  }

  discoverMcpToolsAsEntities(url: string): Observable<Tool[]> {
    const request = { url };
    return this.apiService.post<ToolDto[]>('/tools/discover-mcp-tools', request).pipe(
      map(dtos => dtos.map(dto => this.mapToolDto(dto))),
      catchError(error => {
        console.error('Error discovering MCP tools as entities:', error);
        return throwError(() => new Error('Failed to discover MCP tools as entities'));
      })
    );
  }
}
