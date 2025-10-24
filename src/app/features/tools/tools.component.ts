import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, Observable } from 'rxjs';
import { Tool, ToolType } from '../../models/tool.model';
import { NotificationService } from '../../core/services/notification.service';
import { ToolService } from '../../core/services/tool.service';
import { RoleService } from '../../core/services/role.service';

@Component({
  selector: 'app-tools',
  templateUrl: './tools.component.html',
  styleUrls: ['./tools.component.css']
})
export class ToolsComponent implements OnInit, OnDestroy {
  tools: Tool[] = [];
  filteredTools: Tool[] = [];
  toolTypes: ToolType[] = [];
  isLoading = true;
  
  searchQuery = '';
  selectedType = '';
  selectedStatus = '';
  
  // View and sorting options
  viewMode: 'grid' | 'list' = 'grid';
  sortBy: 'name' | 'createdAt' | 'updatedAt' | 'type' = 'updatedAt';
  sortOrder: 'asc' | 'desc' = 'desc';
  
  // Grouping
  groupByType = false;
  groupedTools = new Map<string, Tool[]>();
  collapsedGroups = new Set<string>();
  
  // Role-based permissions
  hasWritePermission: Observable<boolean>;
  
  private subscription = new Subscription();
  private searchSaveTimeout: any;

  constructor(
    private notificationService: NotificationService,
    private router: Router,
    private toolService: ToolService,
    private roleService: RoleService
  ) {
    this.hasWritePermission = this.roleService.hasWritePermission();
  }

  ngOnInit(): void {
    this.loadPreferences();
    this.loadTools();
    this.toolTypes = Object.values(ToolType);
  }

  ngOnDestroy(): void {
    if (this.searchSaveTimeout) {
      clearTimeout(this.searchSaveTimeout);
    }
    this.savePreferences();
    this.subscription.unsubscribe();
  }

  private loadPreferences(): void {
    try {
      const preferences = localStorage.getItem('tools-preferences');
      if (preferences) {
        const prefs = JSON.parse(preferences);
        
        // Load view mode
        if (prefs.viewMode && (prefs.viewMode === 'grid' || prefs.viewMode === 'list')) {
          this.viewMode = prefs.viewMode;
        }
        
        // Load grouping preference
        if (typeof prefs.groupByType === 'boolean') {
          this.groupByType = prefs.groupByType;
        }
        
        // Load sort preferences
        if (prefs.sortBy && ['name', 'createdAt', 'updatedAt', 'type'].includes(prefs.sortBy)) {
          this.sortBy = prefs.sortBy;
        }
        
        if (prefs.sortOrder && (prefs.sortOrder === 'asc' || prefs.sortOrder === 'desc')) {
          this.sortOrder = prefs.sortOrder;
        }
        
        // Load filter preferences
        if (prefs.selectedType) {
          this.selectedType = prefs.selectedType;
        }
        
        if (prefs.selectedStatus) {
          this.selectedStatus = prefs.selectedStatus;
        }
        
        if (prefs.searchQuery) {
          this.searchQuery = prefs.searchQuery;
        }
        
        // Load collapsed groups
        if (prefs.collapsedGroups && Array.isArray(prefs.collapsedGroups)) {
          this.collapsedGroups = new Set(prefs.collapsedGroups);
        }
      }
    } catch (error) {
      console.warn('Failed to load tools preferences:', error);
    }
  }

  private savePreferences(): void {
    try {
      const preferences = {
        viewMode: this.viewMode,
        groupByType: this.groupByType,
        sortBy: this.sortBy,
        sortOrder: this.sortOrder,
        selectedType: this.selectedType,
        selectedStatus: this.selectedStatus,
        searchQuery: this.searchQuery,
        collapsedGroups: Array.from(this.collapsedGroups)
      };
      
      localStorage.setItem('tools-preferences', JSON.stringify(preferences));
    } catch (error) {
      console.warn('Failed to save tools preferences:', error);
    }
  }

  private loadTools(): void {
    this.isLoading = true;
    this.subscription.add(
      this.toolService.getTools().subscribe({
        next: (tools) => {
          this.tools = tools;
          this.applyFilters();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading tools:', error);
          this.notificationService.error(
            'Error Loading Tools',
            'Failed to load tools from the server.'
          );
          this.isLoading = false;
        }
      })
    );
  }

  onSearchChange(): void {
    this.applyFilters();
    
    // Debounced save for search query
    if (this.searchSaveTimeout) {
      clearTimeout(this.searchSaveTimeout);
    }
    this.searchSaveTimeout = setTimeout(() => {
      this.savePreferences();
    }, 1000); // Save after 1 second of no typing
  }

  onTypeFilterChange(): void {
    this.applyFilters();
    this.savePreferences();
  }

  onStatusFilterChange(): void {
    this.applyFilters();
    this.savePreferences();
  }

  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
    this.savePreferences();
  }

  onSortChange(sortBy: 'name' | 'createdAt' | 'updatedAt' | 'type'): void {
    if (this.sortBy === sortBy) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = sortBy;
      this.sortOrder = 'desc';
    }
    this.applyFilters();
    this.savePreferences();
  }

  toggleSortOrder(): void {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    this.applyFilters();
    this.savePreferences();
  }

  toggleGrouping(): void {
    this.groupByType = !this.groupByType;
    this.applyFilters();
    this.savePreferences();
  }

  toggleGroupCollapse(groupKey: string): void {
    if (this.collapsedGroups.has(groupKey)) {
      this.collapsedGroups.delete(groupKey);
    } else {
      this.collapsedGroups.add(groupKey);
    }
    this.savePreferences();
  }

  private applyFilters(): void {
    let filtered = [...this.tools];

    // Search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(tool =>
        tool.name.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (this.selectedType) {
      filtered = filtered.filter(tool => tool.type === this.selectedType);
    }

    // Status filter
    if (this.selectedStatus !== '') {
      const isActive = this.selectedStatus === 'true';
      filtered = filtered.filter(tool => tool.isActive === isActive);
    }

    // Sort the filtered results
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (this.sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
        case 'type':
          aValue = a.type.toLowerCase();
          bValue = b.type.toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return this.sortOrder === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return this.sortOrder === 'asc' ? 1 : -1;
      }
      return 0;
    });

    this.filteredTools = filtered;

    // Group tools by type if grouping is enabled
    if (this.groupByType) {
      this.groupedTools.clear();
      
      filtered.forEach(tool => {
        const typeKey = tool.type || 'Unknown';
        if (!this.groupedTools.has(typeKey)) {
          this.groupedTools.set(typeKey, []);
        }
        this.groupedTools.get(typeKey)!.push(tool);
      });
      
      // Sort groups by type name
      const sortedGroups = new Map<string, Tool[]>();
      Array.from(this.groupedTools.keys()).sort().forEach(key => {
        sortedGroups.set(key, this.groupedTools.get(key)!);
      });
      this.groupedTools = sortedGroups;
    }
  }

  createNewTool(): void {
    this.router.navigate(['/tools/new']);
  }

  viewTool(id: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.router.navigate(['/tools', id]);
  }

  editTool(id: string, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/tools', id, 'edit']);
  }

  deleteTool(id: string, event: Event): void {
    event.stopPropagation();
    
    if (confirm('Are you sure you want to delete this tool? This action cannot be undone.')) {
      this.subscription.add(
        this.toolService.deleteTool(id).subscribe({
          next: () => {
            this.tools = this.tools.filter(tool => tool.id !== id);
            this.applyFilters();
            this.notificationService.success(
              'Tool Deleted',
              'The tool has been successfully deleted.'
            );
          },
          error: (error) => {
            console.error('Error deleting tool:', error);
            this.notificationService.error(
              'Error Deleting Tool',
              'Failed to delete the tool. Please try again.'
            );
          }
        })
      );
    }
  }

  getRequiredHeadersCount(tool: any): number {
    return (tool.headers || []).filter((h: any) => h.required).length;
  }

  toggleToolStatus(id: string, event: Event): void {
    event.stopPropagation();
    const tool = this.tools.find(t => t.id === id);
    if (tool) {
      const updatedTool = { ...tool, isActive: !tool.isActive };
      this.subscription.add(
        this.toolService.updateTool(id, {
          name: updatedTool.name,
          description: updatedTool.description,
          type: updatedTool.type,
          category: updatedTool.category,
          isActive: updatedTool.isActive,
          configuration: updatedTool.configuration,
          authentication: JSON.stringify(updatedTool.authentication)
        }).subscribe({
          next: (updatedToolResponse) => {
            const index = this.tools.findIndex(t => t.id === id);
            if (index !== -1) {
              this.tools[index] = updatedToolResponse;
              this.applyFilters();
            }
            this.notificationService.success(
              'Tool Updated',
              `Tool ${updatedTool.isActive ? 'activated' : 'deactivated'} successfully.`
            );
          },
          error: (error) => {
            console.error('Error updating tool:', error);
            this.notificationService.error(
              'Error Updating Tool',
              'Failed to update the tool status. Please try again.'
            );
          }
        })
      );
    }
  }

  getTypeClasses(type: ToolType): string {
    switch (type) {
      case ToolType.API:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case ToolType.MCP:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case ToolType.INTERNAL:
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  }

  getStatusClasses(isActive: boolean): string {
    return isActive
      ? 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200'
      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  }

  getAuthType(tool: Tool): string | undefined {
    if (!tool.authentication) {
      return undefined;
    }
    
    // Authentication is now always a JSON string
    if (typeof tool.authentication === 'string') {
      try {
        const authData = JSON.parse(tool.authentication);
        return authData.type;
      } catch (e) {
        console.warn('Invalid authentication JSON:', tool.authentication);
        return undefined;
      }
    }
    
    // Fallback for object (shouldn't happen anymore)
    return tool.authentication.type;
  }

  getAuthTypeDisplay(authType: string | undefined): string {
    if (!authType) {
      return 'None';
    }
    
    switch (authType) {
      case 'api_key':
        return 'API Key';
      case 'basic':
        return 'Basic Auth';
      case 'bearer':
        return 'Bearer Token';
      case 'oauth2':
        return 'OAuth2 (Generic)';
      case 'azure_oauth2':
        return 'Azure OAuth2';
      case 'none':
        return 'None';
      default:
        return authType.charAt(0).toUpperCase() + authType.slice(1);
    }
  }

  getTypeColor(type: string): string {
    switch (type) {
      case 'API':
      case 'ApiTool':
        return '#3b82f6'; // blue
      case 'MCP':
      case 'McpTool':
        return '#10b981'; // green
      case 'INTERNAL':
      case 'InternalTool':
        return '#8b5cf6'; // purple
      default:
        return '#9ca3af'; // gray
    }
  }

  duplicateTool(id: string, event: Event): void {
    event.stopPropagation();
    
    const tool = this.tools.find(t => t.id === id);
    if (!tool) {
      this.notificationService.error('Error', 'Tool not found');
      return;
    }

    // Create a copy of the tool with a new name
    const duplicatedTool = {
      ...tool,
      name: `${tool.name} (Copy)`,
      id: '', // Will be generated by the server
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.subscription.add(
      this.toolService.createTool({
        name: duplicatedTool.name,
        description: duplicatedTool.description,
        type: duplicatedTool.type,
        category: duplicatedTool.category,
        isActive: duplicatedTool.isActive,
        configuration: duplicatedTool.configuration,
        authentication: JSON.stringify(duplicatedTool.authentication),
        parameters: JSON.stringify(duplicatedTool.parameters),
        headers: JSON.stringify(duplicatedTool.headers)
      }).subscribe({
        next: (newTool) => {
          this.tools.unshift(newTool);
          this.applyFilters();
          this.notificationService.success(
            'Tool Duplicated',
            `Tool "${duplicatedTool.name}" has been created successfully.`
          );
        },
        error: (error) => {
          console.error('Error duplicating tool:', error);
          this.notificationService.error(
            'Error Duplicating Tool',
            'Failed to duplicate the tool. Please try again.'
          );
        }
      })
    );
  }
}
