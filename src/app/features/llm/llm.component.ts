import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { LLMConfig, LLMProvider, LLMProviderType } from '../../models/agent.model';
import { LLMService } from '../../core/services/llm.service';
import { NotificationService } from '../../core/services/notification.service';
import { Router } from '@angular/router';

@Component({
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
  
  private subscription = new Subscription();

  constructor(
    private llmService: LLMService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

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

  testConnection(config: LLMConfig): void {
    this.subscription.add(
      this.llmService.testConnection(config).subscribe({
        next: (result) => {
          if (result.success) {
            this.notificationService.success('Connexion réussie', result.message);
          } else {
            this.notificationService.error('Échec de connexion', result.message);
          }
        },
        error: (error) => {
          this.notificationService.error('Erreur', 'Impossible de tester la connexion');
          console.error('Error testing connection:', error);
        }
      })
    );
  }

  deleteConfig(id: string): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette configuration LLM ?')) {
      this.subscription.add(
        this.llmService.deleteLLMConfig(id).subscribe({
          next: () => {
            this.notificationService.success('Succès', 'Configuration LLM supprimée');
            this.loadLLMConfigs();
          },
          error: (error) => {
            console.error('Error deleting LLM config:', error);
            this.notificationService.error('Erreur', 'Impossible de supprimer la configuration LLM');
          }
        })
      );
    }
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
      provider: config.provider,
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
}
