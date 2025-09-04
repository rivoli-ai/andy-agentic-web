import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MarkdownService {
  
  async parseMarkdown(text: string): Promise<string> {
    // ngx-markdown will handle the parsing and rendering
    // We just return the text as-is, and the component will use markdown directive
    return text;
  }

  detectCodeBlocks(text: string): { hasCode: boolean; language?: string } {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const match = codeBlockRegex.exec(text);
    
    if (match) {
      return {
        hasCode: true,
        language: match[1] || 'text'
      };
    }
    
    return { hasCode: false };
  }
}
