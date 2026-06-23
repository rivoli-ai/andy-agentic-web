import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  SkillRegistry,
  SkillRegistryInput,
  SkillSearchResult,
  AgentSkill,
  AttachSkillInput,
} from '../../models/skill.model';
import { ApiService } from './api.service';

interface SkillRegistryDto {
  id: string;
  name: string;
  description: string;
  baseUrl: string;
  authType: string;
  authConfig?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AgentSkillDto {
  id: string;
  agentId: string;
  skillRegistryId: string;
  namespace: string;
  skillSlug: string;
  version: string;
  displayName: string;
  description: string;
  isActive: boolean;
  createdAt: string;
}

/**
 * Manages skill registry connections and per-agent skill attachments, and proxies
 * registry search through the backend (so registry credentials stay server-side).
 */
@Injectable({
  providedIn: 'root',
})
export class SkillService {
  constructor(private apiService: ApiService) {}

  private mapRegistry(dto: SkillRegistryDto): SkillRegistry {
    return {
      id: dto.id,
      name: dto.name,
      description: dto.description,
      baseUrl: dto.baseUrl,
      authType: (dto.authType || 'none') as SkillRegistry['authType'],
      isActive: dto.isActive,
      createdAt: new Date(dto.createdAt),
      updatedAt: new Date(dto.updatedAt),
    };
  }

  private mapAgentSkill(dto: AgentSkillDto): AgentSkill {
    return {
      id: dto.id,
      agentId: dto.agentId,
      skillRegistryId: dto.skillRegistryId,
      namespace: dto.namespace,
      skillSlug: dto.skillSlug,
      version: dto.version,
      displayName: dto.displayName,
      description: dto.description,
      isActive: dto.isActive,
      createdAt: new Date(dto.createdAt),
    };
  }

  // --- Registry connections ---

  getRegistries(): Observable<SkillRegistry[]> {
    return this.apiService.get<SkillRegistryDto[]>('/skillregistries').pipe(
      map(dtos => dtos.map(d => this.mapRegistry(d))),
      catchError(error => {
        console.error('Error fetching skill registries:', error);
        return throwError(() => new Error('Failed to fetch skill registries'));
      })
    );
  }

  getRegistry(id: string): Observable<SkillRegistry> {
    return this.apiService.get<SkillRegistryDto>(`/skillregistries/${id}`).pipe(
      map(dto => this.mapRegistry(dto)),
      catchError(error => {
        console.error('Error fetching skill registry:', error);
        return throwError(() => new Error('Failed to fetch skill registry'));
      })
    );
  }

  createRegistry(input: SkillRegistryInput): Observable<SkillRegistry> {
    return this.apiService.post<SkillRegistryDto>('/skillregistries', input).pipe(
      map(dto => this.mapRegistry(dto)),
      catchError((error: unknown) => {
        console.error('Error creating skill registry:', error);
        return throwError(() => error);
      })
    );
  }

  updateRegistry(id: string, input: SkillRegistryInput): Observable<SkillRegistry> {
    return this.apiService.put<SkillRegistryDto>(`/skillregistries/${id}`, input).pipe(
      map(dto => this.mapRegistry(dto)),
      catchError((error: unknown) => {
        console.error('Error updating skill registry:', error);
        return throwError(() => error);
      })
    );
  }

  deleteRegistry(id: string): Observable<boolean> {
    return this.apiService.delete<unknown>(`/skillregistries/${id}`).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error deleting skill registry:', error);
        return throwError(() => error);
      })
    );
  }

  testRegistry(id: string): Observable<boolean> {
    return this.apiService.post<{ success: boolean }>(`/skillregistries/${id}/test`, {}).pipe(
      map(res => res.success),
      catchError(error => {
        console.error('Error testing skill registry:', error);
        return throwError(() => new Error('Failed to test skill registry'));
      })
    );
  }

  searchSkills(registryId: string, query: string): Observable<SkillSearchResult[]> {
    const params = this.apiService.createParams({ q: query });
    return this.apiService
      .get<SkillSearchResult[]>(`/skillregistries/${registryId}/search`, params)
      .pipe(
        catchError(error => {
          console.error('Error searching skills:', error);
          return throwError(() => new Error('Failed to search skills'));
        })
      );
  }

  // --- Per-agent skill attachments ---

  getAgentSkills(agentId: string): Observable<AgentSkill[]> {
    return this.apiService.get<AgentSkillDto[]>(`/agents/${agentId}/skills`).pipe(
      map(dtos => dtos.map(d => this.mapAgentSkill(d))),
      catchError(error => {
        console.error('Error fetching agent skills:', error);
        return throwError(() => new Error('Failed to fetch agent skills'));
      })
    );
  }

  attachSkill(agentId: string, input: AttachSkillInput): Observable<AgentSkill> {
    return this.apiService.post<AgentSkillDto>(`/agents/${agentId}/skills`, input).pipe(
      map(dto => this.mapAgentSkill(dto)),
      catchError((error: unknown) => {
        console.error('Error attaching skill:', error);
        return throwError(() => error);
      })
    );
  }

  detachSkill(agentId: string, agentSkillId: string): Observable<boolean> {
    return this.apiService.delete<unknown>(`/agents/${agentId}/skills/${agentSkillId}`).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error detaching skill:', error);
        return throwError(() => error);
      })
    );
  }
}
