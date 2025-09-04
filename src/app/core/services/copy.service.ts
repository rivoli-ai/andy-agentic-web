import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CopyService {

  constructor() { }

  async copyToClipboard(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        // Utilise l'API Clipboard moderne
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        // Fallback pour les navigateurs plus anciens
        return this.fallbackCopyTextToClipboard(text);
      }
    } catch (err) {
      console.error('Erreur lors de la copie:', err);
      return this.fallbackCopyTextToClipboard(text);
    }
  }

  private fallbackCopyTextToClipboard(text: string): boolean {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      console.error('Erreur lors de la copie fallback:', err);
      return false;
    }
  }
}

