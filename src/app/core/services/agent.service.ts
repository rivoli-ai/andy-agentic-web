import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay, catchError, map } from 'rxjs/operators';
import { Agent, AgentType, AgentTool, AgentMCPServer, Prompt, PromptVariable, AgentExecutionResult, LLMConfig, AgentTag } from '../../models/agent.model';
import { ApiService } from './api.service';

// Backend DTOs
interface AgentDto {
  id: string;
  name: string;
  description: string;
  type: string;
  isActive: boolean;
  executionCount: number;
  createdAt: string;
  updatedAt: string;
  agentTags: AgentTag[];
  llmConfig:  LLMConfig;
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
    name: string;
    type: string;
    isActive: boolean;
    toolId: string;
    description: string;
    parameters?: string;
  }[] | null;
  mcpServers?: {
    id: string;
    name: string;
    isActive: boolean;
    capabilities?: string;
  }[] | null;
}

interface CreateAgentDto {
  name: string;
  description: string;
  type: string;
  isActive: boolean;
  tags: string[];
  llmConfig: {
    name: string;
    baseUrl: string;
    apiKey: string;
    model: string;
    provider: string;
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
  mcpServers: {
    name: string;
    isActive: boolean;
    capabilities?: string;
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
      executionCount: dto.executionCount,
      createdAt: new Date(dto.createdAt),
      updatedAt: new Date(dto.updatedAt),
      agentTags: dto.agentTags,
      llmConfig: dto.llmConfig,
      prompts: [],
      tools: [],
      mcpServers: []
    };
  }

  private mapAgentDto(dto: AgentDto): Agent {
    return {
      id: dto.id,
      name: dto.name,
      description: dto.description,
      type: this.mapAgentType(dto.type),
      isActive: dto.isActive,
      executionCount: dto.executionCount,
      createdAt: new Date(dto.createdAt),
      updatedAt: new Date(dto.updatedAt),
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
        updatedAt: new Date(dto.llmConfig.updatedAt)
      } : {
        id: 'default-llm',
        name: 'Default LLM',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '',
        model: 'gpt-3.5-turbo',
        provider: 'openai',
        isActive: true,
        maxTokens: 4000,
        temperature: 0.7,
        topP: 1,
        frequencyPenalty: 0,
        presencePenalty: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
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
        name: t.name,
        type: this.mapToolType(t.type),
        isActive: t.isActive,
        description : t.description,
        toolId : t.toolId,
        parameters: t.parameters ? JSON.parse(t.parameters) : {}
      })) : [],
      mcpServers: dto.mcpServers ? dto.mcpServers.map(m => ({
        id: m.id,
        name: m.name,
        isActive: m.isActive,
        capabilities: m.capabilities ? JSON.parse(m.capabilities) : []
      })) : []
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

  private mapLLMProvider(provider: string | null | undefined): 'openai' | 'anthropic' | 'google' | 'custom' | 'ollama' {
    if (!provider) {
      return 'custom';
    }
    switch (provider.toLowerCase()) {
      case 'openai':
        return 'openai';
      case 'anthropic':
        return 'anthropic';
      case 'google':
        return 'google';
      case 'ollama':
        return 'ollama';
      default:
        return 'custom';
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

  private mapToolType(type: string | null | undefined): 'api' | 'internal' {
    if (!type) {
      return 'internal';
    }
    return type.toLowerCase() === 'api' ? 'api' : 'internal';
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
