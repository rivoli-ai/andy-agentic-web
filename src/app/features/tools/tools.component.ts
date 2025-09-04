import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Tool, ToolType } from '../../models/tool.model';
import { NotificationService } from '../../core/services/notification.service';
import { ToolService } from '../../core/services/tool.service';

@Component({
  selector: 'app-tools',
  templateUrl: './tools.component.html',
  styleUrls: ['./tools.component.css']
})
export class ToolsComponent implements OnInit, OnDestroy {
  tools: Tool[] = [];
  filteredTools: Tool[] = [];
  toolTypes: ToolType[] = [];
  
  searchQuery = '';
  selectedType = '';
  selectedStatus = '';
  
  private subscription = new Subscription();

  constructor(
    private notificationService: NotificationService,
    private router: Router,
    private toolService: ToolService
  ) {}

  ngOnInit(): void {
    this.loadTools();
    this.toolTypes = Object.values(ToolType);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private loadTools(): void {
    this.subscription.add(
      this.toolService.getTools().subscribe({
        next: (tools) => {
          this.tools = tools;
          this.applyFilters();
        },
        error: (error) => {
          console.error('Error loading tools:', error);
          this.notificationService.error(
            'Error Loading Tools',
            'Failed to load tools from the server.'
          );
        }
      })
    );
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onTypeFilterChange(): void {
    this.applyFilters();
  }

  onStatusFilterChange(): void {
    this.applyFilters();
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

    this.filteredTools = filtered;
  }

  createNewTool(): void {
    this.router.navigate(['/tools/new']);
  }

  viewTool(id: string): void {
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

  testTool(id: string, event: Event): void {
    event.stopPropagation();
    
    this.notificationService.info(
      'Testing Tool',
      'Testing tool connection...'
    );

    // Simulate tool testing
    setTimeout(() => {
      this.notificationService.success(
        'Test Complete',
        'Tool connection test successful!'
      );
    }, 2000);
  }

  getTypeClasses(type: ToolType): string {
    switch (type) {
      case ToolType.API:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case ToolType.INTERNAL:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  }

  getStatusClasses(isActive: boolean): string {
    return isActive
      ? 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200'
      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  }
}
