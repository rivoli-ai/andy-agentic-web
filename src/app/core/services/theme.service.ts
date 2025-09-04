import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Theme } from '../../models/theme.model';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private currentThemeSubject = new BehaviorSubject<Theme>('light');
  public currentTheme$: Observable<Theme> = this.currentThemeSubject.asObservable();
  private currentThemeLink: HTMLLinkElement | null = null;
  private autoThemeEnabled = false;

  constructor() {
    this.initializeTheme();
  }

  private initializeTheme(): void {
    // Check localStorage for saved theme
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      this.setTheme(savedTheme);
    } else {
      // Check system preference
      this.checkSystemTheme();
    }

    // Listen for system theme changes
    this.listenForSystemThemeChanges();
  }

  private checkSystemTheme(): void {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this.setTheme('dark');
    } else {
      this.setTheme('light');
    }
  }

  private listenForSystemThemeChanges(): void {
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', (e) => {
        if (this.autoThemeEnabled) {
          this.setTheme(e.matches ? 'dark' : 'light');
        }
      });
    }
  }

  setTheme(theme: Theme): void {
    this.currentThemeSubject.next(theme);
    this.applyTheme(theme);
    localStorage.setItem('theme', theme);
  }

  toggleTheme(): void {
    const currentTheme = this.currentThemeSubject.value;
    const newTheme: Theme = currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  enableAutoTheme(): void {
    this.autoThemeEnabled = true;
    localStorage.setItem('autoTheme', 'true');
    this.checkSystemTheme();
  }

  disableAutoTheme(): void {
    this.autoThemeEnabled = false;
    localStorage.setItem('autoTheme', 'false');
  }

  private applyTheme(theme: Theme): void {
    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark');

    } else {
      root.classList.remove('dark');
      this.setPrismTheme('assets/prism.css');
    }
    this.setPrismTheme(theme);

  }

  getCurrentTheme(): Theme {
    return this.currentThemeSubject.value;
  }

  isAutoThemeEnabled(): boolean {
    return this.autoThemeEnabled;
  }


  setPrismTheme(themeName: string): void {
    const linkId = 'prism-theme';
    let link = document.getElementById(linkId) as HTMLLinkElement;
    
    if (link) {
      link.remove();
    }
    
    link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = themeName === 'dark' 
      ? 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-okaidia.min.css'
      : 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css';
    
    document.head.appendChild(link);
  }
}
