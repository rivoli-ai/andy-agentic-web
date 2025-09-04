import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MCPServer, MCPAuthentication } from '../../models/mcp.model';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-mcp',
  templateUrl: './mcp.component.html',
  styleUrls: ['./mcp.component.css']
})
export class MCPComponent implements OnInit, OnDestroy {
  mcpServers: MCPServer[] = [];
  filteredServers: MCPServer[] = [];
  
  searchQuery = '';
  selectedStatus = '';
  
  private subscription = new Subscription();

  constructor(
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadMCPServers();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private loadMCPServers(): void {
    // Mock data for now
    this.mcpServers = [
      {
        id: '1',
        name: 'Claude MCP Server',
        description: 'Anthropic Claude integration via MCP',
        host: 'localhost',
        port: 3001,
        isActive: true,
        authentication: {
          type: 'api_key',
          apiKey: 'sk-ant-...',
          headers: { 'Authorization': 'Bearer ${apiKey}' }
        },
        capabilities: ['text-generation', 'file-access', 'web-search'],
        lastConnected: new Date('2024-01-15T10:30:00'),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15')
      },
      {
        id: '2',
        name: 'Local File Server',
        description: 'Local file system access via MCP',
        host: 'localhost',
        port: 3002,
        isActive: true,
        authentication: {
          type: 'none',
          apiKey: '',
          headers: {}
        },
        capabilities: ['file-access', 'file-system'],
        lastConnected: new Date('2024-01-15T09:15:00'),
        createdAt: new Date('2024-01-05'),
        updatedAt: new Date('2024-01-10')
      },
      {
        id: '3',
        name: 'Database MCP Server',
        description: 'Database access and querying via MCP',
        host: 'localhost',
        port: 3003,
        isActive: false,
        authentication: {
          type: 'basic',
          username: 'admin',
          password: '****',
          headers: {}
        },
        capabilities: ['database-access', 'query-execution'],
        lastConnected: new Date('2024-01-12T14:20:00'),
        createdAt: new Date('2024-01-08'),
        updatedAt: new Date('2024-01-12')
      }
    ];
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onStatusFilterChange(): void {
    this.applyFilters();
  }

  private applyFilters(): void {
    let filtered = [...this.mcpServers];

    // Search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(server =>
        server.name.toLowerCase().includes(query) ||
        server.description.toLowerCase().includes(query) ||
        server.host.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (this.selectedStatus !== '') {
      const isActive = this.selectedStatus === 'true';
      filtered = filtered.filter(server => server.isActive === isActive);
    }

    this.filteredServers = filtered;
  }

  createNewMCPServer(): void {
    this.router.navigate(['/mcp/new']);
  }

  viewMCPServer(id: string): void {
    this.router.navigate(['/mcp', id]);
  }

  editMCPServer(id: string, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/mcp', id, 'edit']);
  }

  deleteMCPServer(id: string, event: Event): void {
    event.stopPropagation();
    
    if (confirm('Are you sure you want to delete this MCP server? This action cannot be undone.')) {
      this.mcpServers = this.mcpServers.filter(server => server.id !== id);
      this.applyFilters();
      this.notificationService.success(
        'MCP Server Deleted',
        'The MCP server has been successfully deleted.'
      );
    }
  }

  toggleServerStatus(id: string, event: Event): void {
    event.stopPropagation();
    const server = this.mcpServers.find(s => s.id === id);
    if (server) {
      server.isActive = !server.isActive;
      this.notificationService.success(
        'Server Updated',
        `MCP server ${server.isActive ? 'activated' : 'deactivated'} successfully.`
      );
    }
  }

  testConnection(id: string, event: Event): void {
    event.stopPropagation();
    
    this.notificationService.info(
      'Testing Connection',
      'Testing MCP server connection...'
    );

    // Simulate connection testing
    setTimeout(() => {
      this.notificationService.success(
        'Test Complete',
        'MCP server connection test successful!'
      );
    }, 2000);
  }

  connectToServer(id: string, event: Event): void {
    event.stopPropagation();
    
    const server = this.mcpServers.find(s => s.id === id);
    if (server) {
      this.notificationService.info(
        'Connecting',
        `Connecting to ${server.name}...`
      );

      // Simulate connection
      setTimeout(() => {
        server.lastConnected = new Date();
        this.notificationService.success(
          'Connected',
          `Successfully connected to ${server.name}`
        );
      }, 1500);
    }
  }

  getStatusClasses(isActive: boolean): string {
    return isActive
      ? 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200'
      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  }

  getAuthTypeClasses(type: string): string {
    switch (type) {
      case 'api_key':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'basic':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'none':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  }

  getConnectionStatus(server: MCPServer): string {
    if (!server.isActive) return 'Inactive';
    
    const now = new Date();
    const lastConnected = new Date(server.lastConnected);
    const diffHours = (now.getTime() - lastConnected.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 1) return 'Connected';
    if (diffHours < 24) return 'Recent';
    return 'Stale';
  }

  getConnectionStatusClasses(server: MCPServer): string {
    if (!server.isActive) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    
    const now = new Date();
    const lastConnected = new Date(server.lastConnected);
    const diffHours = (now.getTime() - lastConnected.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 1) return 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200';
    if (diffHours < 24) return 'bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-200';
    return 'bg-error-100 text-error-800 dark:bg-error-900 dark:text-error-200';
  }
}
