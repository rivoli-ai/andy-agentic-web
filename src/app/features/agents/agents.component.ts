import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Agent, AgentTag, AgentType, LLMProviderType } from '../../models/agent.model';
import { AgentService } from '../../core/services/agent.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-agents',
  templateUrl: './agents.component.html',
  styleUrls: ['./agents.component.css']
})
export class AgentsComponent implements OnInit, OnDestroy {
  agents: Agent[] = [];
  filteredAgents: Agent[] = [];
  searchQuery = '';
  selectedType = '';
  selectedStatus = '';
  agentTypes = Object.values(AgentType);
  isLoading = true;
  viewMode: 'grid' | 'list' = 'grid';
  sortBy: 'name' | 'createdAt' | 'updatedAt' | 'executionCount' = 'updatedAt';
  sortOrder: 'asc' | 'desc' = 'desc';
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 8;
  totalPages = 1;
  paginatedAgents: Agent[] = [];
  
  private subscription = new Subscription();

  constructor(
    private agentService: AgentService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAgents();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private loadAgents(): void {
    this.isLoading = true;
    this.subscription.add(
      this.agentService.getAgents().subscribe({
        next: (agents: Agent[]) => {
          this.agents = agents;
          this.filteredAgents = [...agents];
          this.updatePagination();
          this.isLoading = false;
        },
        error: (error: any) => {
          this.notificationService.error('Erreur', 'Impossible de charger les agents');
          console.error('Error loading agents:', error);
          this.isLoading = false;
        }
      })
    );
  }

  onSearch(): void {
    this.applyFilters();
  }

  onTypeFilterChange(): void {
    this.applyFilters();
  }

  onStatusFilterChange(): void {
    this.applyFilters();
  }

  private applyFilters(): void {
    let filtered = [...this.agents];

    // Filtre par recherche
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(agent =>
        agent.name.toLowerCase().includes(query) ||
        agent.description.toLowerCase().includes(query) ||
        agent.agentTags.some((tag: AgentTag) => tag.tag?.name.toLowerCase().includes(query))
      );
    }

    // Filtre par type
    if (this.selectedType) {
      filtered = filtered.filter(agent => agent.type === this.selectedType);
    }

    // Filtre par statut
    if (this.selectedStatus !== '') {
      const isActive = this.selectedStatus === 'true';
      filtered = filtered.filter(agent => agent.isActive === isActive);
    }

    // Appliquer le tri
    filtered = this.applySorting(filtered);

    this.filteredAgents = filtered;
    this.updatePagination();
  }

  private updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredAgents.length / this.itemsPerPage);
    this.currentPage = Math.min(this.currentPage, Math.max(1, this.totalPages));
    
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedAgents = this.filteredAgents.slice(startIndex, endIndex);
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.updatePagination();
  }

  onItemsPerPageChange(itemsPerPage: number): void {
    this.itemsPerPage = itemsPerPage;
    this.currentPage = 1;
    this.updatePagination();
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    const startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  getCurrentPageRange(): string {
    const start = (this.currentPage - 1) * this.itemsPerPage + 1;
    const end = Math.min(this.currentPage * this.itemsPerPage, this.filteredAgents.length);
    return `${start}-${end}`;
  }

  private applySorting(agents: Agent[]): Agent[] {
    return agents.sort((a, b) => {
      let comparison = 0;
      
      switch (this.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'createdAt':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'updatedAt':
          comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
          break;
        case 'executionCount':
          comparison = a.executionCount - b.executionCount;
          break;
      }
      
      return this.sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
  }

  onSortChange(sortBy: 'name' | 'createdAt' | 'updatedAt' | 'executionCount'): void {
    if (this.sortBy === sortBy) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = sortBy;
      this.sortOrder = 'desc';
    }
    this.applyFilters();
  }

  viewAgent(agentId: string): void {
    this.router.navigate(['/agents', agentId]);
  }

  executeAgent(agentId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    
    this.subscription.add(
      this.agentService.executeAgent(agentId, {}).subscribe({
        next: (result: any) => {
          this.notificationService.success(
            'Exécution réussie',
            `Agent exécuté en ${result.executionTime}ms`
          );
          // Recharger les agents pour mettre à jour le compteur d'exécutions
          this.loadAgents();
        },
        error: (error: any) => {
          this.notificationService.error('Erreur', 'Échec de l\'exécution de l\'agent');
          console.error('Error executing agent:', error);
        }
      })
    );
  }

  duplicateAgent(agentId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    
    this.subscription.add(
      this.agentService.getAgentById(agentId).subscribe({
        next: (agent: Agent | undefined) => {
          if (agent) {
            const duplicatedAgent = {
              ...agent,
              id: this.generateId(),
              name: `${agent.name} (Copie)`,
              isActive: false
            };
            
            const createAgentDto = this.convertToCreateAgentDto(duplicatedAgent);
            this.subscription.add(
              this.agentService.createAgent(createAgentDto).subscribe({
                next: () => {
                  this.notificationService.success('Succès', 'Agent dupliqué avec succès');
                  this.loadAgents();
                },
                error: (error: any) => {
                  this.notificationService.error('Erreur', 'Impossible de dupliquer l\'agent');
                  console.error('Error duplicating agent:', error);
                }
              })
            );
          } else {
            this.notificationService.error('Erreur', 'Agent non trouvé');
          }
        },
        error: (error: any) => {
          this.notificationService.error('Erreur', 'Impossible de récupérer l\'agent');
          console.error('Error getting agent:', error);
        }
      })
    );
  }

  deleteAgent(agentId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    if (confirm('Êtes-vous sûr de vouloir supprimer cet agent ?')) {
      this.subscription.add(
        this.agentService.deleteAgent(agentId).subscribe({
          next: () => {
            this.notificationService.success('Succès', 'Agent supprimé avec succès');
            this.loadAgents();
          },
          error: (error: any) => {
            this.notificationService.error('Erreur', 'Impossible de supprimer l\'agent');
            console.error('Error deleting agent:', error);
          }
        })
      );
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  getStatusClasses(isActive: boolean): string {
    return isActive
      ? 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200'
      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  }

  getTypeClasses(type: string): string {
    const typeClasses: { [key: string]: string } = {
      'chatbot': 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200',
      'assistant': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'automation': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'analysis': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'creative': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
    };
    return typeClasses[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  }

  private convertToCreateAgentDto(agent: Agent): any {
    return {
      name: agent.name,
      description: agent.description,
      type: agent.type,
      isActive: agent.isActive,
      isPublic: agent.isPublic,
      tags: agent.agentTags,
      llmConfigId: agent.llmConfig?.id,
      embeddingLlmConfigId: agent.embeddingLlmConfig?.id,
      prompts: agent.prompts.map(p => ({
        content: p.content,
        isActive: p.isActive,
        variables: p.variables.map(v => ({
          name: v.name,
          type: v.type,
          required: v.required,
          defaultValue: v.default,
          description: v.description
        }))
      })),
      tools: agent.tools.map(t => ({
        name: t.tool?.name || 'Unknown Tool',
        type: t.tool?.type || 'Unknown Type',
        isActive: t.isActive,
        toolId: t.toolId,
        category: t.tool?.category || '',
        configuration: '',
        authentication: '',
        parameters: '{}',
        description: t.tool?.description || ''
      })),
    };
  }

  getProviderName(provider: LLMProviderType | string | undefined): string {
    // Handle null, undefined, or empty string
    if (provider === null || provider === undefined || provider === '') {
      return 'Unknown';
    }
    
    // Handle string values (including enum string values)
    if (typeof provider === 'string') {
      // Map enum string values to display names
      switch (provider) {
        case 'OpenAi':
          return 'OpenAI';
        case 'Anthropic':
          return 'Anthropic';
        case 'Google':
          return 'Google';
        case 'Custom':
          return 'Custom';
        case 'Ollama':
          return 'Ollama';
        case 'AzureOpenAi':
          return 'Azure OpenAI';
        default:
          return provider; // Return as-is if not a known enum value
      }
    }
    
    // Handle numeric enum values (including 0)
    if (typeof provider === 'number') {
      if (provider === 0) { // LLMProviderType.OPENAI
        return 'OpenAI';
      } else if (provider === 1) { // LLMProviderType.ANTHROPIC
        return 'Anthropic';
      } else if (provider === 2) { // LLMProviderType.GOOGLE
        return 'Google';
      } else if (provider === 4) { // LLMProviderType.OLLAMA
        return 'Ollama';
      } else if (provider === 3) { // LLMProviderType.CUSTOM
        return 'Custom';
      } else if (provider === 5) { // LLMProviderType.AZURE_OPENAI
        return 'Azure OpenAI';
      } else {
        return 'Custom';
      }
    }
    
    // Fallback for any other type
    return 'Unknown';
  }
}
