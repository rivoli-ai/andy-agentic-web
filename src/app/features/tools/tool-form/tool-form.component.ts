import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, AbstractControl, FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Tool, ToolType } from '../../../models/tool.model';
import { ToolService } from '../../../core/services/tool.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-tool-form',
  templateUrl: './tool-form.component.html',
  styleUrls: ['./tool-form.component.css']
})
export class ToolFormComponent implements OnInit, OnDestroy {
  toolForm: FormGroup;
  isEditMode = false;
  toolId: string | null = null;
  toolTypes = Object.values(ToolType);
  authenticationTypes = ['none', 'api_key', 'bearer', 'basic', 'oauth2'];
  
  private subscription = new Subscription();

  constructor(
    private fb: FormBuilder,
    private toolService: ToolService,
    private notificationService: NotificationService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.toolForm = this.createForm();
  }

  ngOnInit(): void {
    this.toolId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.toolId;
    
    if (this.isEditMode) {
      this.loadToolForEdit();
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
      type: [ToolType.INTERNAL, Validators.required],
      category: [''],
      isActive: [true],
      configuration: ['', [this.jsonValidator()]],
      // Simplification de l'authentification - on utilise des champs simples
      authType: ['none', Validators.required],
      authRequired: [false],
      authApiKey: [''],
      authUsername: [''],
      authPassword: [''],
      parameters: this.fb.array([])
    });
  }

  private loadToolForEdit(): void {
    if (!this.toolId) return;
    
    this.subscription.add(
      this.toolService.getToolById(this.toolId).subscribe({
        next: (tool) => {
          if (tool) {
            this.populateForm(tool);
          }
        },
        error: (error) => {
          this.notificationService.error('Erreur', 'Impossible de charger l\'outil pour édition');
          console.error('Error loading tool:', error);
        }
      })
    );
  }

  private populateForm(tool: Tool): void {
    // Vider les FormArrays existants
    this.clearFormArrays();
    
    // Remplir le formulaire principal
    this.toolForm.patchValue({
      name: tool.name,
      description: tool.description,
      type: tool.type,
      category: tool.category || '',
      isActive: tool.isActive,
      configuration: tool.configuration || ''
    });

         // Remplir l'authentification
     if (tool.authentication) {
       this.toolForm.patchValue({
         authType: tool.authentication.type || 'none',
         authRequired: tool.authentication.required || false,
         authApiKey: tool.authentication.apiKey || '',
         authUsername: tool.authentication.username || '',
         authPassword: tool.authentication.password || ''
       });
     }

    // Ajouter les paramètres
    if (tool.parameters && tool.parameters.length > 0) {
      tool.parameters.forEach(parameter => {
        this.addParameter(parameter);
      });
    }
  }

  private clearFormArrays(): void {
    while (this.parametersArray.length !== 0) {
      this.parametersArray.removeAt(0);
    }
  }

  // Getters pour les FormArrays
  get parametersArray(): FormArray { return this.toolForm.get('parameters') as FormArray; }

  getParameterGroup(index: number): FormGroup { return this.parametersArray.at(index) as FormGroup; }
  getParameterName(index: number): FormControl { 
    const control = this.getParameterGroup(index)?.get('name');
    return control instanceof FormControl ? control : new FormControl('');
  }
  getParameterType(index: number): FormControl { 
    const control = this.getParameterGroup(index)?.get('type');
    return control instanceof FormControl ? control : new FormControl('');
  }
  getParameterDefault(index: number): FormControl { 
    const control = this.getParameterGroup(index)?.get('default');
    return control instanceof FormControl ? control : new FormControl('');
  }
  getParameterDescription(index: number): FormControl { 
    const control = this.getParameterGroup(index)?.get('description');
    return control instanceof FormControl ? control : new FormControl('');
  }
  getParameterRequired(index: number): FormControl { 
    const control = this.getParameterGroup(index)?.get('required');
    return control instanceof FormControl ? control : new FormControl(false);
  }



  // Méthodes pour les Paramètres
  addParameter(parameter?: any): void {
    const parameterGroup = this.fb.group({
      name: [parameter?.name || '', [Validators.required]],
      type: [parameter?.type || 'string', [Validators.required]],
      required: [parameter?.required ?? false],
      default: [parameter?.default || ''],
      description: [parameter?.description || '']
    });

    this.parametersArray.push(parameterGroup);
  }

  removeParameter(index: number): void {
    this.parametersArray.removeAt(index);
  }

  // Gestion de l'authentification
  onAuthenticationTypeChange(): void {
    const authType = this.toolForm.get('authType')?.value;
    console.log('onAuthenticationTypeChange - authType:', authType);
    
    // Réinitialiser les champs selon le type
    if (authType === 'none') {
      this.toolForm.patchValue({
        authRequired: false,
        authApiKey: '',
        authUsername: '',
        authPassword: ''
      });
    } else if (authType === 'api_key' || authType === 'bearer') {
      this.toolForm.patchValue({
        authUsername: '',
        authPassword: ''
      });
    } else if (authType === 'basic') {
      this.toolForm.patchValue({
        authApiKey: ''
      });
    }
    
    // Forcer la détection des changements
    this.cdr.detectChanges();
    console.log('onAuthenticationTypeChange - form updated, change detection forced');
  }

  // Soumission du formulaire
  onSubmit(): void {
    if (this.toolForm.valid) {
      const formValue = this.toolForm.value;
      
             // Construire l'objet d'authentification de manière simple
       console.log('onSubmit - formValue:', formValue);
       const authentication: any = {
         type: formValue.authType,
         required: formValue.authRequired || false
       };

       if (formValue.authType === 'api_key' || formValue.authType === 'bearer') {
         authentication.apiKey = formValue.authApiKey;
       } else if (formValue.authType === 'basic') {
         authentication.username = formValue.authUsername;
         authentication.password = formValue.authPassword;
       }

       console.log('onSubmit - authentication object:', authentication);

             // Nettoyer la configuration pour éviter les caractères d'échappement multiples
       const configurationValue = this.cleanConfiguration(formValue.configuration);

       const toolData = {
         name: formValue.name,
         id : this.toolId,
         description: formValue.description,
         type: formValue.type,
         category: formValue.category || undefined,
         isActive: formValue.isActive,
         configuration: configurationValue,
         authentication: JSON.stringify(authentication),
         parameters: JSON.stringify(formValue.parameters)
       };

      if (this.isEditMode && this.toolId) {
        this.updateTool(toolData);
      } else {
        this.createTool(toolData);
      }
    } else {
      this.markFormGroupTouched();
      this.notificationService.error('Erreur de validation', 'Veuillez corriger les erreurs dans le formulaire');
    }
  }

  private createTool(toolData: any): void {
    this.subscription.add(
      this.toolService.createTool(toolData).subscribe({
        next: (tool) => {
          this.notificationService.success('Succès', 'Outil créé avec succès');
          this.router.navigate(['/tools']);
        },
        error: (error) => {
          this.notificationService.error('Erreur', 'Impossible de créer l\'outil');
          console.error('Error creating tool:', error);
        }
      })
    );
  }

  private updateTool(toolData: any): void {
    if (!this.toolId) return;
    
    this.subscription.add(
      this.toolService.updateTool(this.toolId, toolData).subscribe({
        next: (tool) => {
          this.notificationService.success('Succès', 'Outil mis à jour avec succès');
          this.router.navigate(['/tools']);
        },
        error: (error) => {
          this.notificationService.error('Erreur', 'Impossible de mettre à jour l\'outil');
          console.error('Error updating tool:', error);
        }
      })
    );
  }

  private markFormGroupTouched(): void {
    Object.keys(this.toolForm.controls).forEach(key => {
      const control = this.toolForm.get(key);
      control?.markAsTouched();
    });
  }

  // Navigation
  onCancel(): void {
    this.router.navigate(['/tools']);
  }

  // Validation helpers
  isFieldInvalid(fieldName: string): boolean {
    const field = this.toolForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.toolForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) return 'Ce champ est requis';
      if (field.errors['minlength']) return `Minimum ${field.errors['minlength'].requiredLength} caractères`;
      if (field.errors['maxlength']) return `Maximum ${field.errors['maxlength'].requiredLength} caractères`;
      if (field.errors['invalidJson']) return 'Format JSON invalide';
    }
    return '';
  }

  // Helpers pour l'affichage conditionnel
  showApiKeyField(): boolean {
    const authType = this.toolForm.get('authType')?.value;
    return authType === 'api_key' || authType === 'bearer';
  }

  showBasicAuthFields(): boolean {
    const authType = this.toolForm.get('authType')?.value;
    return authType === 'basic';
  }

  showCategoryField(): boolean {
    return true; // Always show category field
  }

  showAuthenticationRequiredField(): boolean {
    const authType = this.toolForm.get('authType')?.value;
    console.log('showAuthenticationRequiredField - authType:', authType);
    const shouldShow = authType !== 'none';
    console.log('showAuthenticationRequiredField - shouldShow:', shouldShow);
    return shouldShow;
  }

  // Validation JSON
  validateJson(value: string): boolean {
    if (!value) return true;
    try {
      JSON.parse(value);
      return true;
    } catch {
      return false;
    }
  }

  // Validateur personnalisé pour JSON
  private jsonValidator() {
    return (control: AbstractControl): {[key: string]: any} | null => {
      const value = control.value;
      if (!value) return null;
      
      try {
        JSON.parse(value);
        return null;
      } catch {
        return {'invalidJson': {value: control.value}};
      }
    };
  }

  // Méthode utilitaire pour nettoyer la configuration JSON
  private cleanConfiguration(config: string | undefined): string | undefined {
    if (!config) return undefined;
    
    try {
      // Essayer de parser le JSON pour vérifier qu'il est valide
      const parsed = JSON.parse(config);
      // Re-stringifier avec un formatage propre (sans espaces)
      return JSON.stringify(parsed);
    } catch {
      // Si ce n'est pas du JSON valide, retourner undefined
      return undefined;
    }
  }
}
