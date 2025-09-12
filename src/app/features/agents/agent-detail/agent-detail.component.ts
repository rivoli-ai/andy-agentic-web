import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Agent, AgentExecutionResult, LLMProviderType } from '../../../models/agent.model';
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
      isPublic: agent.isPublic,
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

  getToolTypeColor(toolType: string): string {
    const type = toolType.toLowerCase();
    
    switch (type) {
      case 'mcptool':
        return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30';
      case 'apitool':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
      case 'function':
        return 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30';
      case 'http':
        return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30';
      case 'websocket':
        return 'text-cyan-600 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-900/30';
      case 'database':
        return 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30';
      case 'file':
        return 'text-pink-600 dark:text-pink-400 bg-pink-100 dark:bg-pink-900/30';
      case 'email':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
      case 'sms':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
      case 'webhook':
        return 'text-teal-600 dark:text-teal-400 bg-teal-100 dark:bg-teal-900/30';
      default:
        return 'text-slate-600 dark:text-slate-400 bg-slate-200 dark:bg-slate-600';
    }
  }

  getProviderName(provider: LLMProviderType | string): string {
    // If it's already a string (legacy), use it directly
    if (typeof provider === 'string') {
      return provider;
    }
    
    // If it's an enum, convert to readable name
    switch (provider) {
      case LLMProviderType.OPENAI:
        return 'OpenAI';
      case LLMProviderType.ANTHROPIC:
        return 'Anthropic';
      case LLMProviderType.GOOGLE:
        return 'Google';
      case LLMProviderType.OLLAMA:
        return 'Ollama';
      case LLMProviderType.CUSTOM:
        return 'Custom';
      case LLMProviderType.AZURE_OPENAI:
        return 'Azure OpenAI';
      default:
        return 'Custom';
    }
  }
}
