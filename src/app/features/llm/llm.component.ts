import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription, Observable } from 'rxjs';
import { LLMConfig, LLMProvider, LLMProviderType } from '../../models/agent.model';
import { LLMService } from '../../core/services/llm.service';
import { NotificationService } from '../../core/services/notification.service';
import { Router } from '@angular/router';
import { RoleService } from '../../core/services/role.service';

@Component({
  standalone: false,
  selector: 'app-llm',
  templateUrl: './llm.component.html',
  styleUrls: ['./llm.component.css']
})
export class LLMComponent implements OnInit, OnDestroy {
  llmConfigs: LLMConfig[] = [];
  providers: LLMProvider[] = [];
  isLoading = false;
  searchQuery = '';
  selectedProvider = '';
  
  // Role-based permissions
  hasWritePermission: Observable<boolean>;
  
  private subscription = new Subscription();

  constructor(
    private llmService: LLMService,
    private notificationService: NotificationService,
    private router: Router,
    private roleService: RoleService
  ) {
    this.hasWritePermission = this.roleService.hasWritePermission();
  }

  ngOnInit(): void {
    this.loadLLMConfigs();
    this.loadProviders();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  loadLLMConfigs(): void {
    this.isLoading = true;
    this.subscription.add(
      this.llmService.getLLMConfigs().subscribe({
        next: (configs) => {
          this.llmConfigs = configs;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading LLM configs:', error);
          this.notificationService.error('Erreur', 'Impossible de charger les configurations LLM');
          this.isLoading = false;
        }
      })
    );
  }

  loadProviders(): void {
    this.subscription.add(
      this.llmService.getProviders().subscribe({
        next: (providers) => {
          this.providers = providers;
        },
        error: (error) => {
          console.error('Error loading providers:', error);
        }
      })
    );
  }

  onSearch(): void {
    // Implement search functionality
  }

  onProviderFilterChange(): void {
    // Implement provider filter
  }

  deleteConfig(id: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    
    if (confirm('Are you sure you want to delete this LLM configuration? This action cannot be undone.')) {
      this.subscription.add(
        this.llmService.deleteLLMConfig(id).subscribe({
          next: () => {
            this.notificationService.success('Success', 'LLM configuration deleted successfully');
            this.loadLLMConfigs();
          },
          error: (error) => {
            console.error('Error deleting LLM config:', error);
            this.notificationService.error('Error', 'Unable to delete LLM configuration');
          }
        })
      );
    }
  }

  viewConfig(id: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.router.navigate(['/llm', id]);
  }

  createNewConfig(): void {
    this.router.navigate(['/llm/new']);
  }

  duplicateConfig(configId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    
    this.subscription.add(
      this.llmService.getLLMConfigById(configId).subscribe({
        next: (config) => {
          if (config) {
            const duplicatedConfig = {
              ...config,
              id: this.generateId(),
              name: `${config.name} (Copie)`,
              isActive: false
            };
            
            const createConfigDto = this.convertToCreateConfigDto(duplicatedConfig);
            this.subscription.add(
              this.llmService.createLLMConfig(createConfigDto).subscribe({
                next: () => {
                  this.notificationService.success('Succès', 'Configuration LLM dupliquée avec succès');
                  this.loadLLMConfigs();
                },
                error: (error: any) => {
                  this.notificationService.error('Erreur', 'Impossible de dupliquer la configuration LLM');
                  console.error('Error duplicating config:', error);
                }
              })
            );
          } else {
            this.notificationService.error('Erreur', 'Configuration non trouvée');
          }
        },
        error: (error: any) => {
          this.notificationService.error('Erreur', 'Impossible de récupérer la configuration');
          console.error('Error getting config:', error);
        }
      })
    );
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private convertToCreateConfigDto(config: LLMConfig): any {
    return {
      name: config.name,
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      model: config.model,
      provider: this.getProviderName(config.provider), // Convert enum to string
      isActive: config.isActive,
      isPublic: config.isPublic,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      topP: config.topP,
      frequencyPenalty: config.frequencyPenalty,
      presencePenalty: config.presencePenalty
    };
  }

  get filteredConfigs(): LLMConfig[] {
    let filtered = this.llmConfigs;

    if (this.searchQuery) {
      filtered = filtered.filter(config =>
        config.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        this.getProviderName(config.provider).toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        config.model.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }

    if (this.selectedProvider) {
      filtered = filtered.filter(config => {
        const configProviderId = typeof config.provider === 'string' 
          ? config.provider 
          : this.getProviderIdFromEnum(config.provider);
        return configProviderId === this.selectedProvider;
      });
    }

    return filtered;
  }

  getProviderName(provider: LLMProviderType | string): string {
    // If it's already a string (legacy), use it directly
    if (typeof provider === 'string') {
      const providerObj = this.providers.find(p => p.id === provider);
      return providerObj ? providerObj.name : provider;
    }
    
    // If it's an enum, convert to string ID first
    const providerId = this.getProviderIdFromEnum(provider);
    const providerObj = this.providers.find(p => p.id === providerId);
    return providerObj ? providerObj.name : providerId;
  }

  private getProviderIdFromEnum(providerEnum: LLMProviderType | number): string {
    // Handle numeric values from backend
    if (typeof providerEnum === 'number') {
      switch (providerEnum) {
        case 0:
          return 'openai';
        case 1:
          return 'anthropic';
        case 2:
          return 'google';
        case 3:
          return 'custom';
        case 4:
          return 'ollama';
        case 5:
          return 'azureopenai';
        default:
          return 'custom';
      }
    }
    
    // Handle string-based enum values
    switch (providerEnum) {
      case LLMProviderType.OPENAI:
        return 'openai';
      case LLMProviderType.ANTHROPIC:
        return 'anthropic';
      case LLMProviderType.GOOGLE:
        return 'google';
      case LLMProviderType.OLLAMA:
        return 'ollama';
      case LLMProviderType.CUSTOM:
        return 'custom';
      case LLMProviderType.AZURE_OPENAI:
        return 'azureopenai';
      default:
        return 'custom';
    }
  }

  getProviderClasses(provider: LLMProviderType | string): string {
    const providerName = this.getProviderName(provider).toLowerCase();
    
    switch (providerName) {
      case 'openai':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'anthropic':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'google':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'ollama':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'azure openai':
        return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200';
      case 'custom':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  }
}
