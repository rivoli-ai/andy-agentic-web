import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolExecution } from '../tool-execution-display/tool-execution-display.component';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-tool-execution-summary',
  templateUrl: './tool-execution-summary.component.html',
  styleUrls: ['./tool-execution-summary.component.css']
})
export class ToolExecutionSummaryComponent implements OnInit {
  @Input() toolExecutions: ToolExecution[] = [];
  @Input() isExpanded: boolean = false;

  ngOnInit(): void {
    // Component initialization
  }

  toggleExpanded(): void {
    this.isExpanded = !this.isExpanded;
  }

  getTotalExecutions(): number {
    return this.toolExecutions.length;
  }

  getSuccessfulExecutions(): number {
    return this.toolExecutions.filter(exec => exec.success).length;
  }

  getFailedExecutions(): number {
    return this.toolExecutions.filter(exec => !exec.success).length;
  }

  getSuccessRate(): number {
    if (this.toolExecutions.length === 0) return 0;
    return Math.round((this.getSuccessfulExecutions() / this.toolExecutions.length) * 100);
  }

  getTotalExecutionTime(): number {
    return this.toolExecutions
      .filter(exec => exec.executionTime)
      .reduce((total, exec) => total + (exec.executionTime || 0), 0);
  }

  getAverageExecutionTime(): number {
    const executionsWithTime = this.toolExecutions.filter(exec => exec.executionTime);
    if (executionsWithTime.length === 0) return 0;
    return Math.round(this.getTotalExecutionTime() / executionsWithTime.length);
  }

  getUniqueTools(): string[] {
    return [...new Set(this.toolExecutions.map(exec => exec.toolName))];
  }

  getToolUsageCount(toolName: string): number {
    return this.toolExecutions.filter(exec => exec.toolName === toolName).length;
  }

  getMostUsedTool(): string | null {
    if (this.toolExecutions.length === 0) return null;
    
    const toolCounts = this.getUniqueTools().map(tool => ({
      name: tool,
      count: this.getToolUsageCount(tool)
    }));
    
    return toolCounts.reduce((max, current) => 
      current.count > max.count ? current : max
    ).name;
  }

  getRecentExecutions(limit: number = 5): ToolExecution[] {
    return this.toolExecutions
      .sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime())
      .slice(0, limit);
  }

  getToolIcon(toolName: string): string {
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
}

