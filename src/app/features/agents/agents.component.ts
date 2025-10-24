import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, Observable } from 'rxjs';
import { Agent, AgentTag, AgentType, LLMProviderType } from '../../models/agent.model';
import { AgentService } from '../../core/services/agent.service';
import { NotificationService } from '../../core/services/notification.service';
import { RoleService } from '../../core/services/role.service';

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
  selectedTag = '';
  agentTypes = Object.values(AgentType);
  isLoading = true;
  viewMode: 'grid' | 'list' = 'grid';
  sortBy: 'name' | 'createdAt' | 'updatedAt' | 'executionCount' = 'updatedAt';
  sortOrder: 'asc' | 'desc' = 'desc';
  
  // Grouping
  groupByTags = false;
  groupedAgents = new Map<string, Agent[]>();
  collapsedGroups = new Set<string>();
  
  // Role-based permissions
  hasWritePermission: Observable<boolean>;
  
  // Available tags for filtering
  availableTags: { id: string; name: string; color: string }[] = [];
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 8;
  totalPages = 1;
  paginatedAgents: Agent[] = [];
  
  private subscription = new Subscription();
  private searchSaveTimeout: any;

  constructor(
    private agentService: AgentService,
    private notificationService: NotificationService,
    private router: Router,
    private roleService: RoleService
  ) {
    this.hasWritePermission = this.roleService.hasWritePermission();
  }

  ngOnInit(): void {
    this.loadPreferences();
    this.loadAgents();
  }

  ngOnDestroy(): void {
    if (this.searchSaveTimeout) {
      clearTimeout(this.searchSaveTimeout);
    }
    this.savePreferences();
    this.subscription.unsubscribe();
  }

  private loadPreferences(): void {
    try {
      const preferences = localStorage.getItem('agents-preferences');
      if (preferences) {
        const prefs = JSON.parse(preferences);
        
        // Load view mode
        if (prefs.viewMode && (prefs.viewMode === 'grid' || prefs.viewMode === 'list')) {
          this.viewMode = prefs.viewMode;
        }
        
        // Load grouping preference
        if (typeof prefs.groupByTags === 'boolean') {
          this.groupByTags = prefs.groupByTags;
        }
        
        // Load sort preferences
        if (prefs.sortBy && ['name', 'createdAt', 'updatedAt', 'executionCount'].includes(prefs.sortBy)) {
          this.sortBy = prefs.sortBy;
        }
        
        if (prefs.sortOrder && (prefs.sortOrder === 'asc' || prefs.sortOrder === 'desc')) {
          this.sortOrder = prefs.sortOrder;
        }
        
        // Load filter preferences
        if (prefs.selectedType) {
          this.selectedType = prefs.selectedType;
        }
        
        if (prefs.selectedStatus) {
          this.selectedStatus = prefs.selectedStatus;
        }
        
        if (prefs.selectedTag) {
          this.selectedTag = prefs.selectedTag;
        }
        
        // Load collapsed groups
        if (prefs.collapsedGroups && Array.isArray(prefs.collapsedGroups)) {
          this.collapsedGroups = new Set(prefs.collapsedGroups);
        }
      }
    } catch (error) {
      console.warn('Failed to load agents preferences:', error);
    }
  }

  private savePreferences(): void {
    try {
      const preferences = {
        viewMode: this.viewMode,
        groupByTags: this.groupByTags,
        sortBy: this.sortBy,
        sortOrder: this.sortOrder,
        selectedType: this.selectedType,
        selectedStatus: this.selectedStatus,
        selectedTag: this.selectedTag,
        collapsedGroups: Array.from(this.collapsedGroups)
      };
      
      localStorage.setItem('agents-preferences', JSON.stringify(preferences));
    } catch (error) {
      console.warn('Failed to save agents preferences:', error);
    }
  }

  private loadAgents(): void {
    this.isLoading = true;
    this.subscription.add(
      this.agentService.getAgents().subscribe({
        next: (agents: Agent[]) => {
          this.agents = agents;
          this.extractAvailableTags();
          this.applyFilters();
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

  private extractAvailableTags(): void {
    const tagMap = new Map<string, { id: string; name: string; color: string }>();
    
    this.agents.forEach(agent => {
      agent.agentTags.forEach(agentTag => {
        if (agentTag.tag) {
          tagMap.set(agentTag.tag.id, {
            id: agentTag.tag.id,
            name: agentTag.tag.name,
            color: agentTag.tag.color
          });
        }
      });
    });
    
    this.availableTags = Array.from(tagMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  onSearch(): void {
    this.applyFilters();
    
    // Debounced save for search query
    if (this.searchSaveTimeout) {
      clearTimeout(this.searchSaveTimeout);
    }
    this.searchSaveTimeout = setTimeout(() => {
      this.savePreferences();
    }, 1000); // Save after 1 second of no typing
  }

  onTypeFilterChange(): void {
    this.applyFilters();
    this.savePreferences();
  }

  onStatusFilterChange(): void {
    this.applyFilters();
    this.savePreferences();
  }

  onTagFilterChange(): void {
    this.applyFilters();
    this.savePreferences();
  }

  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
    this.savePreferences();
  }

  toggleGrouping(): void {
    this.groupByTags = !this.groupByTags;
    this.applyFilters();
    this.savePreferences();
  }

  toggleGroupCollapse(groupKey: string): void {
    if (this.collapsedGroups.has(groupKey)) {
      this.collapsedGroups.delete(groupKey);
    } else {
      this.collapsedGroups.add(groupKey);
    }
    this.savePreferences();
  }

  toggleSortOrder(): void {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    this.applyFilters();
    this.savePreferences();
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

    // Filtre par tag
    if (this.selectedTag) {
      filtered = filtered.filter(agent =>
        agent.agentTags.some((tag: AgentTag) => tag.tag?.id === this.selectedTag)
      );
    }

    // Appliquer le tri
    filtered = this.applySorting(filtered);

    this.filteredAgents = filtered;
    
    // Grouper par tags si activé
    if (this.groupByTags) {
      this.groupAgentsByTags(filtered);
    } else {
      this.groupedAgents.clear();
    }
    
    this.updatePagination();
  }

  private groupAgentsByTags(agents: Agent[]): void {
    this.groupedAgents.clear();
    
    agents.forEach(agent => {
      if (agent.agentTags.length === 0) {
        // Agents sans tags
        const untagged = this.groupedAgents.get('untagged') || [];
        untagged.push(agent);
        this.groupedAgents.set('untagged', untagged);
      } else {
        // Agents avec tags - ajouter à chaque groupe de tag
        agent.agentTags.forEach(agentTag => {
          if (agentTag.tag) {
            const tagName = agentTag.tag.name;
            const existing = this.groupedAgents.get(tagName) || [];
            existing.push(agent);
            this.groupedAgents.set(tagName, existing);
          }
        });
      }
    });
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


  // Helper methods
  getTagColor(tagName: string): string {
    const tag = this.availableTags.find(t => t.name === tagName);
    return tag?.color || '#9ca3af';
  }

  onSortChange(sortBy: 'name' | 'createdAt' | 'updatedAt' | 'executionCount'): void {
    if (this.sortBy === sortBy) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = sortBy;
      this.sortOrder = 'desc';
    }
    this.applyFilters();
    this.savePreferences();
  }

  viewAgent(agentId: string): void {
    this.router.navigate(['/agents', agentId]);
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
