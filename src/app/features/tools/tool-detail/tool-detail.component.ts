import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, Observable } from 'rxjs';
import { Tool, ToolType, ToolHeader, ToolParameter } from '../../../models/tool.model';
import { ToolService } from '../../../core/services/tool.service';
import { NotificationService } from '../../../core/services/notification.service';
import { RoleService } from '../../../core/services/role.service';

@Component({
  standalone: false,
  selector: 'app-tool-detail',
  templateUrl: './tool-detail.component.html',
  styleUrls: ['./tool-detail.component.css']
})
export class ToolDetailComponent implements OnInit, OnDestroy {
  tool: Tool | null = null;
  isLoading = true;
  
  // Role-based permissions
  hasWritePermission: Observable<boolean>;
  
  private subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private toolService: ToolService,
    private notificationService: NotificationService,
    private roleService: RoleService
  ) {
    this.hasWritePermission = this.roleService.hasWritePermission();
  }

  ngOnInit(): void {
    const toolId = this.route.snapshot.paramMap.get('id');
    if (toolId) {
      this.loadTool(toolId);
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private loadTool(id: string): void {
    this.isLoading = true;
    this.subscription.add(
      this.toolService.getToolById(id).subscribe({
        next: (tool) => {
          this.tool = tool;
          this.isLoading = false;
        },
        error: (error) => {
          this.notificationService.error('Error', 'Failed to load tool details');
          console.error('Error loading tool:', error);
          this.isLoading = false;
          this.router.navigate(['/tools']);
        }
      })
    );
  }

  formatCategoryDisplay(category?: string | null): string {
    const s = (category || '').trim();
    return s || 'Uncategorized';
  }

  goBack(): void {
    this.router.navigate(['/tools']);
  }

  editTool(): void {
    if (this.tool) {
      this.router.navigate(['/tools', this.tool.id, 'edit']);
    }
  }

  duplicateTool(): void {
    if (!this.tool) return;

    // For now, we'll just show a notification since duplicate functionality might not be implemented
    this.notificationService.info('Duplicate', 'Duplicate functionality will be implemented soon');
  }

  deleteTool(): void {
    if (!this.tool) return;

    if (confirm('Are you sure you want to delete this tool? This action cannot be undone.')) {
      this.subscription.add(
        this.toolService.deleteTool(this.tool.id).subscribe({
          next: () => {
            this.notificationService.success('Tool Deleted', 'Tool has been deleted successfully');
            this.router.navigate(['/tools']);
          },
          error: (error) => {
            this.notificationService.error('Error', 'Failed to delete tool');
            console.error('Error deleting tool:', error);
          }
        })
      );
    }
  }

  getTypeColor(type: string): string {
    switch (type) {
      case 'API':
        return '#3b82f6'; // blue
      case 'MCP':
        return '#10b981'; // green
      default:
        return '#9ca3af'; // gray
    }
  }

  getTypeClasses(type: ToolType): string {
    switch (type) {
      case ToolType.API:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case ToolType.MCP:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  }

  getAuthType(tool: Tool): string {
    if (tool.configuration) {
      try {
        const config = typeof tool.configuration === 'string' 
          ? JSON.parse(tool.configuration) 
          : tool.configuration;
        return config.authType || 'None';
      } catch {
        return 'None';
      }
    }
    return 'None';
  }

  getAuthTypeDisplay(authType: string): string {
    switch (authType) {
      case 'API_KEY':
        return 'API Key';
      case 'BEARER_TOKEN':
        return 'Bearer Token';
      case 'BASIC_AUTH':
        return 'Basic Auth';
      case 'OAUTH2':
        return 'OAuth2';
      default:
        return 'None';
    }
  }

  getConfigurationItems(): Array<{key: string, value: string}> {
    if (!this.tool?.configuration) {
      return [];
    }

    try {
      const config = typeof this.tool.configuration === 'string' 
        ? JSON.parse(this.tool.configuration) 
        : this.tool.configuration;

      return Object.entries(config).map(([key, value]) => ({
        key: this.formatConfigKey(key),
        value: this.formatConfigValue(key, value)
      }));
    } catch (error) {
      console.error('Error parsing configuration:', error);
      return [];
    }
  }

  private formatConfigKey(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
      .trim();
  }

  private formatConfigValue(key: string, value: any): string {
    if (value === null || value === undefined) {
      return 'Not set';
    }

    // Mask sensitive values
    const sensitiveKeys = ['password', 'secret', 'key', 'token', 'auth'];
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      return this.maskSensitiveValue(String(value));
    }

    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }

    return String(value);
  }

  private maskSensitiveValue(value: string): string {
    if (!value || value.length < 8) {
      return '••••••••';
    }
    return value.substring(0, 4) + '••••••••' + value.substring(value.length - 4);
  }

  formatHeaderValue(header: ToolHeader): string {
    if (!header.value) {
      return 'Not set';
    }

    // Mask sensitive headers
    const sensitiveHeaders = ['authorization', 'x-api-key', 'x-auth-token', 'cookie', 'set-cookie'];
    if (sensitiveHeaders.some(sensitive => header.name.toLowerCase().includes(sensitive))) {
      return this.maskSensitiveValue(header.value);
    }

    return header.value;
  }

  formatParameterValue(param: ToolParameter): string {
    if (param.default !== undefined && param.default !== null) {
      if (typeof param.default === 'object') {
        return JSON.stringify(param.default, null, 2);
      }
      return String(param.default);
    }

    return 'No default value';
  }
}
