import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay, catchError, map } from 'rxjs/operators';
import { Agent, AgentType, AgentTool, Prompt, PromptVariable, AgentExecutionResult, LLMConfig, AgentTag, LLMProviderType } from '../../models/agent.model';
import { ApiService } from './api.service';

// Backend DTOs
interface AgentDto {
  id: string;
  name: string;
  description: string;
  type: string;
  isActive: boolean;
  isPublic: boolean;
  executionCount: number;
  createdAt: string;
  updatedAt: string;
  createdByUserId?: string;
  agentTags: AgentTag[];
  llmConfig:  LLMConfig;
  embeddingLlmConfig?: LLMConfig;
  prompts?: {
    id: string;
    content: string;
    agentId :string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    variables?: {
      id: string;
      name: string;
      type: string;
      required: boolean;
      defaultValue?: string;
      description?: string;
    }[] | null;
  }[] | null;
  tools?: {
    id: string;
    isActive: boolean;
    toolId: string;
      tool?: {
        id: string;
        name: string;
        description: string;
        type: string;
        category?: string | null;
        isActive: boolean;
        configuration?: string;
        authentication?: string;
        parameters?: string;
        headers?: string;
        createdAt: string;
        updatedAt: string;
        createdByUserId?: string;
        isPublic: boolean;
      };
  }[] | null;
  agentDocuments?: {
    id: string;
    agentId: string;
    documentId: string;
    document?: {
      id: string;
      name: string;
      description?: string;
      type: string;
      size: number;
      isActive: boolean;
      isRagProcessed: boolean;
      createdAt: string;
      updatedAt: string;
    };
  }[] | null;
}

interface CreateAgentDto {
  name: string;
  description: string;
  type: string;
  isActive: boolean;
  isPublic: boolean;
  tags: string[];
  llmConfig: {
    name: string;
    baseUrl: string;
    apiKey: string;
    model: string;
    provider: LLMProviderType;
    isActive: boolean;
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  };
  prompts: {
    content: string;
    isActive: boolean;
    variables: {
      name: string;
      type: string;
      required: boolean;
      defaultValue?: string;
      description?: string;
    }[];
  }[];
  tools: {
    name: string;
    type: string;
    isActive: boolean;
    parameters?: string;
  }[];
}

interface UpdateAgentDto extends CreateAgentDto {}

@Injectable({
  providedIn: 'root'
})
export class AgentService {
  constructor(private apiService: ApiService) {}

  // Convert backend DTOs to frontend models
  private mapAgentSummaryDto(dto: AgentDto): Agent {
    return {
      id: dto.id,
      name: dto.name,
      description: dto.description,
      type: this.mapAgentType(dto.type),
      isActive: dto.isActive,
      isPublic: dto.isPublic,
      executionCount: dto.executionCount,
      createdAt: new Date(dto.createdAt),
      updatedAt: new Date(dto.updatedAt),
      createdByUserId: dto.createdByUserId,
      agentTags: dto.agentTags,
      llmConfig: dto.llmConfig,
      embeddingLlmConfig: dto.embeddingLlmConfig,
      prompts: dto.prompts ? dto.prompts.map(p => ({
        id: p.id,
        content: p.content,
        isActive: p.isActive,
        agentId: p.agentId,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
        variables: p.variables ? p.variables.map(v => ({
          name: v.name,
          type: this.mapPromptVariableType(v.type),
          required: v.required,
          default: v.defaultValue,
          description: v.description
        })) : []
      })) : [],
      tools: dto.tools ? dto.tools.map(t => ({
        id: t.id,
        isActive: t.isActive,
        toolId: t.toolId,
        tool: t.tool ? {
          id: t.tool.id,
          name: t.tool.name,
          description: t.tool.description,
          type: t.tool.type,
          category: t.tool.category,
          isActive: t.tool.isActive,
          configuration: t.tool.configuration,
          authentication: t.tool.authentication,
          parameters: t.tool.parameters,
          headers: t.tool.headers,
          createdAt: t.tool.createdAt,
          updatedAt: t.tool.updatedAt,
          createdByUserId: t.tool.createdByUserId,
          isPublic: t.tool.isPublic
        } : undefined
      })) : [],
      agentDocuments: dto.agentDocuments ? dto.agentDocuments.map(d => ({
        id: d.id,
        agentId: d.agentId,
        documentId: d.documentId,
        document: d.document ? {
          id: d.document.id,
          name: d.document.name,
          description: d.document.description,
          type: d.document.type,
          size: d.document.size,
          isActive: d.document.isActive,
          isRagProcessed: d.document.isRagProcessed,
          createdAt: new Date(d.document.createdAt),
          updatedAt: new Date(d.document.updatedAt)
        } : undefined
      })) : [],
    };
  }

  private mapAgentDto(dto: AgentDto): Agent {
    return {
      id: dto.id,
      name: dto.name,
      description: dto.description,
      type: this.mapAgentType(dto.type),
      isActive: dto.isActive,
      isPublic: dto.isPublic,
      executionCount: dto.executionCount,
      createdAt: new Date(dto.createdAt),
      updatedAt: new Date(dto.updatedAt),
      createdByUserId: dto.createdByUserId,
      agentTags: dto.agentTags,
      llmConfig: dto.llmConfig ? {
        id: dto.llmConfig.id,
        name: dto.llmConfig.name,
        baseUrl: dto.llmConfig.baseUrl,
        apiKey: dto.llmConfig.apiKey,
        model: dto.llmConfig.model,
        provider: this.mapLLMProvider(dto.llmConfig.provider),
        isActive: dto.llmConfig.isActive,
        maxTokens: dto.llmConfig.maxTokens,
        temperature: dto.llmConfig.temperature,
        topP: dto.llmConfig.topP,
        frequencyPenalty: dto.llmConfig.frequencyPenalty,
        presencePenalty: dto.llmConfig.presencePenalty,
        createdAt: new Date(dto.llmConfig.createdAt),
        updatedAt: new Date(dto.llmConfig.updatedAt),
        createdByUserId: dto.llmConfig.createdByUserId,
        isPublic: dto.llmConfig.isPublic
      } : {
        id: 'default-llm',
        name: 'Default LLM',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '',
        model: 'gpt-3.5-turbo',
        provider: LLMProviderType.OPENAI,
        isActive: true,
        maxTokens: 4000,
        temperature: 0.7,
        topP: 1,
        frequencyPenalty: 0,
        presencePenalty: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdByUserId: undefined,
        isPublic: false
      },
      embeddingLlmConfig: dto.embeddingLlmConfig ? {
        id: dto.embeddingLlmConfig.id,
        name: dto.embeddingLlmConfig.name,
        baseUrl: dto.embeddingLlmConfig.baseUrl,
        apiKey: dto.embeddingLlmConfig.apiKey,
        model: dto.embeddingLlmConfig.model,
        provider: this.mapLLMProvider(dto.embeddingLlmConfig.provider),
        isActive: dto.embeddingLlmConfig.isActive,
        maxTokens: dto.embeddingLlmConfig.maxTokens,
        temperature: dto.embeddingLlmConfig.temperature,
        topP: dto.embeddingLlmConfig.topP,
        frequencyPenalty: dto.embeddingLlmConfig.frequencyPenalty,
        presencePenalty: dto.embeddingLlmConfig.presencePenalty,
        createdAt: new Date(dto.embeddingLlmConfig.createdAt),
        updatedAt: new Date(dto.embeddingLlmConfig.updatedAt),
        createdByUserId: dto.embeddingLlmConfig.createdByUserId,
        isPublic: dto.embeddingLlmConfig.isPublic
      } : undefined,
      prompts: dto.prompts ? dto.prompts.map(p => ({
        id: p.id,
        content: p.content,
        isActive: p.isActive,
        agentId : p.agentId,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
        variables: p.variables ? p.variables.map(v => ({
          name: v.name,
          type: this.mapPromptVariableType(v.type),
          required: v.required,
          default: v.defaultValue,
          description: v.description
        })) : []
      })) : [],
      tools: dto.tools ? dto.tools.map(t => ({
        id: t.id,
        isActive: t.isActive,
        toolId: t.toolId,
        tool: t.tool ? {
          id: t.tool.id,
          name: t.tool.name,
          description: t.tool.description,
          type: t.tool.type,
          category: t.tool.category,
          isActive: t.tool.isActive,
          configuration: t.tool.configuration,
          authentication: t.tool.authentication,
          parameters: t.tool.parameters,
          headers: t.tool.headers,
          createdAt: t.tool.createdAt,
          updatedAt: t.tool.updatedAt,
          createdByUserId: t.tool.createdByUserId,
          isPublic: t.tool.isPublic
        } : undefined
      })) : [],
      agentDocuments: dto.agentDocuments ? dto.agentDocuments.map(d => ({
        id: d.id,
        agentId: d.agentId,
        documentId: d.documentId,
        document: d.document ? {
          id: d.document.id,
          name: d.document.name,
          description: d.document.description,
          type: d.document.type,
          size: d.document.size,
          isActive: d.document.isActive,
          isRagProcessed: d.document.isRagProcessed,
          createdAt: new Date(d.document.createdAt),
          updatedAt: new Date(d.document.updatedAt)
        } : undefined
      })) : [],
    };
  }

  private mapAgentType(type: string | null | undefined): AgentType {
    if (!type) {
      return AgentType.ASSISTANT;
    }
    switch (type.toLowerCase()) {
      case 'chatbot':
        return AgentType.CHATBOT;
      case 'analysis':
        return AgentType.ANALYSIS;
      case 'assistant':
        return AgentType.ASSISTANT;
      case 'automation':
        return AgentType.AUTOMATION;
      default:
        return AgentType.ASSISTANT;
    }
  }

  private mapLLMProvider(provider: number | string | null | undefined): LLMProviderType {
    if (provider === null || provider === undefined) {
      return LLMProviderType.CUSTOM;
    }
    
    // If it's already a number (enum value from backend), convert it
    if (typeof provider === 'number') {
      return this.mapNumberToProviderType(provider);
    }
    
    // If it's a string, convert it (for backward compatibility)
    switch (provider.toLowerCase()) {
      case 'openai':
        return LLMProviderType.OPENAI;
      case 'anthropic':
        return LLMProviderType.ANTHROPIC;
      case 'google':
        return LLMProviderType.GOOGLE;
      case 'ollama':
        return LLMProviderType.OLLAMA;
      case 'azureopenai':
        return LLMProviderType.AZURE_OPENAI;
      default:
        return LLMProviderType.CUSTOM;
    }
  }

  private mapNumberToProviderType(providerNumber: number): LLMProviderType {
    switch (providerNumber) {
      case 0:
        return LLMProviderType.OPENAI;
      case 1:
        return LLMProviderType.ANTHROPIC;
      case 2:
        return LLMProviderType.GOOGLE;
      case 3:
        return LLMProviderType.CUSTOM;
      case 4:
        return LLMProviderType.OLLAMA;
      case 5:
        return LLMProviderType.AZURE_OPENAI;
      default:
        return LLMProviderType.CUSTOM;
    }
  }

  private mapPromptVariableType(type: string | null | undefined): 'string' | 'number' | 'boolean' | 'object' | 'array' {
    if (!type) {
      return 'string';
    }
    switch (type.toLowerCase()) {
      case 'number':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'object':
        return 'object';
      case 'array':
        return 'array';
      default:
        return 'string';
    }
  }

  private mapToolType(type: string | null | undefined): string {
    if (!type) {
      return 'internal';
    }
    return type.toLowerCase();
  }

  // API Methods
  getAgents(): Observable<Agent[]> {
    return this.apiService.get<AgentDto[]>('/agents').pipe(
      map(dtos => dtos.map(dto => this.mapAgentSummaryDto(dto))),
      catchError(error => {
        console.error('Error fetching agents:', error);
        return throwError(() => new Error('Failed to fetch agents'));
      })
    );
  }

  getAgentById(id: string): Observable<Agent> {
    return this.apiService.get<AgentDto>(`/agents/${id}`).pipe(
      map(dto => this.mapAgentDto(dto)),
      catchError(error => {
        console.error('Error fetching agent:', error);
        return throwError(() => new Error('Failed to fetch agent'));
      })
    );
  }

  createAgent(agent: CreateAgentDto): Observable<Agent> {
    return this.apiService.post<AgentDto>('/agents', agent).pipe(
      map(dto => this.mapAgentDto(dto)),
      catchError(error => {
        console.error('Error creating agent:', error);
        return throwError(() => new Error('Failed to create agent'));
      })
    );
  }

  updateAgent(id: string, agent: UpdateAgentDto): Observable<Agent> {
    return this.apiService.put<AgentDto>(`/agents/${id}`, agent).pipe(
      map(dto => this.mapAgentDto(dto)),
      catchError(error => {
        console.error('Error updating agent:', error);
        return throwError(() => new Error('Failed to update agent'));
      })
    );
  }

  deleteAgent(id: string): Observable<boolean> {
    return this.apiService.delete<any>(`/agents/${id}`).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error deleting agent:', error);
        return throwError(() => new Error('Failed to delete agent'));
      })
    );
  }

  searchAgents(query: string): Observable<Agent[]> {
    const params = this.apiService.createParams({ q: query });
    return this.apiService.get<AgentDto[]>('/agents/search', params).pipe(
      map(dtos => dtos.map(dto => this.mapAgentSummaryDto(dto))),
      catchError(error => {
        console.error('Error searching agents:', error);
        return throwError(() => new Error('Failed to search agents'));
      })
    );
  }

  getAgentsByType(type: string): Observable<Agent[]> {
    return this.apiService.get<AgentDto[]>(`/agents/type/${type}`).pipe(
      map(dtos => dtos.map(dto => this.mapAgentSummaryDto(dto))),
      catchError(error => {
        console.error('Error fetching agents by type:', error);
        return throwError(() => new Error('Failed to fetch agents by type'));
      })
    );
  }

  getAgentsByTag(tag: string): Observable<Agent[]> {
    return this.apiService.get<AgentDto[]>(`/agents/tag/${tag}`).pipe(
      map(dtos => dtos.map(dto => this.mapAgentSummaryDto(dto))),
      catchError(error => {
        console.error('Error fetching agents by tag:', error);
        return throwError(() => new Error('Failed to fetch agents by tag'));
      })
    );
  }

  // Mock methods for backward compatibility (can be removed later)
  getAgentExecutionHistory(agentId: string): Observable<AgentExecutionResult[]> {
    // This would need to be implemented in the backend
    return of([]);
  }

  getExecutionsByAgent(agentId: string): Observable<AgentExecutionResult[]> {
    // This would need to be implemented in the backend
    return of([]);
  }

  executeAgent(agentId: string, input: any): Observable<AgentExecutionResult> {
    // This would need to be implemented in the backend
    return throwError(() => new Error('Agent execution not yet implemented'));
  }
}
