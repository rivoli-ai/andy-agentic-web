import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, forkJoin, of } from 'rxjs';
import { LLMConfig, LLMProvider } from '../../../models/agent.model';
import { LLMService } from '../../../core/services/llm.service';
import { NotificationService } from '../../../core/services/notification.service';


@Component({
  selector: 'app-llm-form',
  templateUrl: './llm-form.component.html',
  styleUrls: ['./llm-form.component.css']
})
export class LLMFormComponent implements OnInit, OnDestroy {
  llmForm: FormGroup;
  isEditMode = false;
  configId: string | null = null;
  providers: LLMProvider[] = [];
  selectedProvider: LLMProvider | null = null;
  isCustomModel = false;
  isLoading = false;
  private subscription = new Subscription();

  constructor(
    private fb: FormBuilder,
    private llmService: LLMService,
    private notificationService: NotificationService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,

  ) {
    this.llmForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadProviders();
    this.configId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.configId;
    
    if (this.isEditMode) {
      this.loadConfigForEdit();
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private loadProviders(): void {
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

  private loadConfigForEdit(): void {
    if (!this.configId) return;
    
    this.isLoading = true;
    this.subscription.add(
      this.llmService.getLLMConfigById(this.configId).subscribe({
        next: (config) => {
          this.populateForm(config);
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.notificationService.error('Erreur', 'Impossible de charger la configuration pour édition');
          console.error('Error loading config:', error);
          this.isLoading = false;
        }
      })
    );
  }

  private createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      baseUrl: ['', [Validators.required, Validators.pattern('https?://.+')]],
      apiKey: ['', [Validators.required]],
      model: ['', [Validators.required]],
      provider: ['', [Validators.required]],
      isActive: [true],
      maxTokens: [4000, [Validators.min(1), Validators.max(100000)]],
      temperature: [0.7, [Validators.min(0), Validators.max(2)]],
      topP: [1, [Validators.min(0), Validators.max(1)]],
      frequencyPenalty: [0, [Validators.min(-2), Validators.max(2)]],
      presencePenalty: [0, [Validators.min(-2), Validators.max(2)]]
    });
  }

  private populateForm(config: LLMConfig): void {
    this.llmForm.patchValue({
      name: config.name,
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      model: config.model,
      provider: config.provider,
      isActive: config.isActive,
      maxTokens: config.maxTokens || 4000,
      temperature: config.temperature || 0.7,
      topP: config.topP || 1,
      frequencyPenalty: config.frequencyPenalty || 0,
      presencePenalty: config.presencePenalty || 0
    });

    // Set selected provider
    const provider = this.providers.find(p => p.id === config.provider);
    if (provider) {
      this.selectedProvider = provider;
      this.updateApiKeyValidation();
      this.isCustomModel = !provider.models.includes(config.model);
    }
  }

  onProviderChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    if (!target) return;
    
    const providerId = target.value;
    this.setProviderConfig(providerId);
  }

  onModelSelectChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    if (!target) return;
    
    const selectedValue = target.value;
    
    if (selectedValue === 'custom') {
      this.isCustomModel = true;
      if (!this.hasCustomModel) {
        this.llmForm.get('model')?.setValue('');
      }
      setTimeout(() => {
        const customInput = document.getElementById('customModel');
        if (customInput) {
          customInput.focus();
        }
      }, 100);
    } else if (selectedValue) {
      this.isCustomModel = false;
      this.llmForm.get('model')?.setValue(selectedValue);
    } else {
      this.isCustomModel = false;
      this.llmForm.get('model')?.setValue('');
    }
  }

  private setProviderConfig(providerId: string): void {
    this.selectedProvider = this.providers.find(p => p.id === providerId) || null;
    
    if (this.selectedProvider) {
      this.isCustomModel = false;
      
      this.llmForm.patchValue({
        provider: this.selectedProvider.id,
        baseUrl: this.selectedProvider.baseUrl,
        model: this.selectedProvider.models.length > 0 ? this.selectedProvider.models[0] : ''
      });

      this.updateApiKeyValidation();
    }
  }

  private updateApiKeyValidation(): void {
    const apiKeyControl = this.llmForm.get('apiKey');
    if (apiKeyControl && this.selectedProvider) {
      if (this.selectedProvider.id === 'ollama') {
        apiKeyControl.clearValidators();
      } else {
        apiKeyControl.setValidators([Validators.required]);
      }
      apiKeyControl.updateValueAndValidity();
    }
  }

  get availableModels(): string[] {
    return this.selectedProvider?.models || [];
  }

  get hasCustomModel(): boolean {
    const currentModel = this.llmForm.get('model')?.value;
    if (!currentModel || !this.selectedProvider) return false;
    
    return !this.selectedProvider.models.includes(currentModel);
  }

  get modelSelectionStatus(): string {
    const currentModel = this.llmForm.get('model')?.value;
    if (!currentModel) return 'no-model';
    if (this.isCustomModel) return 'custom';
    if (this.hasCustomModel) return 'custom-not-selected';
    return 'predefined';
  }

  getModelSelectValue(): string {
    const currentModel = this.llmForm.get('model')?.value;
    if (!currentModel) return '';
    
    if (this.isCustomModel || this.hasCustomModel) {
      return 'custom';
    }
    
    return currentModel;
  }

  testConnection(): void {
    const formValue = this.llmForm.value;
    if (!this.llmForm.valid) return;

    const testConfig = {
      baseUrl: formValue.baseUrl,
      apiKey: formValue.apiKey,
      model: formValue.model,
      provider: formValue.provider
    };

    this.subscription.add(
      this.llmService.testConnection(testConfig).subscribe({
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

  onSubmit(): void {
    if (this.llmForm.valid) {
      const formValue = this.llmForm.value;
      
      const configData = {
        id : this.configId,
        name: formValue.name,
        baseUrl: formValue.baseUrl,
        apiKey: formValue.apiKey,
        model: formValue.model,
        provider: formValue.provider,
        isActive: formValue.isActive,
        maxTokens: formValue.maxTokens,
        temperature: formValue.temperature,
        topP: formValue.topP,
        frequencyPenalty: formValue.frequencyPenalty,
        presencePenalty: formValue.presencePenalty
      };

      if (this.isEditMode && this.configId) {
        this.updateConfig(configData);
      } else {
        this.createConfig(configData);
      }
    } else {
      this.markFormGroupTouched();
      this.notificationService.error('Erreur de validation', 'Veuillez corriger les erreurs dans le formulaire');
    }
  }

  private createConfig(configData: any): void {
    this.subscription.add(
      this.llmService.createLLMConfig(configData).subscribe({
        next: (config) => {
          this.notificationService.success('Succès', 'Configuration LLM créée avec succès');
          this.router.navigate(['/llm']);
        },
        error: (error) => {
          this.notificationService.error('Erreur', 'Impossible de créer la configuration LLM');
          console.error('Error creating config:', error);
        }
      })
    );
  }

  private updateConfig(configData: any): void {
    if (!this.configId) return;
    
    this.subscription.add(
      this.llmService.updateLLMConfig(this.configId, configData).subscribe({
        next: (config) => {
          this.notificationService.success('Succès', 'Configuration LLM mise à jour avec succès');
          this.router.navigate(['/llm']);
        },
        error: (error) => {
          this.notificationService.error('Erreur', 'Impossible de mettre à jour la configuration LLM');
          console.error('Error updating config:', error);
        }
      })
    );
  }

  private markFormGroupTouched(): void {
    Object.keys(this.llmForm.controls).forEach(key => {
      const control = this.llmForm.get(key);
      control?.markAsTouched();
    });
  }

  onCancel(): void {
    this.router.navigate(['/llm']);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.llmForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.llmForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) return 'Ce champ est requis';
      if (field.errors['minlength']) return `Minimum ${field.errors['minlength'].requiredLength} caractères`;
      if (field.errors['maxlength']) return `Maximum ${field.errors['maxlength'].requiredLength} caractères`;
      if (field.errors['min']) return `Valeur minimum: ${field.errors['min'].min}`;
      if (field.errors['max']) return `Valeur maximum: ${field.errors['max'].max}`;
      if (field.errors['pattern']) return 'Format d\'URL invalide';
    }
    return '';
  }


}
