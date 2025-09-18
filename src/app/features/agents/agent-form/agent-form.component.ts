import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, AbstractControl, FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, of } from 'rxjs';
import { Agent, AgentType, Prompt, PromptVariable, AgentTool, LLMConfig, AgentTag, TagDto, LLMProviderType, AgentDocument } from '../../../models/agent.model';
import { AgentService } from '../../../core/services/agent.service';
import { LLMService } from '../../../core/services/llm.service';
import { LLMProvider } from '../../../models/agent.model';
import { NotificationService } from '../../../core/services/notification.service';
import { Tool, ToolType } from '../../../models/tool.model';
import { Document, DocumentType, CreateDocumentDto } from '../../../models/document.model';
import { DocumentService } from '../../../core/services/document.service';
import { ToolService } from '../../../core/services/tool.service';
import { v4 as uuidv4 } from 'uuid';
import { TagService } from '../../../core/services/tag.service';
import { SignalRService, DocumentRagStatusUpdate } from '../../../core/services/signalr.service';

@Component({
  selector: 'app-agent-form',
  templateUrl: './agent-form.component.html',
  styleUrls: ['./agent-form.component.css']
})
export class AgentFormComponent implements OnInit, OnDestroy {
  agentForm: FormGroup;
  isEditMode = false;
  agentId: string | null = null;
  agentTypes = Object.values(AgentType);
  availableTags: TagDto[] = [];
  llmProviders: LLMProvider[] = [];
  selectedProvider: LLMProvider | null = null;
  isCustomModel = false;
  availableTools: Tool[] = [];
  toolTypes = Object.values(ToolType);
  availableLLMConfigs: LLMConfig[] = [];
  
  // Document properties
  agentDocuments: AgentDocument[] = [];
  availableDocuments: Document[] = [];
  documentTypes = Object.values(DocumentType);
  selectedDocumentFile: File | null = null;
  isUploadingDocument = false;
  
  // MCP Discovery properties
  showMcpDiscovery = false;
  mcpServerUrl = '';
  isDiscoveringMcpTools = false;
  mcpDiscoveryError = '';
  
  private subscription = new Subscription();

  constructor(
    private fb: FormBuilder,
    private agentService: AgentService,
    private llmService: LLMService,
    private toolService: ToolService,
    private documentService: DocumentService,
    private notificationService: NotificationService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private tagService: TagService,
    private signalRService: SignalRService
  ) {
    this.agentForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadLLMProviders();
    this.loadAvailableTools();
    this.loadAvailableLLMConfigs();
    this.loadAvailableTags();
    this.agentId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.agentId;
    
    // Initialize SignalR connection
    this.initializeSignalR();
    
    if (this.isEditMode) {
      this.loadAgentForEdit();
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    // Clean up SignalR connection
    if (this.agentId) {
      this.signalRService.leaveAgentGroup(this.agentId);
    }
  }

  /**
   * Initialize SignalR connection and subscribe to RAG status updates
   */
  private initializeSignalR(): void {
    // Start SignalR connection
    this.signalRService.startConnection().then(() => {
      console.log('SignalR connection established');
      
      // Subscribe to RAG status updates
      this.subscription.add(
        this.signalRService.getDocumentRagStatusUpdates().subscribe(update => {
          console.log('SignalR update received:', update);
          console.log('Current agentId:', this.agentId);
          if (update && this.agentId && update.agentId === this.agentId) {
            console.log('Processing RAG status update for current agent');
            this.handleRagStatusUpdate(update);
          } else {
            console.log('Ignoring RAG status update - not for current agent or missing data');
          }
        })
      );
      
      // Join agent group if we have an agentId
      if (this.agentId) {
        this.joinAgentGroup();
      }
    }).catch(error => {
      console.error('Failed to start SignalR connection:', error);
    });
  }

  /**
   * Handle RAG status updates from SignalR
   */
  private handleRagStatusUpdate(update: DocumentRagStatusUpdate): void {
    console.log('Received RAG status update:', update);
    
    // Find and update the document in the agentDocuments array
    const documentIndex = this.agentDocuments.findIndex(
      agentDoc => agentDoc.document?.id === update.documentId
    );
    
    if (documentIndex !== -1 && this.agentDocuments[documentIndex].document) {
      // Update the document's RAG status
      this.agentDocuments[documentIndex].document!.isRagProcessed = update.isRagProcessed;
      
      // Trigger change detection to update the UI
      this.cdr.detectChanges();
      
      // Show notification
      this.notificationService.success(
        'RAG Processing Update',
        `Document "${this.agentDocuments[documentIndex].document!.name}" RAG processing ${update.isRagProcessed ? 'completed' : 'failed'}`
      );
    }
  }

  /**
   * Join agent group for SignalR updates when editing an agent
   */
  private joinAgentGroup(): void {
    if (this.agentId) {
      this.signalRService.joinAgentGroup(this.agentId).then(() => {
        console.log(`Joined SignalR group for agent: ${this.agentId}`);
      }).catch(error => {
        console.error('Failed to join agent group:', error);
      });
    }
  }

  private loadLLMProviders(): void {
    this.subscription.add(
      this.llmService.getProviders().subscribe({
        next: (providers) => {
          this.llmProviders = providers;
        },
        error: (error) => {
          console.error('Error loading LLM providers:', error);
        }
      })
    );
  }

  private loadAvailableTools(): void {
    this.subscription.add(
      this.toolService.getTools().subscribe({
        next: (tools) => {
          this.availableTools = tools;
        },
        error: (error) => {
          console.error('Error loading tools:', error);
        }
      })
    );
  }

  private loadAvailableLLMConfigs(): void {
    this.subscription.add(
      this.llmService.getLLMConfigs().subscribe({
        next: (configs) => {
          this.availableLLMConfigs = configs;
        },
        error: (error) => {
          console.error('Error loading LLM configs:', error);
        }
      })
    );
  }

  private loadAvailableTags(): void {
    this.subscription.add(
      this.tagService.getTags().subscribe({
        next: (tags) => {
          this.availableTags = tags;
        },
        error: (error) => {
          console.error('Error loading tags:', error);
          // Fallback to default tags if API fails
          this.availableTags = [
            { id: '1', name: 'support', color: '#3B82F6' },
            { id: '2', name: 'automation', color: '#10B981' },
            { id: '3', name: 'analysis', color: '#F59E0B' },
            { id: '4', name: 'creative', color: '#8B5CF6' },
            { id: '5', name: 'customer-service', color: '#EF4444' },
            { id: '6', name: 'data', color: '#06B6D4' },
            { id: '7', name: 'insights', color: '#84CC16' }
          ];
        }
      })
    );
  }

  // Refresh tags from API
  refreshTags(): void {
    this.loadAvailableTags();
  }

  // Create a new custom tag
  createCustomTag(tagName: string): void {
    if (!tagName || tagName.trim() === '') return;
    
    const newTag: Omit<TagDto, 'id'> = {
      name: tagName.trim(),
      color: this.generateRandomColor()
    };

    this.subscription.add(
      this.tagService.createTag(newTag).subscribe({
        next: (createdTag) => {
          this.availableTags.push(createdTag);
          this.notificationService.success('Succès', `Tag "${tagName}" créé avec succès`);
          // Add the newly created tag to the agent
          this.addTag(createdTag.name);
        },
        error: (error) => {
          console.error('Error creating tag:', error);
          this.notificationService.error('Erreur', 'Impossible de créer le tag');
        }
      })
    );
  }

  // Generate a random color for new tags
  private generateRandomColor(): string {
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#84CC16',
      '#F97316', '#EC4899', '#6366F1', '#14B8A6', '#F43F5E', '#A855F7', '#22C55E'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
      type: [AgentType.ASSISTANT, Validators.required],
      isActive: [true],
      isPublic: [false],
      tags: [[]],
      llmConfigId: ['', Validators.required],
      embeddingLlmConfigId: [''], // Optional embedding LLM config
      prompts: this.fb.array([]),
      tools: this.fb.array([]),
    });
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
      // Don't clear the model value if it's already a custom model
      if (!this.hasCustomModel) {
        this.agentForm.get('llmConfig.model')?.setValue('');
      }
      // Focus on the custom model input for better UX
      setTimeout(() => {
        const customInput = document.getElementById('customModel');
        if (customInput) {
          customInput.focus();
        }
      }, 100);
    } else if (selectedValue) {
      this.isCustomModel = false;
      this.agentForm.get('llmConfig.model')?.setValue(selectedValue);
    } else {
      this.isCustomModel = false;
      this.agentForm.get('llmConfig.model')?.setValue('');
    }
  }

  private setProviderConfig(providerId: string): void {
    this.selectedProvider = this.llmProviders.find(p => p.id === providerId) || null;
    
    if (this.selectedProvider) {
      const llmConfigGroup = this.agentForm.get('llmConfig');
      if (llmConfigGroup) {
        // Reset custom model state
        this.isCustomModel = false;
        
        llmConfigGroup.patchValue({
          provider: this.selectedProvider.id,
          baseUrl: this.selectedProvider.baseUrl,
          model: this.selectedProvider.models.length > 0 ? this.selectedProvider.models[0] : ''
        });

        // Update API key validation based on provider
        this.updateApiKeyValidation();
      }
    }
  }

  private updateApiKeyValidation(): void {
    const apiKeyControl = this.agentForm.get('llmConfig.apiKey');
    if (apiKeyControl && this.selectedProvider) {
      if (this.selectedProvider.id === 'ollama') {
        apiKeyControl.clearValidators();
      } else {
        apiKeyControl.setValidators([Validators.required]);
      }
      apiKeyControl.updateValueAndValidity();
    }
  }

  get llmConfigGroup(): FormGroup {
    return this.agentForm.get('llmConfig') as FormGroup;
  }

  get availableModels(): string[] {
    return this.selectedProvider?.models || [];
  }

  get hasCustomModel(): boolean {
    const currentModel = this.agentForm.get('llmConfig.model')?.value;
    if (!currentModel || !this.selectedProvider) return false;
    
    // Check if the current model is not in the predefined list
    return !this.selectedProvider.models.includes(currentModel);
  }

  get modelSelectionStatus(): string {
    const currentModel = this.agentForm.get('llmConfig.model')?.value;
    if (!currentModel) return 'no-model';
    if (this.isCustomModel) return 'custom';
    if (this.hasCustomModel) return 'custom-not-selected';
    return 'predefined';
  }

  getModelSelectValue(): string {
    const currentModel = this.agentForm.get('llmConfig.model')?.value;
    if (!currentModel) return '';
    
    // If it's a custom model, return 'custom' to show the custom option
    if (this.isCustomModel || this.hasCustomModel) {
      return 'custom';
    }
    
    // If it's a predefined model, return the model name
    return currentModel;
  }

  testLLMConnection(): void {
    const llmConfig = this.llmConfigGroup.value;
    if (!llmConfig) return;

    this.subscription.add(
      this.llmService.testConnection(llmConfig).subscribe({
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

  private loadAgentForEdit(): void {
    if (!this.agentId) return;
    
    this.subscription.add(
      this.agentService.getAgentById(this.agentId).subscribe({
        next: (agent) => {
          this.populateForm(agent);
          this.loadAgentDocumentsFromAgent(agent);
        },
        error: (error: any) => {
          this.notificationService.error('Erreur', 'Impossible de charger l\'agent pour édition');
          console.error('Error loading agent:', error);
        }
      })
    );
  }

  private populateForm(agent: Agent): void {
    console.log('Populating form with agent:', agent);
    console.log('Agent tools:', agent.tools);
    console.log('Available tools:', this.availableTools);
    
    // Clear existing FormArrays
    this.clearFormArrays();
    
    // Fill main form first
    this.agentForm.patchValue({
      name: agent.name,
      description: agent.description,
      type: agent.type,
      isActive: agent.isActive,
      isPublic: agent.isPublic,
      tags: [...agent.agentTags],
      llmConfigId: agent.llmConfig?.id,
      embeddingLlmConfigId: agent.embeddingLlmConfig?.id || ''
    });

    // Set selected provider - find provider by ID since that's what's stored
    const providerId = agent.llmConfig?.provider ? this.getProviderIdFromEnum(agent.llmConfig.provider) : null;
    const provider = providerId ? this.llmProviders.find(p => p.id === providerId) : null;
    if (provider) {
      this.selectedProvider = provider;
      this.updateApiKeyValidation();
      
      // Check if the model is custom (not in predefined list)
      this.isCustomModel = !provider.models.includes(agent.llmConfig!.model);
    }

    // Add prompts
    agent.prompts.forEach((prompt: Prompt) => {
      this.addPrompt(prompt);
    });

    // Add tools with delay to ensure proper rendering
    setTimeout(() => {
      agent.tools.forEach((tool: AgentTool) => {
        this.addTool(tool);
      });
    }, 100);

  }

  private clearFormArrays(): void {
    while (this.promptsArray.length !== 0) {
      this.promptsArray.removeAt(0);
    }
    while (this.toolsArray.length !== 0) {
      this.toolsArray.removeAt(0);
    }
  }

  // Getters pour les FormArrays
  get promptsArray(): FormArray {
    return this.agentForm.get('prompts') as FormArray;
  }

  get toolsArray(): FormArray {
    return this.agentForm.get('tools') as FormArray;
  }


  // Getters typés pour les FormGroups
  getPromptGroup(index: number): FormGroup {
    return this.promptsArray.at(index) as FormGroup;
  }

  getToolGroup(index: number): FormGroup {
    return this.toolsArray.at(index) as FormGroup;
  }


  // Getters pour les FormControls spécifiques
  getPromptContent(index: number): FormControl { 
    const control = this.getPromptGroup(index)?.get('content');
    return control instanceof FormControl ? control : new FormControl('');
  }

  getPromptIsActive(index: number): FormControl { 
    const control = this.getPromptGroup(index)?.get('isActive');
    return control instanceof FormControl ? control : new FormControl(false);
  }

  getPromptVariables(index: number): FormArray { 
    const control = this.getPromptGroup(index)?.get('variables');
    return control instanceof FormArray ? control : new FormArray<any>([]);
  }

  getToolToolId(index: number): FormControl { 
    return (this.toolsArray.at(index) as FormGroup).get('toolId') as FormControl;
  }


  getToolIsActive(index: number): FormControl { 
    const control = this.getToolGroup(index)?.get('isActive');
    return control instanceof FormControl ? control : new FormControl(false);
  }


  getPromptVariableName(promptIndex: number, variableIndex: number): FormControl { 
    const promptGroup = this.getPromptGroup(promptIndex);
    const variablesArray = promptGroup?.get('variables') as FormArray;
    const variableGroup = variablesArray?.at(variableIndex) as FormGroup;
    const control = variableGroup?.get('name');
    return control instanceof FormControl ? control : new FormControl('');
  }

  getPromptVariableType(promptIndex: number, variableIndex: number): FormControl { 
    const promptGroup = this.getPromptGroup(promptIndex);
    const variablesArray = promptGroup?.get('variables') as FormArray;
    const variableGroup = variablesArray?.at(variableIndex) as FormGroup;
    const control = variableGroup?.get('type');
    return control instanceof FormControl ? control : new FormControl('');
  }

  getPromptVariableDefault(promptIndex: number, variableIndex: number): FormControl { 
    const promptGroup = this.getPromptGroup(promptIndex);
    const variablesArray = promptGroup?.get('variables') as FormArray;
    const variableGroup = variablesArray?.at(variableIndex) as FormGroup;
    const control = variableGroup?.get('default');
    return control instanceof FormControl ? control : new FormControl('');
  }

  // Méthodes pour les Prompts
  addPrompt(prompt?: Prompt): void {
    const promptGroup = this.fb.group({
      id: [prompt?.id || this.generateId()],
      agentId: this.agentId,
      content: [prompt?.content || '', [Validators.required, Validators.minLength(10)]],
      variables: this.fb.array([]),
      isActive: [prompt?.isActive ?? true]
    });

    if (prompt?.variables) {
      prompt.variables.forEach((variable: PromptVariable) => {
        this.addPromptVariable(promptGroup, variable);
      });
    }

    this.promptsArray.push(promptGroup);
  }

  removePrompt(index: number): void {
    this.promptsArray.removeAt(index);
  }

  addPromptVariable(promptGroup: FormGroup, variable?: PromptVariable): void {
    const variableGroup = this.fb.group({
      name: [variable?.name || '', [Validators.required]],
      type: [variable?.type || 'string', Validators.required],
      required: [variable?.required ?? false],
      default: [variable?.default || ''],
      description: [variable?.description || '']
    });

    const variablesArray = promptGroup.get('variables') as FormArray;
    variablesArray.push(variableGroup);
  }

  removePromptVariable(promptGroup: FormGroup, index: number): void {
    const variablesArray = promptGroup.get('variables') as FormArray;
    variablesArray.removeAt(index);
  }

  // Updated tool methods
  addTool(tool?: AgentTool): void {
    const toolGroup = this.fb.group({
      id: [tool?.id || this.generateId()],
      isActive: [tool?.isActive ?? true],
      toolId: [tool?.toolId || '', [Validators.required]],
      tool: [tool?.tool || null]
    });

    this.toolsArray.push(toolGroup);

    // If editing existing tool, set the value after DOM is ready
    if (tool?.toolId) {
      setTimeout(() => {
        const selectedTool = this.availableTools.find(t => t.id === tool.toolId);
        if (selectedTool) {
          toolGroup.get('toolId')?.setValue(selectedTool.id);
          this.onToolSelect(selectedTool.id, this.toolsArray.length - 1);
        }
        this.cdr.detectChanges();
      }, 50);
    }
  }

  onToolSelect(toolId: string, toolIndex: number): void {
    const selectedTool = this.availableTools.find(t => t.id === toolId);
    if (selectedTool) {
      const toolGroup = this.toolsArray.at(toolIndex);
      
      // Update toolId and tool object when a tool is selected
      toolGroup.patchValue({
        toolId: selectedTool.id,
        tool: {
          id: selectedTool.id,
          name: selectedTool.name,
          description: selectedTool.description,
          type: selectedTool.type,
          category: selectedTool.category || null,
          isActive: selectedTool.isActive || true,
          configuration: selectedTool.configuration || '',
          authentication: selectedTool.authentication || '',
          parameters: selectedTool.parameters || '[]',
          headers: selectedTool.headers || '[]',
          createdAt: selectedTool.createdAt || new Date().toISOString(),
          updatedAt: selectedTool.updatedAt || new Date().toISOString()
        }
      });
      
      this.cdr.detectChanges();
    }
  }

  onToolSelectChange(event: Event, toolIndex: number): void {
    const target = event.target as HTMLSelectElement;
    if (target && target.value) {
      this.onToolSelect(target.value, toolIndex);
    } else {
      this.resetToolFields(toolIndex);
    }
  }

  private resetToolFields(toolIndex: number): void {
    const toolGroup = this.toolsArray.at(toolIndex);
    toolGroup.patchValue({
      toolId: '',
      tool: null
    });
    this.cdr.detectChanges();
  }

  compareTools(tool1: any, tool2: any): boolean {
    if (!tool1 || !tool2) return false;
    const id1 = typeof tool1 === 'object' ? tool1.id : tool1;
    const id2 = typeof tool2 === 'object' ? tool2.id : tool2;
    return id1 === id2;
  }

  trackByToolId(index: number, tool: any): any {
    return tool.id || index;
  }

  removeTool(index: number): void {
    this.toolsArray.removeAt(index);
  }


  // Gestion des tags
  addTag(tagName: string): void {
    if (!tagName) return;
    const currentTags: AgentTag[] = this.agentForm.get('tags')?.value || [];
    const alreadyExists = currentTags.some(t => t.tag?.name === tagName);
    if (!alreadyExists) {
      // Find the selected tag from available tags
      const selectedTag = this.availableTags.find(t => t.name === tagName);
      if (selectedTag) {
        // Create a proper AgentTag structure
        const newTag: AgentTag = {
          id: this.generateId(),
          agentId: this.agentId || '',
          tagId: selectedTag.id,
          tag : selectedTag
        };
        this.agentForm.patchValue({ tags: [...currentTags, newTag] });
      }
    }
  }


  removeTag(tagName: string): void {
    const currentTags: AgentTag[] = this.agentForm.get('tags')?.value || [];
    const updatedTags = currentTags.filter(t => t.tag?.name !== tagName);
    this.agentForm.patchValue({ tags: updatedTags });
  }


  // Soumission du formulaire
  onSubmit(): void {
    if (this.agentForm.valid) {
      const formValue = this.agentForm.value;
      
      // Convert form data to backend DTO format
      const agentData = {
        id: this.agentId,
        name: formValue.name,
        description: formValue.description,
        type: formValue.type,
        isActive: formValue.isActive,
        isPublic: formValue.isPublic,
        agentTags: formValue.tags?.map((tag: AgentTag) => ({
          id: tag.id,
          agentId: this.agentId,
          tagId: tag.tagId,
        })),
        llmConfigId: formValue.llmConfigId,
        embeddingLlmConfigId: formValue.embeddingLlmConfigId || null,
        agentDocuments: this.agentDocuments.map(agentDoc => ({
          id: agentDoc.id,
          agentId: this.agentId,
          documentId: agentDoc.documentId
        })),
        prompts: formValue.prompts.map((prompt: any) => ({
          content: prompt.content,
          isActive: prompt.isActive,
          id : prompt.id,
          agentId : this.agentId,
          variables: prompt.variables ? prompt.variables.map((variable: any) => ({
            name: variable.name,
            type: variable.type,
            required: variable.required,
            defaultValue: variable.defaultValue,
            description: variable.description
          })) : []
        })),
        tools: formValue.tools.map((tool: any) => ({
          name: tool.tool?.name || '',
          isActive: tool.isActive,
          toolId: tool.toolId || null,
          description: tool.tool?.description || '',
          type: tool.tool?.type || '',
          category: tool.tool?.category || null,
          configuration: tool.tool?.configuration || '',
          authentication: tool.tool?.authentication || '',
          parameters: tool.tool?.parameters || '[]',
          headers: tool.tool?.headers || '[]'
        })),
      };

      if (this.isEditMode && this.agentId) {
        this.updateAgent(agentData);
      } else {
        this.createAgent(agentData);
      }
    } else {
      this.markFormGroupTouched();
      this.notificationService.error('Erreur de validation', 'Veuillez corriger les erreurs dans le formulaire');
    }
  }

  private createAgent(agentData: any): void {
    this.subscription.add(
      this.agentService.createAgent(agentData).subscribe({
        next: (agent: Agent) => {
          this.notificationService.success('Succès', 'Agent créé avec succès');
          this.router.navigate(['/agents', agent.id]);
        },
        error: (error: any) => {
          this.notificationService.error('Erreur', 'Impossible de créer l\'agent');
          console.error('Error creating agent:', error);
        }
      })
    );
  }

  private updateAgent(agentData: any): void {
    if (!this.agentId) return;
    
    this.subscription.add(
      this.agentService.updateAgent(this.agentId, agentData).subscribe({
        next: (agent: Agent) => {
          this.notificationService.success('Succès', 'Agent mis à jour avec succès');
          this.router.navigate(['/agents', agent.id]);
        },
        error: (error: any) => {
          this.notificationService.error('Erreur', 'Impossible de mettre à jour l\'agent');
          console.error('Error updating agent:', error);
        }
      })
    );
  }

  private markFormGroupTouched(): void {
    Object.keys(this.agentForm.controls).forEach(key => {
      const control = this.agentForm.get(key);
      control?.markAsTouched();
    });
  }

  private generateId(): string {
    return uuidv4();
  }

  // Navigation
  onCancel(): void {
    this.router.navigate(['/agents']);
  }

  // Validation helpers
  isFieldInvalid(fieldName: string): boolean {
    const field = this.agentForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.agentForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) return 'Ce champ est requis';
      if (field.errors['minlength']) return `Minimum ${field.errors['minlength'].requiredLength} caractères`;
      if (field.errors['maxlength']) return `Maximum ${field.errors['maxlength'].requiredLength} caractères`;
    }
    return '';
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

  // Document methods
  loadAgentDocuments(): void {
    if (this.agentId) {
      this.subscription.add(
        this.documentService.getDocumentsByAgentId(this.agentId).subscribe({
          next: (documents) => {
            this.agentDocuments = documents.map(doc => ({
              id: uuidv4(),
              agentId: this.agentId!,
              documentId: doc.id,
              document: {
                id: doc.id,
                name: doc.name,
                description: doc.description,
                type: doc.type,
                size: doc.size,
                isActive: doc.isActive,
                isRagProcessed: doc.isRagProcessed,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt
              }
            }));
            // Trigger change detection to ensure UI updates
            this.cdr.detectChanges();
          },
          error: (error) => {
            console.error('Error loading agent documents:', error);
          }
        })
      );
    }
  }

  loadAgentDocumentsFromAgent(agent: Agent): void {
    if (agent.agentDocuments && agent.agentDocuments.length > 0) {
      this.agentDocuments = agent.agentDocuments
        .filter(agentDoc => agentDoc.document) // Filter out any agentDocs without documents
        .map(agentDoc => ({
          id: uuidv4(),
          agentId: agent.id,
          documentId: agentDoc.document!.id,
          document: {
            id: agentDoc.document!.id,
            name: agentDoc.document!.name,
            description: agentDoc.document!.description,
            type: agentDoc.document!.type,
            size: agentDoc.document!.size,
            isActive: agentDoc.document!.isActive,
            isRagProcessed: agentDoc.document!.isRagProcessed,
            createdAt: agentDoc.document!.createdAt,
            updatedAt: agentDoc.document!.updatedAt
          }
        }));
    } else {
      this.agentDocuments = [];
    }
  }

  onDocumentFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedDocumentFile = input.files[0];
    }
  }

  uploadDocument(): void {
    if (!this.selectedDocumentFile || !this.agentId) {
      this.notificationService.error('Error', 'Please select a file and ensure agent is created first');
      return;
    }

    this.isUploadingDocument = true;
    this.subscription.add(
      this.documentService.uploadDocument(this.agentId, this.selectedDocumentFile).subscribe({
        next: (response) => {
          if (response.success && response.document) {
            this.notificationService.success('Success', 'Document uploaded successfully');
            this.loadAgentDocuments();
            this.selectedDocumentFile = null;
            // Reset file input
            const fileInput = document.getElementById('documentFile') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
          } else {
            this.notificationService.error('Error', response.error || 'Failed to upload document');
          }
          this.isUploadingDocument = false;
        },
        error: (error) => {
          console.error('Error uploading document:', error);
          this.notificationService.error('Error', 'Failed to upload document');
          this.isUploadingDocument = false;
        }
      })
    );
  }

  createTextDocument(): void {
    if (!this.agentId) {
      this.notificationService.error('Error', 'Please create the agent first');
      return;
    }

    const name = prompt('Enter document name:');
    if (!name) return;

    const content = prompt('Enter document content:');
    if (!content) return;

    const documentData: CreateDocumentDto = {
      name: name,
      content: content,
      type: DocumentType.TEXT,
      agentId: this.agentId,
      isActive: true,
      isPublic: false
    };

    this.subscription.add(
      this.documentService.createDocument(documentData).subscribe({
        next: (document) => {
          this.notificationService.success('Success', 'Document created successfully');
          this.loadAgentDocuments();
        },
        error: (error) => {
          console.error('Error creating document:', error);
          this.notificationService.error('Error', 'Failed to create document');
        }
      })
    );
  }

  removeDocument(documentId: string): void {
    if (!this.agentId) {
      this.notificationService.error('Error', 'Agent ID not available');
      return;
    }

    if (confirm('Are you sure you want to remove this document from the agent?')) {
      this.subscription.add(
        this.documentService.removeDocumentFromAgent(this.agentId, documentId).subscribe({
          next: () => {
            this.notificationService.success('Success', 'Document removed from agent and RAG successfully');
            this.loadAgentDocuments();
          },
          error: (error) => {
            console.error('Error removing document from agent:', error);
            this.notificationService.error('Error', 'Failed to remove document from agent');
          }
        })
      );
    }
  }


  downloadDocument(documentId: string, fileName: string): void {
    this.subscription.add(
      this.documentService.downloadDocument(documentId).subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          link.click();
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          console.error('Error downloading document:', error);
          this.notificationService.error('Error', 'Failed to download document');
        }
      })
    );
  }

  getDocumentTypeIcon(type: string): string {
    switch (type) {
      case 'pdf':
        return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
      case 'docx':
      case 'doc':
        return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
      case 'txt':
      case 'text':
        return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
      case 'json':
        return 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4';
      case 'xml':
        return 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4';
      case 'csv':
        return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
      case 'html':
        return 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4';
      case 'markdown':
        return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
      default:
        return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
    }
  }

  getDocumentTypeIconClass(type: string): string {
    switch (type) {
      case 'pdf':
        return 'bg-red-100 dark:bg-red-900/20';
      case 'docx':
      case 'doc':
        return 'bg-blue-100 dark:bg-blue-900/20';
      case 'txt':
      case 'text':
        return 'bg-gray-100 dark:bg-gray-700';
      case 'xlsx':
      case 'xls':
        return 'bg-green-100 dark:bg-green-900/20';
      case 'pptx':
      case 'ppt':
        return 'bg-orange-100 dark:bg-orange-900/20';
      default:
        return 'bg-gray-100 dark:bg-gray-700';
    }
  }

  isSpecificDocumentType(type: string): boolean {
    const specificTypes = ['pdf', 'docx', 'doc', 'txt', 'text', 'xlsx', 'xls', 'pptx', 'ppt'];
    return specificTypes.includes(type.toLowerCase());
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  triggerFileInput(): void {
    const fileInput = document.getElementById('documentFile') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  clearFileInput(): void {
    this.selectedDocumentFile = null;
    const fileInput = document.getElementById('documentFile') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }
}