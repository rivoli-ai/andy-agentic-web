import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  FormArray,
  AbstractControl,
  FormControl,
  ValidatorFn,
  ValidationErrors
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Tool, ToolType, McpToolDiscovery } from '../../../models/tool.model';
import { ToolService } from '../../../core/services/tool.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  standalone: false,
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

  // Predefined internal tool names
  internalToolNames = [
    { value: 'Search', description: 'Search functionality for finding information' },
    { value: 'Export', description: 'Export responses to document formats (Excel, PDF, Word)' }
  ];
  
  // MCP Discovery properties
  discoveredMcpTools: McpToolDiscovery[] = [];
  isDiscoveringMcpTools = false;
  mcpDiscoveryError = '';
  /** True while posting sequential creates for MCP bulk import */
  isSavingBulkMcp = false;

  /** Lowercased catalog names already on the server (for MCP bulk displayName) */
  existingCatalogNames = new Set<string>();

  /** Catalog tool name: letters, digits, underscore only */
  readonly CATALOG_NAME_PATTERN = /^[a-zA-Z0-9_]+$/;

  /** Matches API `ToolDto` / entity `Description` [MaxLength(500)] */
  readonly toolDescriptionMaxLength = 500;

  /** Matches API `ToolDto.Category` [MaxLength(50)] */
  readonly toolCategoryMaxLength = 50;
  
  // Loading states
  isLoadingTool = false;
  
  private subscription = new Subscription();
  /** Subscriptions for MCP bulk row `enabled` toggles (replaced on each discovery) */
  private mcpBulkRowSubs = new Subscription();

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
      this.refreshExistingCatalogNames();
    }

    this.subscription.add(
      this.toolForm.get('method')!.valueChanges.subscribe(() => {
        this.updateApiRequestBodyValidators();
      })
    );
    this.updateApiRequestBodyValidators();
  }

  /** Load tool names from API so MCP catalog names can avoid duplicates */
  private refreshExistingCatalogNames(): void {
    this.subscription.add(
      this.toolService.getTools().subscribe({
        next: tools => {
          this.existingCatalogNames = new Set(
            tools.map(t => (t.name || '').trim().toLowerCase()).filter(n => n.length > 0)
          );
          this.revalidateAllMcpBulkDisplayNames();
        },
        error: () => {
          /* non-blocking */
        }
      })
    );
  }

  private revalidateAllMcpBulkDisplayNames(): void {
    this.mcpBulkToolsArray.controls.forEach(g => {
      g.get('displayName')?.updateValueAndValidity({ emitEvent: false });
    });
  }

  /** Normalize MCP server tool name to a valid catalog name (alphanumeric + underscore) */
  private sanitizeCatalogName(raw: string): string {
    const s = (raw || '')
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    const base = s.length > 0 ? s : 'tool';
    return base.length > 100 ? base.substring(0, 100) : base;
  }

  /** Suggest a catalog name not present on server or already used in this import batch */
  private makeSuggestedCatalogName(serverToolName: string, usedInBatch: Set<string>): string {
    let base = this.sanitizeCatalogName(serverToolName);
    if (base.length < 3) {
      base = 'tool';
    }
    let candidate = base;
    let n = 2;
    const taken = (name: string) => {
      const k = name.toLowerCase();
      return this.existingCatalogNames.has(k) || usedInBatch.has(k);
    };
    let guard = 0;
    while (taken(candidate) && guard++ < 500) {
      const suffix = `_${n++}`;
      candidate = (base + suffix).substring(0, 100);
    }
    usedInBatch.add(candidate.toLowerCase());
    return candidate;
  }

  private catalogNameTakenValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const v = (control.value || '').trim().toLowerCase();
      if (!v) {
        return null;
      }
      return this.existingCatalogNames.has(v) ? { nameTaken: true } : null;
    };
  }

  private mcpBulkDuplicateDisplayNameValidator(rowIndex: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const v = (control.value || '').trim().toLowerCase();
      if (!v) {
        return null;
      }
      for (let i = 0; i < this.mcpBulkToolsArray.length; i++) {
        if (i === rowIndex) {
          continue;
        }
        const other = this.mcpBulkToolsArray.at(i) as FormGroup;
        if (other.get('enabled')?.value === false) {
          continue;
        }
        const otherName = (other.get('displayName')?.value || '').trim().toLowerCase();
        if (otherName === v) {
          return { duplicateInBatch: true };
        }
      }
      return null;
    };
  }

  private getMcpCatalogDisplayNameValidators(rowIndex: number): ValidatorFn[] {
    return [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(100),
      Validators.pattern(this.CATALOG_NAME_PATTERN),
      this.catalogNameTakenValidator(),
      this.mcpBulkDuplicateDisplayNameValidator(rowIndex)
    ];
  }

  ngOnDestroy(): void {
    this.mcpBulkRowSubs.unsubscribe();
    this.subscription.unsubscribe();
  }

  /** Required, trimmed; max length matches API (non-empty after trim). */
  private categoryFormValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const s = (control.value ?? '').toString().trim();
      if (!s) {
        return { required: true };
      }
      if (s.length > this.toolCategoryMaxLength) {
        return {
          maxlength: { requiredLength: this.toolCategoryMaxLength, actualLength: s.length }
        };
      }
      return null;
    };
  }

  private trimmedCategory(value: unknown): string {
    return (value ?? '').toString().trim();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      internalToolName: [''], // For predefined internal tool names
      description: [
        '',
        [Validators.required, Validators.minLength(3), Validators.maxLength(this.toolDescriptionMaxLength)]
      ],
      type: [ToolType.INTERNAL, Validators.required],
      category: ['', this.categoryFormValidator()],
      isActive: [true],
      endpoint: [''], // Remove required validator - will be set based on tool type
      method: ['GET'],
      /** JSON body template for API tools (POST/PUT/PATCH/DELETE); merged with runtime parameters by key. */
      apiRequestBody: [''],
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
      configFields: this.fb.array([]), // Configuration fields for internal tools
      mcpBulkTools: this.fb.array([]) // Create-mode MCP: one row per discovered server tool
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
    
    // Parse configuration to extract endpoint, method, and mcpName
    let endpoint = '';
    let method = 'GET';
    let mcpName = '';
    let apiRequestBody = '';
    
    if (tool.configuration) {
      try {
        const config = JSON.parse(tool.configuration);
        endpoint = config.endpoint || '';
        method = config.method || 'GET';
        mcpName = config.name || '';
        const rawBody = config.bodyTemplate ?? config.body;
        if (rawBody != null && typeof rawBody === 'string') {
          apiRequestBody = rawBody;
        } else if (rawBody != null && typeof rawBody === 'object') {
          apiRequestBody = JSON.stringify(rawBody, null, 2);
        }
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
      apiRequestBody,
      mcpName: mcpName,
      internalToolName: tool.type === ToolType.INTERNAL ? tool.name : ''
    });

    this.updateApiRequestBodyValidators();
    
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
    while (this.mcpBulkToolsArray.length !== 0) {
      this.mcpBulkToolsArray.removeAt(0);
    }
  }

  // Getters pour les FormArrays
  get mcpBulkToolsArray(): FormArray {
    return this.toolForm.get('mcpBulkTools') as FormArray;
  }

  /** MCP create: table of all discovered tools with per-tool params; shared endpoint/auth/headers */
  isMcpBulkCreateMode(): boolean {
    return (
      !this.isEditMode &&
      this.toolForm.get('type')?.value === ToolType.MCP &&
      this.mcpBulkToolsArray.length > 0
    );
  }

  get mcpBulkEnabledCreateCount(): number {
    if (!this.isMcpBulkCreateMode()) {
      return 0;
    }
    return this.mcpBulkToolsArray.controls.filter(c => c.get('enabled')?.value !== false).length;
  }

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

  getMcpBulkToolGroup(toolIndex: number): FormGroup {
    return this.mcpBulkToolsArray.at(toolIndex) as FormGroup;
  }

  getMcpBulkParametersArray(toolIndex: number): FormArray {
    return this.getMcpBulkToolGroup(toolIndex).get('parameters') as FormArray;
  }

  getMcpBulkParameterGroup(toolIndex: number, paramIndex: number): FormGroup {
    return this.getMcpBulkParametersArray(toolIndex).at(paramIndex) as FormGroup;
  }

  getMcpBulkParameterName(toolIndex: number, paramIndex: number): FormControl {
    const c = this.getMcpBulkParameterGroup(toolIndex, paramIndex)?.get('name');
    return c instanceof FormControl ? c : new FormControl('');
  }

  getMcpBulkParameterType(toolIndex: number, paramIndex: number): FormControl {
    const c = this.getMcpBulkParameterGroup(toolIndex, paramIndex)?.get('type');
    return c instanceof FormControl ? c : new FormControl('');
  }

  getMcpBulkParameterDefault(toolIndex: number, paramIndex: number): FormControl {
    const c = this.getMcpBulkParameterGroup(toolIndex, paramIndex)?.get('default');
    return c instanceof FormControl ? c : new FormControl('');
  }

  getMcpBulkParameterDescription(toolIndex: number, paramIndex: number): FormControl {
    const c = this.getMcpBulkParameterGroup(toolIndex, paramIndex)?.get('description');
    return c instanceof FormControl ? c : new FormControl('');
  }

  getMcpBulkParameterRequired(toolIndex: number, paramIndex: number): FormControl {
    const c = this.getMcpBulkParameterGroup(toolIndex, paramIndex)?.get('required');
    return c instanceof FormControl ? c : new FormControl(false);
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
    const endpointControl = this.toolForm.get('endpoint');
    const authTypeControl = this.toolForm.get('authType');
    const descriptionControl = this.toolForm.get('description');
    const nameControl = this.toolForm.get('name');
    const internalToolNameControl = this.toolForm.get('internalToolName');
    
    console.log('onToolTypeChange - toolType:', toolType);

    // New tools start as Internal with a preset name; switching to API/MCP must not keep that default.
    if (!this.isEditMode && (toolType === ToolType.API || toolType === ToolType.MCP)) {
      this.toolForm.patchValue({ name: '', internalToolName: '' }, { emitEvent: false });
    }
    
    if (toolType === ToolType.API) {
      methodControl?.setValidators([Validators.required]);
      endpointControl?.setValidators([Validators.required]);
      authTypeControl?.setValidators([Validators.required]);
      descriptionControl?.setValidators([
        Validators.required,
        Validators.minLength(10),
        Validators.maxLength(this.toolDescriptionMaxLength)
      ]);
      nameControl?.setValidators([Validators.required, Validators.minLength(3), Validators.maxLength(100)]);
      internalToolNameControl?.clearValidators();
    } else if (toolType === ToolType.MCP) {
      methodControl?.clearValidators();
      endpointControl?.setValidators([Validators.required]);
      authTypeControl?.setValidators([Validators.required]);
      if (!this.isEditMode) {
        // Names/descriptions come from each discovered tool row (mcpBulkTools)
        nameControl?.clearValidators();
        descriptionControl?.clearValidators();
      } else {
        descriptionControl?.setValidators([
          Validators.required,
          Validators.minLength(10),
          Validators.maxLength(this.toolDescriptionMaxLength)
        ]);
        nameControl?.setValidators([Validators.required, Validators.minLength(3), Validators.maxLength(100)]);
      }
      internalToolNameControl?.clearValidators();
    } else if (toolType === ToolType.INTERNAL) {
      // Internal tools don't need method, endpoint, or auth type validation
      methodControl?.clearValidators();
      endpointControl?.clearValidators();
      authTypeControl?.clearValidators();
      
      // For InternalTool, make description validation more lenient
      descriptionControl?.setValidators([
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(this.toolDescriptionMaxLength)
      ]);
      
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
    endpointControl?.updateValueAndValidity();
    authTypeControl?.updateValueAndValidity();
    descriptionControl?.updateValueAndValidity();
    nameControl?.updateValueAndValidity();
    internalToolNameControl?.updateValueAndValidity();

    this.updateApiRequestBodyValidators();

    if (toolType !== ToolType.MCP) {
      this.clearMcpDiscovery();
    }
    
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
      // Do not auto-fill category from internal preset name (e.g. "Search") — user sets category explicitly.
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

  private buildAuthenticationObject(formValue: any): Record<string, unknown> {
    let authentication: Record<string, unknown> = {
      type: 'none',
      required: false
    };

    if (formValue.type !== ToolType.INTERNAL) {
      authentication = {
        type: formValue.authType,
        required: formValue.authRequired || false
      };

      if (formValue.authType === 'api_key' || formValue.authType === 'bearer') {
        authentication['apiKey'] = formValue.authApiKey;
      } else if (formValue.authType === 'basic') {
        authentication['username'] = formValue.authUsername;
        authentication['password'] = formValue.authPassword;
      } else if (formValue.authType === 'oauth2') {
        authentication['clientId'] = formValue.authClientId;
        authentication['clientSecret'] = formValue.authClientSecret;
        authentication['tokenUrl'] = formValue.authTokenUrl;
        authentication['scopes'] = formValue.authScopes;
        if (formValue.authApiKey) {
          authentication['token'] = formValue.authApiKey;
        }
      } else if (formValue.authType === 'azure_oauth2') {
        authentication['clientId'] = formValue.authClientId;
        authentication['clientSecret'] = formValue.authClientSecret;
        authentication['tenantId'] = formValue.authTenantId;
        authentication['resource'] = formValue.authResource;
        if (formValue.authApiKey) {
          authentication['token'] = formValue.authApiKey;
        }
      }
    }

    return authentication;
  }

  /** Readable message from HttpErrorResponse or other API errors (preserve backend detail) */
  private formatApiError(err: unknown): string {
    if (err == null) {
      return '';
    }
    const e = err as Record<string, unknown>;
    if (typeof err === 'string') {
      return err;
    }
    const body = e['error'];
    const flattenProblemDetailsErrors = (b: Record<string, unknown>): string | null => {
      const errors = b['errors'];
      if (errors == null || typeof errors !== 'object') {
        return null;
      }
      const parts: string[] = [];
      for (const [field, val] of Object.entries(errors as Record<string, unknown>)) {
        if (Array.isArray(val)) {
          for (const x of val) {
            if (typeof x === 'string' && x.trim()) {
              parts.push(`${field}: ${x.trim()}`);
            }
          }
        } else if (typeof val === 'string' && val.trim()) {
          parts.push(`${field}: ${val.trim()}`);
        }
      }
      return parts.length ? parts.join(' · ') : null;
    };
    if (body != null && typeof body === 'object') {
      const b = body as Record<string, unknown>;
      const fromValidation = flattenProblemDetailsErrors(b);
      if (fromValidation) {
        return fromValidation;
      }
      if (typeof b['message'] === 'string' && (b['message'] as string).trim()) {
        return b['message'] as string;
      }
      if (typeof b['error'] === 'string' && (b['error'] as string).trim()) {
        return b['error'] as string;
      }
      if (typeof b['title'] === 'string' && (b['title'] as string).trim()) {
        return b['title'] as string;
      }
    }
    if (typeof body === 'string' && body.trim()) {
      return body;
    }
    const status = e['status'];
    if (status === 403) {
      return 'Accès refusé : la création d’outils nécessite le rôle d’écriture (Write).';
    }
    if (status === 401) {
      return 'Session expirée ou non authentifié. Reconnectez-vous.';
    }
    const msg = e['message'];
    if (typeof msg === 'string' && msg.trim() && !msg.startsWith('Http failure response')) {
      return msg;
    }
    return '';
  }

  private createMcpToolsBulk(): void {
    const formValue = this.toolForm.getRawValue();
    const drafts = (formValue.mcpBulkTools || []).filter((d: { enabled?: boolean }) => d.enabled !== false);
    if (drafts.length === 0) {
      this.notificationService.error('Validation', 'Enable at least one MCP tool to create.');
      return;
    }

    const seenInRequest = new Set<string>();
    for (const d of drafts) {
      const k = ((d as { displayName?: string }).displayName || '').trim().toLowerCase();
      if (!k) {
        continue;
      }
      if (seenInRequest.has(k)) {
        this.notificationService.error(
          'Validation',
          `Duplicate catalog name in this import: « ${(d as { displayName?: string }).displayName} ». Each enabled tool needs a unique name.`
        );
        return;
      }
      seenInRequest.add(k);
    }

    const authentication = this.buildAuthenticationObject(formValue);
    const headersJson = JSON.stringify(formValue.headers || []);
    const endpoint = formValue.endpoint as string;

    this.isSavingBulkMcp = true;
    let created = 0;

    const runAt = (index: number) => {
      if (index >= drafts.length) {
        this.isSavingBulkMcp = false;
        this.notificationService.success('Succès', `${created} outil(s) MCP créé(s)`);
        this.router.navigate(['/tools']);
        return;
      }

      const d = drafts[index] as {
        mcpToolName: string;
        displayName: string;
        description: string;
        parameters: unknown[];
      };

      const configuration = JSON.stringify({
        endpoint,
        mcpType: 'auto',
        name: d.mcpToolName
      });

      const toolData = {
        name: d.displayName,
        description: d.description,
        type: ToolType.MCP,
        category: this.trimmedCategory(formValue.category),
        isActive: formValue.isActive,
        configuration,
        authentication: JSON.stringify(authentication),
        parameters: JSON.stringify(d.parameters || []),
        headers: headersJson
      };

      this.subscription.add(
        this.toolService.createTool(toolData).subscribe({
          next: (createdTool: Tool) => {
            created++;
            const added = (createdTool?.name || d.displayName || '').trim().toLowerCase();
            if (added) {
              this.existingCatalogNames.add(added);
            }
            runAt(index + 1);
          },
          error: (error: unknown) => {
            this.isSavingBulkMcp = false;
            this.refreshExistingCatalogNames();
            const serverMsg = this.formatApiError(error);
            const progress =
              created > 0 ? `${created} outil(s) déjà créé(s) avant l’échec. ` : '';
            const duplicateHint =
              created > 0
                ? 'Si certains noms existent déjà, décochez les lignes concernées ou renommez-les. '
                : '';
            const fallback =
              !serverMsg
                ? 'Cause inconnue : ouvrez la console réseau (F12) pour le corps de la réponse.'
                : '';
            this.notificationService.error(
              'Échec de création MCP',
              `« ${d.displayName} » n’a pas été créé. ${progress}${duplicateHint}${serverMsg}${fallback}`
            );
            console.error('Bulk MCP create error:', error);
          }
        })
      );
    };

    runAt(0);
  }

  // Soumission du formulaire
  onSubmit(): void {
    const formValue = this.toolForm.getRawValue();

    if (formValue.type === ToolType.MCP && !this.isEditMode) {
      if (this.mcpBulkToolsArray.length === 0) {
        this.notificationService.error(
          'MCP',
          'Découvrez d’abord les outils à partir de l’URL du serveur MCP.'
        );
        return;
      }
      if (!this.toolForm.valid) {
        this.markFormGroupTouched();
        this.markMcpBulkTouched();
        this.notificationService.error('Erreur de validation', 'Veuillez corriger les erreurs dans le formulaire');
        return;
      }
      this.createMcpToolsBulk();
      return;
    }

    if (this.toolForm.valid) {
       console.log('onSubmit - formValue:', formValue);
       const authentication = this.buildAuthenticationObject(formValue);
       console.log('onSubmit - authentication object:', authentication);

       // Generate configuration JSON based on tool type
       let configuration: any = {};
       
       if (formValue.type === ToolType.API) {
         configuration = {
           endpoint: formValue.endpoint,
           method: formValue.method
         };
         const bodyRaw = (formValue.apiRequestBody ?? '').toString().trim();
         if (bodyRaw.length > 0) {
           configuration.bodyTemplate = bodyRaw;
         }
      } else if (formValue.type === ToolType.MCP) {
        configuration = {
          endpoint: formValue.endpoint,
          mcpType: 'auto'
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
         category: this.trimmedCategory(formValue.category),
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
          const detail = this.formatApiError(error);
          this.notificationService.error(
            'Erreur',
            detail ? `Impossible de créer l’outil. ${detail}` : 'Impossible de créer l’outil.'
          );
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
          const detail = this.formatApiError(error);
          this.notificationService.error(
            'Erreur',
            detail ? `Impossible de mettre à jour l’outil. ${detail}` : 'Impossible de mettre à jour l’outil.'
          );
          console.error('Error updating tool:', error);
        }
      })
    );
  }

  private markFormGroupTouched(): void {
    this.toolForm.markAllAsTouched();
  }

  private markMcpBulkTouched(): void {
    this.mcpBulkToolsArray.controls.forEach(g => {
      (g as FormGroup).markAllAsTouched();
    });
  }

  // Navigation
  onCancel(): void {
    this.router.navigate(['/tools']);
  }

  // Validation helpers (root fields, nested controls, and FormArray children)
  isControlInvalid(control: AbstractControl | null | undefined): boolean {
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  getControlErrorMessage(control: AbstractControl | null | undefined): string {
    const errors = control?.errors;
    if (!errors) {
      return '';
    }
    if (errors['required']) {
      return 'Ce champ est requis';
    }
    if (errors['minlength']) {
      return `Minimum ${(errors['minlength'] as { requiredLength: number }).requiredLength} caractères`;
    }
    if (errors['maxlength']) {
      return `Maximum ${(errors['maxlength'] as { requiredLength: number }).requiredLength} caractères`;
    }
    if (errors['pattern']) {
      return 'Format invalide';
    }
    if (errors['invalidJson']) {
      return 'JSON invalide : vérifiez la syntaxe du corps de la requête.';
    }
    if (errors['nameTaken']) {
      return 'Ce nom est déjà utilisé';
    }
    return 'Valeur invalide';
  }

  isFieldInvalid(fieldName: string): boolean {
    return this.isControlInvalid(this.toolForm.get(fieldName));
  }

  getFieldError(fieldName: string): string {
    return this.getControlErrorMessage(this.toolForm.get(fieldName));
  }

  /** POST/PUT/PATCH/DELETE: optional JSON body template stored in configuration.bodyTemplate */
  showApiRequestBodyField(): boolean {
    if (this.toolForm.get('type')?.value !== ToolType.API) {
      return false;
    }
    const m = (this.toolForm.get('method')?.value || 'GET').toString().toUpperCase();
    return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(m);
  }

  private optionalValidJsonValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const v = (control.value ?? '').toString().trim();
      if (!v) {
        return null;
      }
      try {
        JSON.parse(v);
        return null;
      } catch {
        return { invalidJson: true };
      }
    };
  }

  private updateApiRequestBodyValidators(): void {
    const ctrl = this.toolForm.get('apiRequestBody');
    if (!ctrl) {
      return;
    }
    if (this.showApiRequestBodyField()) {
      ctrl.setValidators([this.optionalValidJsonValidator()]);
    } else {
      ctrl.clearValidators();
    }
    ctrl.updateValueAndValidity({ emitEvent: false });
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
    this.mcpBulkToolsArray.clear();

    const runDiscover = () => {
      this.subscription.add(
        this.toolService.discoverMcpToolsAsEntities(endpoint).subscribe({
          next: (tools) => {
            console.log('discoverMcpTools - received tools:', tools);

            this.discoveredMcpTools = tools.map(tool => {
              const inputSchema = this.parseToolParameters(tool.parameters);
              return {
                name: tool.name,
                description: tool.description,
                inputSchema: inputSchema
              };
            });

            this.isDiscoveringMcpTools = false;
            if (!this.isEditMode) {
              this.rebuildMcpBulkDraftsFromDiscovery();
            }
            this.notificationService.success(
              'MCP Discovery',
              `Discovered ${this.discoveredMcpTools.length} tools from MCP server`
            );
          },
          error: (error) => {
            this.mcpDiscoveryError = error.message || 'Failed to discover MCP tools';
            this.isDiscoveringMcpTools = false;
            this.notificationService.error('MCP Discovery Failed', 'Failed to discover MCP tools');
          }
        })
      );
    };

    this.subscription.add(
      this.toolService.getTools().subscribe({
        next: tools => {
          this.existingCatalogNames = new Set(
            tools.map(t => (t.name || '').trim().toLowerCase()).filter(n => n.length > 0)
          );
          runDiscover();
        },
        error: () => runDiscover()
      })
    );
  }

  private rebuildMcpBulkDraftsFromDiscovery(): void {
    this.mcpBulkRowSubs.unsubscribe();
    this.mcpBulkRowSubs = new Subscription();
    while (this.mcpBulkToolsArray.length !== 0) {
      this.mcpBulkToolsArray.removeAt(0);
    }
    const usedInBatch = new Set<string>();
    for (const t of this.discoveredMcpTools) {
      const paramsArray = this.fb.array<AbstractControl>([]);
      if (t.inputSchema?.properties) {
        Object.entries(t.inputSchema.properties).forEach(([paramName, paramDef]) => {
          const def = paramDef as { type?: string; description?: string; default?: unknown };
          const isRequired = t.inputSchema?.required?.includes(paramName) || false;
          paramsArray.push(
            this.fb.group({
              name: [paramName, Validators.required],
              type: [def.type || 'string', Validators.required],
              required: [isRequired],
              description: [def.description || ''],
              default: [def.default != null ? String(def.default) : '']
            })
          );
        });
      }
      const rawDesc = (t.description && t.description.trim()) ? t.description : t.name;
      const maxLen = this.toolDescriptionMaxLength;
      const desc = rawDesc.length > maxLen ? rawDesc.substring(0, maxLen) : rawDesc;
      const catalogName = this.makeSuggestedCatalogName(t.name, usedInBatch);
      const row = this.fb.group({
        enabled: [true],
        mcpToolName: [t.name, Validators.required],
        displayName: [catalogName],
        description: [
          desc,
          [Validators.required, Validators.minLength(3), Validators.maxLength(this.toolDescriptionMaxLength)]
        ],
        parameters: paramsArray
      });
      this.mcpBulkToolsArray.push(row);
      this.wireMcpBulkRowEnabledState(row, this.mcpBulkToolsArray.length - 1);
    }
    this.clearToolParameters();
    this.toolForm.patchValue({ name: '', description: '' });
    this.cdr.detectChanges();
  }

  /** Unchecked rows skip creation and should not block form validity */
  private wireMcpBulkRowEnabledState(group: FormGroup, rowIndex: number): void {
    const displayNameCtrl = group.get('displayName');
    const apply = (en: boolean) => {
      const setRow = (active: boolean) => {
        const mcpNameCtrl = group.get('mcpToolName');
        const descCtrl = group.get('description');
        if (active) {
          mcpNameCtrl?.setValidators([Validators.required]);
          displayNameCtrl?.setValidators(this.getMcpCatalogDisplayNameValidators(rowIndex));
          descCtrl?.setValidators([
            Validators.required,
            Validators.minLength(3),
            Validators.maxLength(this.toolDescriptionMaxLength)
          ]);
        } else {
          mcpNameCtrl?.clearValidators();
          displayNameCtrl?.clearValidators();
          descCtrl?.clearValidators();
        }
        mcpNameCtrl?.updateValueAndValidity({ emitEvent: false });
        displayNameCtrl?.updateValueAndValidity({ emitEvent: false });
        descCtrl?.updateValueAndValidity({ emitEvent: false });

        const params = group.get('parameters') as FormArray;
        params.controls.forEach(pc => {
          const g = pc as FormGroup;
          const nameC = g.get('name');
          const typeC = g.get('type');
          if (active) {
            nameC?.setValidators([Validators.required]);
            typeC?.setValidators([Validators.required]);
          } else {
            nameC?.clearValidators();
            typeC?.clearValidators();
          }
          nameC?.updateValueAndValidity({ emitEvent: false });
          typeC?.updateValueAndValidity({ emitEvent: false });
        });
      };
      setRow(!!en);
    };
    apply(group.get('enabled')?.value !== false);
    this.mcpBulkRowSubs.add(group.get('enabled')!.valueChanges.subscribe(apply));

    if (displayNameCtrl) {
      this.mcpBulkRowSubs.add(
        displayNameCtrl.valueChanges.subscribe(() => {
          this.mcpBulkToolsArray.controls.forEach((g, i) => {
            if (i !== rowIndex) {
              g.get('displayName')?.updateValueAndValidity({ emitEvent: false });
            }
          });
        })
      );
    }
  }

  clearMcpDiscovery(): void {
    this.discoveredMcpTools = [];
    this.mcpDiscoveryError = '';
    this.isDiscoveringMcpTools = false;
    while (this.mcpBulkToolsArray.length !== 0) {
      this.mcpBulkToolsArray.removeAt(0);
    }
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
