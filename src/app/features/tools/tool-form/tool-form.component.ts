import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, AbstractControl, FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Tool, ToolType, McpToolDiscovery } from '../../../models/tool.model';
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
  authenticationTypes = ['none', 'api_key', 'bearer', 'basic', 'oauth2', 'azure_oauth2'];
  httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
  mcpTypes = ['SSE', 'HTTP Streaming'];
  
  // Predefined internal tool names
  internalToolNames = [
    { value: 'Search', description: 'Search functionality for finding information' },
    { value: 'Export', description: 'Export responses to document formats (Excel, PDF, Word)' }
  ];
  
  // MCP Discovery properties
  discoveredMcpTools: McpToolDiscovery[] = [];
  isDiscoveringMcpTools = false;
  mcpDiscoveryError = '';
  selectedMcpTool: McpToolDiscovery | null = null;
  private isManualToolSelection = false; // Flag to prevent auto-discovery during manual selection
  
  // Loading states
  isLoadingTool = false;
  
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
    
    // Listen for endpoint changes to auto-discover MCP tools
    this.subscription.add(
      this.toolForm.get('endpoint')?.valueChanges.subscribe(endpoint => {
        this.onEndpointChange(endpoint);
      })
    );
    
    if (this.isEditMode) {
      this.loadToolForEdit();
    } else {
      // Only set initial validation for new tools (not editing)
      this.onToolTypeChange();
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      internalToolName: [''], // For predefined internal tool names
      description: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(1000)]], // More lenient for InternalTool
      type: [ToolType.INTERNAL, Validators.required],
      category: [''],
      isActive: [true],
      endpoint: [''], // Remove required validator - will be set based on tool type
      method: ['GET'],
      mcpType: ['SSE'],
      mcpName: [''],
      // Simplification de l'authentification - on utilise des champs simples
      authType: ['none'], // Remove required validator - will be set based on tool type
      authRequired: [false],
      authApiKey: [''],
      authUsername: [''],
      authPassword: [''],
      authClientId: [''],
      authClientSecret: [''],
      authTokenUrl: [''],
      authTenantId: [''],
      authResource: [''],
      authScopes: [''],
      parameters: this.fb.array([]),
      headers: this.fb.array([]),
      configFields: this.fb.array([]) // Configuration fields for internal tools
    });
  }

  private loadToolForEdit(): void {
    if (!this.toolId) return;
    
    this.isLoadingTool = true;
    this.subscription.add(
      this.toolService.getToolById(this.toolId).subscribe({
        next: (tool) => {
          if (tool) {
            this.populateForm(tool);
          }
          this.isLoadingTool = false;
        },
        error: (error) => {
          this.notificationService.error('Erreur', 'Impossible de charger l\'outil pour édition');
          console.error('Error loading tool:', error);
          this.isLoadingTool = false;
        }
      })
    );
  }

  private populateForm(tool: Tool): void {
    // Vider les FormArrays existants
    this.clearFormArrays();
    
    console.log('populateForm - tool.type:', tool.type);
    console.log('populateForm - tool:', tool);
    
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
      mcpName: mcpName,
      internalToolName: tool.type === ToolType.INTERNAL ? tool.name : ''
    });
    
    // Pour les InternalTool, parser la configuration en champs clé-valeur
    if (tool.type === ToolType.INTERNAL && tool.configuration) {
      try {
        const config = JSON.parse(tool.configuration);
        Object.entries(config).forEach(([key, value]) => {
          this.addConfigField(key, String(value));
        });
      } catch (e) {
        console.error('Error parsing configuration JSON for InternalTool:', tool.configuration, e);
      }
    }
    
    console.log('populateForm - form type after patch:', this.toolForm.get('type')?.value);

         // Remplir l'authentification - parse JSON string if needed
     let authData: any = {};
     console.log('populateForm - tool.authentication:', tool.authentication);
     console.log('populateForm - typeof tool.authentication:', typeof tool.authentication);
     
     if (tool.authentication) {
       if (typeof tool.authentication === 'string') {
         console.log('populateForm - parsing JSON string');
         try {
           authData = JSON.parse(tool.authentication);
           console.log('populateForm - parsed authData:', authData);
         } catch (e) {
           console.warn('Invalid authentication JSON:', tool.authentication);
           authData = {};
         }
       } else {
         console.log('populateForm - using authentication object directly');
         authData = tool.authentication;
       }
       
      console.log('populateForm - final authData:', authData);
      console.log('populateForm - authData.type:', authData.type);
      
      this.toolForm.patchValue({
        authType: authData.type || 'none',
        authRequired: authData.required || false,
        authApiKey: authData.apiKey || authData.token || '',
        authUsername: authData.username || '',
        authPassword: authData.password || '',
        authClientId: authData.clientId || '',
        authClientSecret: authData.clientSecret || '',
        authTokenUrl: authData.tokenUrl || '',
        authTenantId: authData.tenantId || '',
        authResource: authData.resource || '',
        authScopes: authData.scopes || ''
      });
      console.log('populateForm - authType set to:', authData.type || 'none');
      console.log('populateForm - form authType after patch:', this.toolForm.get('authType')?.value);
     } else {
       console.log('populateForm - no authentication data found');
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
    console.log('populateForm - calling onToolTypeChange, current authType:', this.toolForm.get('authType')?.value);
    this.onToolTypeChange();
    console.log('populateForm - after onToolTypeChange, authType:', this.toolForm.get('authType')?.value);
  }

  private clearFormArrays(): void {
    while (this.parametersArray.length !== 0) {
      this.parametersArray.removeAt(0);
    }
    while (this.headersArray.length !== 0) {
      this.headersArray.removeAt(0);
    }
    while (this.configFieldsArray.length !== 0) {
      this.configFieldsArray.removeAt(0);
    }
  }

  // Getters pour les FormArrays
  get parametersArray(): FormArray { return this.toolForm.get('parameters') as FormArray; }
  get headersArray(): FormArray { return this.toolForm.get('headers') as FormArray; }
  get configFieldsArray(): FormArray { return this.toolForm.get('configFields') as FormArray; }

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

  // Configuration Fields Management (for Internal Tools)
  addConfigField(key?: string, value?: string): void {
    const configGroup = this.fb.group({
      key: [key || '', [Validators.required]],
      value: [value || '', [Validators.required]]
    });
    this.configFieldsArray.push(configGroup);
  }

  removeConfigField(index: number): void {
    this.configFieldsArray.removeAt(index);
  }

  getConfigFieldGroup(index: number): FormGroup {
    return this.configFieldsArray.at(index) as FormGroup;
  }

  getConfigFieldKey(index: number): FormControl {
    const control = this.getConfigFieldGroup(index)?.get('key');
    return control instanceof FormControl ? control : new FormControl('');
  }

  getConfigFieldValue(index: number): FormControl {
    const control = this.getConfigFieldGroup(index)?.get('value');
    return control instanceof FormControl ? control : new FormControl('');
  }

  clearConfigFields(): void {
    while (this.configFieldsArray.length !== 0) {
      this.configFieldsArray.removeAt(0);
    }
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
    const endpointControl = this.toolForm.get('endpoint');
    const authTypeControl = this.toolForm.get('authType');
    const descriptionControl = this.toolForm.get('description');
    const nameControl = this.toolForm.get('name');
    const internalToolNameControl = this.toolForm.get('internalToolName');
    
    console.log('onToolTypeChange - toolType:', toolType);
    
    if (toolType === ToolType.API) {
      methodControl?.setValidators([Validators.required]);
      mcpTypeControl?.clearValidators();
      endpointControl?.setValidators([Validators.required]);
      authTypeControl?.setValidators([Validators.required]);
      descriptionControl?.setValidators([Validators.required, Validators.minLength(10), Validators.maxLength(1000)]);
      nameControl?.setValidators([Validators.required, Validators.minLength(3), Validators.maxLength(100)]);
      internalToolNameControl?.clearValidators();
    } else if (toolType === ToolType.MCP) {
      methodControl?.clearValidators();
      mcpTypeControl?.setValidators([Validators.required]);
      endpointControl?.setValidators([Validators.required]);
      authTypeControl?.setValidators([Validators.required]);
      descriptionControl?.setValidators([Validators.required, Validators.minLength(10), Validators.maxLength(1000)]);
      nameControl?.setValidators([Validators.required, Validators.minLength(3), Validators.maxLength(100)]);
      internalToolNameControl?.clearValidators();
    } else if (toolType === ToolType.INTERNAL) {
      // Internal tools don't need method, MCP type, endpoint, or auth type validation
      methodControl?.clearValidators();
      mcpTypeControl?.clearValidators();
      endpointControl?.clearValidators();
      authTypeControl?.clearValidators();
      
      // For InternalTool, make description validation more lenient
      descriptionControl?.setValidators([Validators.required, Validators.minLength(3), Validators.maxLength(1000)]);
      
      // Internal tools use predefined names
      nameControl?.clearValidators();
      internalToolNameControl?.setValidators([Validators.required]);
      
      // Only clear form arrays and set defaults if we're not in edit mode
      // In edit mode, data is already loaded by populateForm()
      if (!this.isEditMode) {
        console.log('onToolTypeChange - Setting defaults for new internal tool');
        
        // Clear parameters and headers for internal tools
        this.clearFormArrays();
        
        this.toolForm.patchValue({
          authType: 'none',
          authRequired: false,
          method: 'GET',
          mcpType: 'SSE',
          endpoint: '',
          internalToolName: 'Search' // Set default internal tool name
        });
        
        // Set the name field to the selected internal tool name
        this.onInternalToolNameChange('Search');
      } else {
        console.log('onToolTypeChange - Edit mode: preserving existing data (auth, config fields, etc.)');
      }
    }
    
    methodControl?.updateValueAndValidity();
    mcpTypeControl?.updateValueAndValidity();
    endpointControl?.updateValueAndValidity();
    authTypeControl?.updateValueAndValidity();
    descriptionControl?.updateValueAndValidity();
    nameControl?.updateValueAndValidity();
    internalToolNameControl?.updateValueAndValidity();
    
    // Debug form validity
    console.log('Form valid:', this.toolForm.valid);
    console.log('Form errors:', this.getFormErrors());
  }

  private getFormErrors(): any {
    const errors: any = {};
    Object.keys(this.toolForm.controls).forEach(key => {
      const control = this.toolForm.get(key);
      if (control && control.errors) {
        errors[key] = control.errors;
      }
    });
    return errors;
  }

  // Gestion des noms d'outils internes prédéfinis
  onInternalToolNameChange(selectedName: string): void {
    const selectedTool = this.internalToolNames.find(tool => tool.value === selectedName);
    if (selectedTool) {
      this.toolForm.patchValue({
        name: selectedTool.value,
        description: selectedTool.description
      });
      
      // Set default configuration fields for Export tool
      if (selectedName === 'Export') {
        this.clearConfigFields();
        this.addConfigField('apiUrl', 'https://localhost');
      }
    }
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
        authPassword: '',
        authClientId: '',
        authClientSecret: '',
        authTokenUrl: '',
        authTenantId: '',
        authResource: '',
        authScopes: ''
      });
    } else if (authType === 'api_key' || authType === 'bearer') {
      this.toolForm.patchValue({
        authUsername: '',
        authPassword: '',
        authClientId: '',
        authClientSecret: '',
        authTokenUrl: '',
        authTenantId: '',
        authResource: '',
        authScopes: ''
      });
    } else if (authType === 'basic') {
      this.toolForm.patchValue({
        authApiKey: '',
        authClientId: '',
        authClientSecret: '',
        authTokenUrl: '',
        authTenantId: '',
        authResource: '',
        authScopes: ''
      });
    } else if (authType === 'oauth2') {
      this.toolForm.patchValue({
        authApiKey: '',
        authUsername: '',
        authPassword: '',
        authTenantId: '',
        authResource: ''
      });
    } else if (authType === 'azure_oauth2') {
      this.toolForm.patchValue({
        authApiKey: '',
        authUsername: '',
        authPassword: '',
        authTokenUrl: '',
        authScopes: ''
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
       let authentication: any = {
         type: 'none',
         required: false
       };

       // Only set authentication for non-internal tools
       if (formValue.type !== ToolType.INTERNAL) {
         authentication = {
           type: formValue.authType,
           required: formValue.authRequired || false
         };

         if (formValue.authType === 'api_key' || formValue.authType === 'bearer') {
           authentication.apiKey = formValue.authApiKey;
         } else if (formValue.authType === 'basic') {
           authentication.username = formValue.authUsername;
           authentication.password = formValue.authPassword;
         } else if (formValue.authType === 'oauth2') {
           authentication.clientId = formValue.authClientId;
           authentication.clientSecret = formValue.authClientSecret;
           authentication.tokenUrl = formValue.authTokenUrl;
           authentication.scopes = formValue.authScopes;
           // If a token is already provided (for testing), include it
           if (formValue.authApiKey) {
             authentication.token = formValue.authApiKey;
           }
         } else if (formValue.authType === 'azure_oauth2') {
           authentication.clientId = formValue.authClientId;
           authentication.clientSecret = formValue.authClientSecret;
           authentication.tenantId = formValue.authTenantId;
           authentication.resource = formValue.authResource;
           // If a token is already provided (for testing), include it
           if (formValue.authApiKey) {
             authentication.token = formValue.authApiKey;
           }
         }
       }

       console.log('onSubmit - authentication object:', authentication);

       // Generate configuration JSON based on tool type
       let configuration: any = {};
       
       if (formValue.type === ToolType.API) {
         configuration = {
           endpoint: formValue.endpoint,
           method: formValue.method
         };
      } else if (formValue.type === ToolType.MCP) {
        configuration = {
          endpoint: formValue.endpoint,
          mcpType: formValue.mcpType
        };
        if (formValue.mcpName) {
          configuration.name = formValue.mcpName;
        }
      } else if (formValue.type === ToolType.INTERNAL) {
        // Internal tools: transform configFields array to configuration object
        configuration = {};
        const configFields = formValue.configFields || this.configFieldsArray.value;
        if (configFields && configFields.length > 0) {
          configFields.forEach((field: any) => {
            if (field.key && field.value) {
              configuration[field.key] = field.value;
            }
          });
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
        parameters: formValue.type === ToolType.INTERNAL ? JSON.stringify([]) : JSON.stringify(formValue.parameters),
        headers: formValue.type === ToolType.INTERNAL ? JSON.stringify([]) : JSON.stringify(formValue.headers)
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

  showOAuth2Fields(): boolean {
    const authType = this.toolForm.get('authType')?.value;
    return authType === 'oauth2';
  }

  showAzureOAuth2Fields(): boolean {
    const authType = this.toolForm.get('authType')?.value;
    return authType === 'azure_oauth2';
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

  showInternalToolFields(): boolean {
    const toolType = this.toolForm.get('type')?.value;
    return toolType === ToolType.INTERNAL;
  }

  showApiFields(): boolean {
    const toolType = this.toolForm.get('type')?.value;
    return toolType === ToolType.API;
  }

  showMcpFields(): boolean {
    const toolType = this.toolForm.get('type')?.value;
    return toolType === ToolType.MCP;
  }

  // MCP Discovery methods
  onEndpointChange(endpoint: string): void {
    const toolType = this.toolForm.get('type')?.value;
    
    // Skip auto-discovery if we're in the middle of manual tool selection
    if (this.isManualToolSelection) {
      console.log('Skipping auto-discovery due to manual tool selection');
      return;
    }
    
    // Only auto-discover for MCP tools when endpoint is provided
    if (toolType === ToolType.MCP && endpoint && endpoint.trim()) {
      this.discoverMcpTools(endpoint.trim());
    } else {
      this.clearMcpDiscovery();
    }
  }

  discoverMcpTools(endpoint: string): void {
    this.isDiscoveringMcpTools = true;
    this.mcpDiscoveryError = '';
    this.discoveredMcpTools = [];
    this.selectedMcpTool = null;

    this.subscription.add(
      this.toolService.discoverMcpToolsAsEntities(endpoint).subscribe({
        next: (tools) => {
          console.log('discoverMcpTools - received tools:', tools);
          
          // Convert Tool entities back to McpToolDiscovery for display
          this.discoveredMcpTools = tools.map(tool => {
            console.log('Processing tool:', tool);
            console.log('tool.parameters:', tool.parameters);
            const inputSchema = this.parseToolParameters(tool.parameters);
            console.log('Parsed inputSchema:', inputSchema);
            
            return {
              name: tool.name,
              description: tool.description,
              inputSchema: inputSchema
            };
          });
          
          console.log('Final discoveredMcpTools:', this.discoveredMcpTools);
          this.isDiscoveringMcpTools = false;
          this.notificationService.success('MCP Discovery', `Discovered ${this.discoveredMcpTools.length} tools from MCP server`);
        },
        error: (error) => {
          this.mcpDiscoveryError = error.message || 'Failed to discover MCP tools';
          this.isDiscoveringMcpTools = false;
          this.notificationService.error('MCP Discovery Failed', 'Failed to discover MCP tools');
        }
      })
    );
  }

  onMcpToolSelected(toolName: string): void {
    console.log('onMcpToolSelected called with toolName:', toolName);
    
    if (!toolName) {
      this.selectedMcpTool = null;
      this.clearToolParameters();
      return;
    }

    // Set flag to prevent auto-discovery during manual selection
    this.isManualToolSelection = true;

    this.selectedMcpTool = this.discoveredMcpTools.find(tool => tool.name === toolName) || null;
    console.log('selectedMcpTool found:', this.selectedMcpTool);
    
    if (this.selectedMcpTool) {
      console.log('selectedMcpTool.inputSchema:', this.selectedMcpTool.inputSchema);
      
      // Truncate description to fit validation rules (max 1000 characters)
      const truncatedDescription = this.selectedMcpTool.description.length > 1000 
        ? this.selectedMcpTool.description.substring(0, 997) + '...'
        : this.selectedMcpTool.description;

      // Auto-populate the form with the selected MCP tool
      this.toolForm.patchValue({
        name: this.selectedMcpTool.name,
        description: truncatedDescription,
        type: ToolType.MCP,
        mcpType: 'SSE',
        mcpName: this.selectedMcpTool.name // Set the MCP name
      });

      // Trigger validation update for tool type change
      this.onToolTypeChange();

      // Populate parameters
      console.log('About to call populateToolParameters');
      this.populateToolParameters(this.selectedMcpTool);
      
      this.notificationService.success('Tool Selected', `Selected MCP tool: ${this.selectedMcpTool.name}`);
    } else {
      console.log('No MCP tool found with name:', toolName);
    }

    // Reset flag after a short delay to allow form updates to complete
    setTimeout(() => {
      this.isManualToolSelection = false;
      console.log('Manual tool selection completed, auto-discovery re-enabled');
    }, 100);
  }

  clearMcpDiscovery(): void {
    this.discoveredMcpTools = [];
    this.mcpDiscoveryError = '';
    this.isDiscoveringMcpTools = false;
    this.selectedMcpTool = null;
  }

  private clearToolParameters(): void {
    const parametersArray = this.toolForm.get('parameters') as FormArray;
    while (parametersArray.length !== 0) {
      parametersArray.removeAt(0);
    }
  }

  private populateToolParameters(tool: McpToolDiscovery): void {
    console.log('populateToolParameters called with tool:', tool);
    console.log('tool.inputSchema:', tool.inputSchema);
    console.log('tool.inputSchema?.properties:', tool.inputSchema?.properties);
    
    this.clearToolParameters();
    
    if (tool.inputSchema?.properties) {
      console.log('Found properties, creating parameters...');
      const parametersArray = this.toolForm.get('parameters') as FormArray;
      console.log('parametersArray before:', parametersArray.length);
      
      Object.entries(tool.inputSchema.properties).forEach(([paramName, paramDef]) => {
        console.log('Processing parameter:', paramName, paramDef);
        const isRequired = tool.inputSchema?.required?.includes(paramName) || false;
        
        const parameterGroup = this.fb.group({
          name: [paramName, Validators.required],
          type: [paramDef.type || 'string', Validators.required],
          required: [isRequired],
          description: [paramDef.description || ''],
          default: [paramDef.default || ''] // Fixed: changed from 'defaultValue' to 'default'
        });
        
        parametersArray.push(parameterGroup);
        console.log('Added parameter group:', parameterGroup.value);
      });
      
      console.log('parametersArray after:', parametersArray.length);
      console.log('parametersArray controls:', parametersArray.controls);
    } else {
      console.log('No properties found in inputSchema');
    }
  }

  private parseToolParameters(parameters?: any): any {
    console.log('parseToolParameters called with parameters:', parameters);
    
    if (!parameters) {
      console.log('No parameters provided, returning undefined');
      return undefined;
    }
    
    try {
      const params = typeof parameters === 'string' ? JSON.parse(parameters) : parameters;
      console.log('Parsed params:', params);
      console.log('Is array?', Array.isArray(params));
      
      if (Array.isArray(params)) {
        const properties: { [key: string]: any } = {};
        const required: string[] = [];
        
        params.forEach((param: any) => {
          console.log('Processing param:', param);
          if (param.name) {
            properties[param.name] = {
              type: param.type || 'string',
              description: param.description,
              default: param.default || param.defaultValue // Handle both field names for backward compatibility
            };
            if (param.required) {
              required.push(param.name);
            }
          }
        });
        
        const result = {
          type: 'object',
          properties,
          required
        };
        console.log('parseToolParameters result:', result);
        return result;
      }
    } catch (error) {
      console.warn('Failed to parse tool parameters:', error);
    }
    
    console.log('parseToolParameters returning undefined');
    return undefined;
  }

  getObjectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

}
