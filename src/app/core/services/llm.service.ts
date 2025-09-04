import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay, catchError, map } from 'rxjs/operators';
import { LLMConfig, LLMProvider } from '../../models/agent.model';
import { ApiService } from './api.service';

// Backend DTOs
interface LLMConfigDto {
  id: string;
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
  createdAt: string;
  updatedAt: string;
}

interface LLMProviderDto {
  id: string;
  name: string;
  baseUrl: string;
  models: string[];
  isOpenAICompatible: boolean;
}

interface CreateLLMConfigDto {
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
}

interface UpdateLLMConfigDto extends CreateLLMConfigDto {}

interface TestConnectionDto {
  baseUrl: string;
  apiKey: string;
  model: string;
  provider: string;
}

interface TestConnectionResultDto {
  success: boolean;
  message: string;
  latency?: number;
}

@Injectable({
  providedIn: 'root'
})
export class LLMService {
  constructor(private apiService: ApiService) {}

  // Convert backend DTOs to frontend models
  private mapLLMConfigDto(dto: LLMConfigDto): LLMConfig {
    return {
      id: dto.id,
      name: dto.name,
      baseUrl: dto.baseUrl,
      apiKey: dto.apiKey,
      model: dto.model,
      provider: this.mapLLMProvider(dto.provider),
      isActive: dto.isActive,
      maxTokens: dto.maxTokens,
      temperature: dto.temperature,
      topP: dto.topP,
      frequencyPenalty: dto.frequencyPenalty,
      presencePenalty: dto.presencePenalty,
      createdAt: new Date(dto.createdAt),
      updatedAt: new Date(dto.updatedAt)
    };
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

  // API Methods
  getLLMConfigs(): Observable<LLMConfig[]> {
    return this.apiService.get<LLMConfigDto[]>('/llm/configs').pipe(
      map(dtos => dtos.map(dto => this.mapLLMConfigDto(dto))),
      catchError(error => {
        console.error('Error fetching LLM configs:', error);
        return throwError(() => new Error('Failed to fetch LLM configs'));
      })
    );
  }

  getLLMConfigById(id: string): Observable<LLMConfig> {
    return this.apiService.get<LLMConfigDto>(`/llm/configs/${id}`).pipe(
      map(dto => this.mapLLMConfigDto(dto)),
      catchError(error => {
        console.error('Error fetching LLM config:', error);
        return throwError(() => new Error('Failed to fetch LLM config'));
      })
    );
  }

  createLLMConfig(config: CreateLLMConfigDto): Observable<LLMConfig> {
    return this.apiService.post<LLMConfigDto>('/llm/configs', config).pipe(
      map(dto => this.mapLLMConfigDto(dto)),
      catchError(error => {
        console.error('Error creating LLM config:', error);
        return throwError(() => new Error('Failed to create LLM config'));
      })
    );
  }

  updateLLMConfig(id: string, config: UpdateLLMConfigDto): Observable<LLMConfig> {
    return this.apiService.put<LLMConfigDto>(`/llm/configs/${id}`, config).pipe(
      map(dto => this.mapLLMConfigDto(dto)),
      catchError(error => {
        console.error('Error updating LLM config:', error);
        return throwError(() => new Error('Failed to update LLM config'));
      })
    );
  }

  deleteLLMConfig(id: string): Observable<boolean> {
    return this.apiService.delete<any>(`/llm/configs/${id}`).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error deleting LLM config:', error);
        return throwError(() => new Error('Failed to delete LLM config'));
      })
    );
  }

  getProviders(): Observable<LLMProvider[]> {
    return this.apiService.get<LLMProviderDto[]>('/llm/providers').pipe(
      map(dtos => dtos.map(dto => ({
        id: dto.id,
        name: dto.name,
        baseUrl: dto.baseUrl,
        models: dto.models,
        isOpenAICompatible: dto.isOpenAICompatible
      }))),
      catchError(error => {
        console.error('Error fetching providers:', error);
        return throwError(() => new Error('Failed to fetch providers'));
      })
    );
  }

  getProviderById(id: string): Observable<LLMProvider | undefined> {
    return this.apiService.get<LLMProviderDto>(`/llm/providers/${id}`).pipe(
      map(dto => ({
        id: dto.id,
        name: dto.name,
        baseUrl: dto.baseUrl,
        models: dto.models,
        isOpenAICompatible: dto.isOpenAICompatible
      })),
      catchError(error => {
        console.error('Error fetching provider:', error);
        return throwError(() => new Error('Failed to fetch provider'));
      })
    );
  }

  testConnection(config: TestConnectionDto): Observable<TestConnectionResultDto> {
    return this.apiService.post<TestConnectionResultDto>('/llm/test-connection', config).pipe(
      catchError(error => {
        console.error('Error testing connection:', error);
        return throwError(() => new Error('Failed to test connection'));
      })
    );
  }

  validateConfig(config: Partial<LLMConfig>): boolean {
    if (!config.name || !config.baseUrl || !config.apiKey || !config.model || !config.provider) {
      return false;
    }
    return true;
  }
}
