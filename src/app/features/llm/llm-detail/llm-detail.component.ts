import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, Observable } from 'rxjs';
import { LLMConfig, LLMProviderType } from '../../../models/agent.model';
import { LLMService } from '../../../core/services/llm.service';
import { NotificationService } from '../../../core/services/notification.service';
import { RoleService } from '../../../core/services/role.service';

@Component({
  selector: 'app-llm-detail',
  templateUrl: './llm-detail.component.html',
  styleUrls: ['./llm-detail.component.css']
})
export class LLMDetailComponent implements OnInit, OnDestroy {
  config: LLMConfig | null = null;
  isLoading = true;
  
  // Role-based permissions
  hasWritePermission: Observable<boolean>;
  
  private subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private llmService: LLMService,
    private notificationService: NotificationService,
    private roleService: RoleService
  ) {
    this.hasWritePermission = this.roleService.hasWritePermission();
  }

  ngOnInit(): void {
    const configId = this.route.snapshot.paramMap.get('id');
    if (configId) {
      this.loadConfig(configId);
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private loadConfig(id: string): void {
    this.isLoading = true;
    this.subscription.add(
      this.llmService.getLLMConfigById(id).subscribe({
        next: (config: LLMConfig) => {
          this.config = config;
          this.isLoading = false;
        },
        error: (error: any) => {
          this.notificationService.error('Error', 'Failed to load LLM configuration details');
          console.error('Error loading LLM config:', error);
          this.isLoading = false;
          this.router.navigate(['/llm']);
        }
      })
    );
  }

  goBack(): void {
    this.router.navigate(['/llm']);
  }

  editConfig(): void {
    if (this.config) {
      this.router.navigate(['/llm', this.config.id, 'edit']);
    }
  }

  duplicateConfig(): void {
    if (!this.config) return;

    // For now, we'll just show a notification since duplicate functionality might not be implemented
    this.notificationService.info('Duplicate', 'Duplicate functionality will be implemented soon');
  }

  deleteConfig(): void {
    if (!this.config) return;

    if (confirm('Are you sure you want to delete this LLM configuration? This action cannot be undone.')) {
      this.subscription.add(
        this.llmService.deleteLLMConfig(this.config.id).subscribe({
          next: () => {
            this.notificationService.success('Configuration Deleted', 'LLM configuration has been deleted successfully');
            this.router.navigate(['/llm']);
          },
          error: (error: any) => {
            this.notificationService.error('Error', 'Failed to delete LLM configuration');
            console.error('Error deleting LLM config:', error);
          }
        })
      );
    }
  }

  getProviderColor(provider: string): string {
    switch (provider) {
      case 'OpenAI':
        return '#10a37f';
      case 'Azure':
        return '#0078d4';
      case 'Anthropic':
        return '#d97706';
      case 'Google':
        return '#4285f4';
      default:
        return '#9ca3af';
    }
  }

  getProviderClasses(provider: any): string {
    const providerStr = this.getProviderDisplayName(provider).toLowerCase();
    
    switch (providerStr) {
      case 'openai':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'azure openai':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'anthropic':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'google':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'ollama':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'custom':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  }

  getProviderDisplayName(provider: any): string {
    // Handle both string and number values
    const providerStr = String(provider).toLowerCase();
    
    switch (providerStr) {
      case '0':
      case 'openai':
      case 'openai':
        return 'OpenAI';
      case '1':
      case 'anthropic':
        return 'Anthropic';
      case '2':
      case 'google':
        return 'Google';
      case '3':
      case 'custom':
        return 'Custom';
      case '4':
      case 'ollama':
        return 'Ollama';
      case '5':
      case 'azureopenai':
      case 'azure_openai':
        return 'Azure OpenAI';
      default:
        return String(provider);
    }
  }

  maskApiKey(apiKey: string): string {
    if (!apiKey || apiKey.length < 8) return '••••••••';
    return apiKey.substring(0, 4) + '••••••••' + apiKey.substring(apiKey.length - 4);
  }
}
