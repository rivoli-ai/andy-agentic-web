import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Agent, AgentTag, AgentType } from '../../models/agent.model';
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

    this.filteredAgents = filtered;
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
      tags: agent.agentTags,
      llmConfigId: agent.llmConfig?.id,
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
        name: t.name,
        type: t.type,
        isActive: t.isActive,
        toolId: t.toolId,
        category: t.category,
        configuration: t.configuration,
        authentication: t.authentication,
        parameters: JSON.stringify(t.parameters || {}),
        description: t.description
      })),
      mcpServers: agent.mcpServers.map(m => ({
        name: m.name,
        isActive: m.isActive,
        capabilities: JSON.stringify(m.capabilities || [])
      }))
    };
  }
}
