import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ToolExecution {
  id: string;
  toolId: string;
  toolName: string;
  tool?: {
    id: string;
    name: string;
    type: string;
    description: string;
  };
  agentId?: string;
  sessionId?: string;
  parameters: Record<string, any>;
  result: any;
  success: boolean;
  errorMessage?: string;
  executedAt: Date;
  executionTime: number;
  usedParameters?: Record<string, any>;
}

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-tool-execution-display',
  templateUrl: './tool-execution-display.component.html',
  styleUrls: ['./tool-execution-display.component.css']
})
export class ToolExecutionDisplayComponent implements OnInit {
  @Input() toolExecution: ToolExecution | null = null;
  @Input() isExpanded: boolean = false;
  @Input() showTimestamp: boolean = true;
  @Input() compact: boolean = false;
  
  activeTab: 'parameters' | 'result' = 'parameters';

  ngOnInit(): void {
    // Component initialization
  }

  toggleExpanded(): void {
    this.isExpanded = !this.isExpanded;
  }

  formatParameters(parameters: Record<string, any>): string {
    if (!parameters || Object.keys(parameters).length === 0) {
      return 'No parameters';
    }
    
    return Object.entries(parameters)
      .map(([key, value]) => `${key}: ${this.formatValue(value)}`)
      .join('\n');
  }

  formatValue(value: any): string {
    if (value === null || value === undefined) {
      return 'null';
    }
    
    if (typeof value === 'string') {
      // First, try to decode Unicode escape sequences
      let decodedString = value;
      try {
        // Decode Unicode escape sequences like \u0022
        decodedString = value.replace(/\\u([0-9a-fA-F]{4})/g, (match, code) => {
          return String.fromCharCode(parseInt(code, 16));
        });
      } catch (e) {
        // If decoding fails, use original string
        decodedString = value;
      }
      
      // Try to parse as JSON if it looks like JSON
      if (decodedString.trim().startsWith('{') || decodedString.trim().startsWith('[')) {
        try {
          const parsed = JSON.parse(decodedString);
          return JSON.stringify(parsed, null, 2);
        } catch (e) {
          // If parsing fails, try to clean up the string
          const cleaned = this.cleanJsonString(decodedString);
          return cleaned !== decodedString ? cleaned : `"${decodedString}"`;
        }
      }
      return `"${decodedString}"`;
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    
    return String(value);
  }

  formatResult(result: any): string {
    if (result === null || result === undefined) {
      return 'No result';
    }
    
    if (typeof result === 'string') {
      // First, try to decode Unicode escape sequences
      let decodedString = result;
      try {
        // Decode Unicode escape sequences like \u0022
        decodedString = result.replace(/\\u([0-9a-fA-F]{4})/g, (match, code) => {
          return String.fromCharCode(parseInt(code, 16));
        });
      } catch (e) {
        // If decoding fails, use original string
        decodedString = result;
      }
      
      // Try to parse as JSON if it looks like JSON
      if (decodedString.trim().startsWith('{') || decodedString.trim().startsWith('[')) {
        try {
          const parsed = JSON.parse(decodedString);
          return JSON.stringify(parsed, null, 2);
        } catch (e) {
          // If parsing fails, try to clean up the string and return it
          const cleaned = this.cleanJsonString(decodedString);
          return cleaned;
        }
      }
      return decodedString;
    }
    
    if (typeof result === 'object') {
      return JSON.stringify(result, null, 2);
    }
    
    return String(result);
  }


  private cleanJsonString(jsonString: string): string {
    try {
      // Remove extra backslashes and clean up the string
      let cleaned = jsonString
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
        .replace(/\\r/g, '\r');
      
      // Try to parse again
      const parsed = JSON.parse(cleaned);
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      // If all else fails, return the cleaned string with proper line breaks
      return jsonString
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
        .replace(/\\r/g, '\r');
    }
  }

  getToolIcon(toolName: string): string {
    // Return appropriate icon based on tool name
    const toolLower = toolName.toLowerCase();
    
    if (toolLower.includes('apitool') || toolLower.includes('http')) {
      return '🌐';
    } else if (toolLower.includes('mcptool')) {
      return '🔗';
    } else if (toolLower.includes('file') || toolLower.includes('document')) {
      return '📄';
    } else if (toolLower.includes('search') || toolLower.includes('query')) {
      return '🔍';
    } else if (toolLower.includes('database') || toolLower.includes('db')) {
      return '🗄️';
    } else if (toolLower.includes('email') || toolLower.includes('mail')) {
      return '📧';
    } else if (toolLower.includes('calendar') || toolLower.includes('schedule')) {
      return '📅';
    } else if (toolLower.includes('weather')) {
      return '🌤️';
    } else if (toolLower.includes('translate') || toolLower.includes('language')) {
      return '🌍';
    } else {
      return '⚙️';
    }
  }

  getStatusColor(success: boolean): string {
    return success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300';
  }

  getStatusIcon(success: boolean): string {
    return success ? '✅' : '❌';
  }

  getToolTypeColor(toolType: string): string {
    const type = toolType.toLowerCase();
    
    switch (type) {
      case 'mcptool':
        return 'text-primary-700 dark:text-primary-300 bg-primary-100 dark:bg-primary-950/40';
      case 'apitool':
        return 'text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-950/35';
      case 'function':
        return 'text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-950/40';
      case 'http':
        return 'text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-950/35';
      case 'websocket':
        return 'text-cyan-700 dark:text-cyan-300 bg-cyan-100 dark:bg-cyan-950/35';
      case 'database':
        return 'text-primary-800 dark:text-primary-200 bg-primary-50 dark:bg-primary-950/30';
      case 'file':
        return 'text-pink-700 dark:text-pink-300 bg-pink-100 dark:bg-pink-950/35';
      case 'email':
        return 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/35';
      case 'sms':
        return 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/35';
      case 'webhook':
        return 'text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-950/35';
      default:
        return 'text-ink-secondary bg-surface-hover border border-line-light';
    }
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here
      console.log('Copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  }
}

