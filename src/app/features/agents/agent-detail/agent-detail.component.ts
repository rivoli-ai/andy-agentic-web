import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Agent, AgentExecutionResult } from '../../../models/agent.model';
import { AgentService } from '../../../core/services/agent.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-agent-detail',
  templateUrl: './agent-detail.component.html',
  styleUrls: ['./agent-detail.component.css']
})
export class AgentDetailComponent implements OnInit, OnDestroy {
  agent: Agent | null = null;
  executions: AgentExecutionResult[] = [];
  isLoading = true;
  isExecuting = false;
  
  private subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private agentService: AgentService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    const agentId = this.route.snapshot.paramMap.get('id');
    if (agentId) {
      this.loadAgent(agentId);
      this.loadExecutions(agentId);
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private loadAgent(agentId: string): void {
    this.isLoading = true;
    this.subscription.add(
      this.agentService.getAgentById(agentId).subscribe({
        next: (agent) => {
          this.agent = agent || null;
          this.isLoading = false;
        },
        error: (error) => {
          this.notificationService.error('Erreur', 'Impossible de charger l\'agent');
          console.error('Error loading agent:', error);
          this.isLoading = false;
        }
      })
    );
  }

  private loadExecutions(agentId: string): void {
    this.subscription.add(
      this.agentService.getExecutionsByAgent(agentId).subscribe({
        next: (executions) => {
          this.executions = executions;
        },
        error: (error) => {
          console.error('Error loading executions:', error);
        }
      })
    );
  }

  executeAgent(): void {
    if (!this.agent) return;

    this.isExecuting = true;
    this.notificationService.info('Exécution', 'Démarrage de l\'exécution de l\'agent...');

    this.subscription.add(
      this.agentService.executeAgent(this.agent.id, {}).subscribe({
        next: (result) => {
          this.isExecuting = false;
          this.notificationService.success(
            'Exécution terminée',
            `Agent exécuté avec succès en ${result.executionTime}ms`
          );
          this.loadExecutions(this.agent!.id);
          this.loadAgent(this.agent!.id); // Recharger pour mettre à jour le compteur
        },
        error: (error) => {
          this.isExecuting = false;
          this.notificationService.error('Erreur', 'Échec de l\'exécution de l\'agent');
          console.error('Error executing agent:', error);
        }
      })
    );
  }

  editAgent(): void {
    if (this.agent) {
      this.router.navigate(['/agents', this.agent.id, 'edit']);
    }
  }

  deleteAgent(): void {
    if (!this.agent) return;

    if (confirm('Êtes-vous sûr de vouloir supprimer cet agent ? Cette action est irréversible.')) {
      this.subscription.add(
        this.agentService.deleteAgent(this.agent.id).subscribe({
          next: () => {
            this.notificationService.success('Suppression', 'Agent supprimé avec succès');
            this.router.navigate(['/agents']);
          },
          error: (error) => {
            this.notificationService.error('Erreur', 'Impossible de supprimer l\'agent');
            console.error('Error deleting agent:', error);
          }
        })
      );
    }
  }

  duplicateAgent(): void {
    if (!this.agent) return;

    // Créer une copie de l'agent
    const duplicatedAgent: Agent = {
      ...this.agent,
      name: `${this.agent.name} (Copie)`,
      id: 'temp-id',
      createdAt: new Date(),
      updatedAt: new Date(),
      executionCount: 0
    };

    const createAgentDto = this.convertToCreateAgentDto(duplicatedAgent);
    this.subscription.add(
      this.agentService.createAgent(createAgentDto).subscribe({
        next: (newAgent) => {
          this.notificationService.success('Duplication', 'Agent dupliqué avec succès');
          this.router.navigate(['/agents', newAgent.id]);
        },
        error: (error) => {
          this.notificationService.error('Erreur', 'Impossible de dupliquer l\'agent');
          console.error('Error duplicating agent:', error);
        }
      })
    );
  }

  getStatusClasses(isActive: boolean): string {
    return isActive
      ? 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200'
      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  }

  getTypeClasses(type: string): string {
    const typeClasses: { [key: string]: string } = {
      'chatbot': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'assistant': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'automation': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'analysis': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'creative': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
    };
    return typeClasses[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  }

  getExecutionStatusClasses(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'success': 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200',
      'error': 'bg-error-100 text-error-800 dark:bg-error-900 dark:text-error-200',
      'running': 'bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-200'
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  }

  formatExecutionTime(time: number): string {
    if (time < 1000) return `${time}ms`;
    return `${(time / 1000).toFixed(2)}s`;
  }

  goBack(): void {
    this.router.navigate(['/agents']);
  }

  private convertToCreateAgentDto(agent: Agent): any {
    return {
      name: agent.name,
      description: agent.description,
      type: agent.type,
      isActive: agent.isActive,
      tags: agent.agentTags,
      llmConfig: {
        name: agent.llmConfig.name,
        baseUrl: agent.llmConfig.baseUrl,
        apiKey: agent.llmConfig.apiKey,
        model: agent.llmConfig.model,
        provider: agent.llmConfig.provider,
        isActive: agent.llmConfig.isActive,
        maxTokens: agent.llmConfig.maxTokens,
        temperature: agent.llmConfig.temperature,
        topP: agent.llmConfig.topP,
        frequencyPenalty: agent.llmConfig.frequencyPenalty,
        presencePenalty: agent.llmConfig.presencePenalty
      },
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
