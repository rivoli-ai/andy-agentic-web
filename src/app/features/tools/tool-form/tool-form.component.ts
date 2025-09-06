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
  httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
  mcpTypes = ['SSE', 'HTTP Streaming'];
  
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
    
    // Set initial validation based on default tool type
    this.onToolTypeChange();
    
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
      type: [ToolType.MCP, Validators.required],
      category: [''],
      isActive: [true],
      endpoint: ['', [Validators.required]],
      method: ['GET'],
      mcpType: ['SSE'],
      mcpName: [''],
      // Simplification de l'authentification - on utilise des champs simples
      authType: ['none', Validators.required],
      authRequired: [false],
      authApiKey: [''],
      authUsername: [''],
      authPassword: [''],
      parameters: this.fb.array([]),
      headers: this.fb.array([])
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
    
    // Parse configuration to extract endpoint, method, mcpType, and mcpName
    let endpoint = '';
    let method = 'GET';
    let mcpType = 'SSE';
    let mcpName = '';
    
    if (tool.configuration) {
      try {
        const config = JSON.parse(tool.configuration);
        endpoint = config.endpoint || '';
        method = config.method || 'GET';
        mcpType = config.mcpType || 'SSE';
        mcpName = config.name || '';
      } catch (e) {
        // If configuration is not valid JSON, keep defaults
        console.warn('Invalid configuration JSON:', tool.configuration);
      }
    }
    
    // Remplir le formulaire principal
    this.toolForm.patchValue({
      name: tool.name,
      description: tool.description,
      type: tool.type,
      category: tool.category || '',
      isActive: tool.isActive,
      endpoint: endpoint,
      method: method,
      mcpType: mcpType,
      mcpName: mcpName
    });

         // Remplir l'authentification - parse JSON string if needed
     let authData: any = {};
     if (tool.authentication) {
       if (typeof tool.authentication === 'string') {
         try {
           authData = JSON.parse(tool.authentication);
         } catch (e) {
           console.warn('Invalid authentication JSON:', tool.authentication);
           authData = {};
         }
       } else {
         authData = tool.authentication;
       }
       
       this.toolForm.patchValue({
         authType: authData.type || 'none',
         authRequired: authData.required || false,
         authApiKey: authData.apiKey || '',
         authUsername: authData.username || '',
         authPassword: authData.password || ''
       });
     }

    // Ajouter les paramètres - parse JSON string if needed
    let parametersArray: any[] = [];
    if (tool.parameters) {
      if (typeof tool.parameters === 'string') {
        try {
          parametersArray = JSON.parse(tool.parameters);
        } catch (e) {
          console.warn('Invalid parameters JSON:', tool.parameters);
        }
      } else if (Array.isArray(tool.parameters)) {
        parametersArray = tool.parameters;
      }
    }
    
    if (parametersArray.length > 0) {
      parametersArray.forEach(parameter => {
        this.addParameter(parameter);
      });
    }

    // Ajouter les headers - parse JSON string if needed
    let headersArray: any[] = [];
    if (tool.headers) {
      if (typeof tool.headers === 'string') {
        try {
          headersArray = JSON.parse(tool.headers);
        } catch (e) {
          console.warn('Invalid headers JSON:', tool.headers);
        }
      } else if (Array.isArray(tool.headers)) {
        headersArray = tool.headers;
      }
    }
    
    if (headersArray.length > 0) {
      headersArray.forEach(header => {
        this.addHeader(header);
      });
    }
    
    // Set validation based on the loaded tool type
    this.onToolTypeChange();
  }

  private clearFormArrays(): void {
    while (this.parametersArray.length !== 0) {
      this.parametersArray.removeAt(0);
    }
    while (this.headersArray.length !== 0) {
      this.headersArray.removeAt(0);
    }
  }

  // Getters pour les FormArrays
  get parametersArray(): FormArray { return this.toolForm.get('parameters') as FormArray; }
  get headersArray(): FormArray { return this.toolForm.get('headers') as FormArray; }

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

  // Méthodes pour les Headers
  addHeader(header?: any): void {
    const headerGroup = this.fb.group({
      name: [header?.name || '', [Validators.required]],
      value: [header?.value || '', [Validators.required]],
      required: [header?.required ?? false],
      description: [header?.description || '']
    });

    this.headersArray.push(headerGroup);
  }

  removeHeader(index: number): void {
    this.headersArray.removeAt(index);
  }

  getHeaderGroup(index: number): FormGroup { return this.headersArray.at(index) as FormGroup; }
  getHeaderName(index: number): FormControl { 
    const control = this.getHeaderGroup(index)?.get('name');
    return control instanceof FormControl ? control : new FormControl('');
  }
  getHeaderValue(index: number): FormControl { 
    const control = this.getHeaderGroup(index)?.get('value');
    return control instanceof FormControl ? control : new FormControl('');
  }
  getHeaderDescription(index: number): FormControl { 
    const control = this.getHeaderGroup(index)?.get('description');
    return control instanceof FormControl ? control : new FormControl('');
  }
  getHeaderRequired(index: number): FormControl { 
    const control = this.getHeaderGroup(index)?.get('required');
    return control instanceof FormControl ? control : new FormControl(false);
  }

  // Gestion du changement de type d'outil
  onToolTypeChange(): void {
    const toolType = this.toolForm.get('type')?.value;
    const methodControl = this.toolForm.get('method');
    const mcpTypeControl = this.toolForm.get('mcpType');
    
    if (toolType === ToolType.API) {
      methodControl?.setValidators([Validators.required]);
      mcpTypeControl?.clearValidators();
    } else if (toolType === ToolType.MCP) {
      methodControl?.clearValidators();
      mcpTypeControl?.setValidators([Validators.required]);
    }
    
    methodControl?.updateValueAndValidity();
    mcpTypeControl?.updateValueAndValidity();
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

       // Generate configuration JSON based on tool type
       let configuration: any = {
         endpoint: formValue.endpoint
       };
       
       if (formValue.type === ToolType.API) {
         configuration.method = formValue.method;
       } else if (formValue.type === ToolType.MCP) {
         configuration.mcpType = formValue.mcpType;
         if (formValue.mcpName) {
           configuration.name = formValue.mcpName;
         }
       }
       
       const configurationValue = JSON.stringify(configuration);

       const toolData = {
         name: formValue.name,
         id : this.toolId,
         description: formValue.description,
         type: formValue.type,
         category: formValue.category || undefined,
         isActive: formValue.isActive,
         configuration: configurationValue,
         authentication: JSON.stringify(authentication),
         parameters: JSON.stringify(formValue.parameters),
         headers: JSON.stringify(formValue.headers)
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

  showMethodField(): boolean {
    const toolType = this.toolForm.get('type')?.value;
    return toolType === ToolType.API;
  }

  showMcpTypeField(): boolean {
    const toolType = this.toolForm.get('type')?.value;
    return toolType === ToolType.MCP;
  }

}
