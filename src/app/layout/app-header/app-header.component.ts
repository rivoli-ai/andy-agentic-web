import { Component, OnDestroy, OnInit, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { ThemeService } from '../../core/services/theme.service';
import { ApiStatusService, ApiStatus } from '../../core/services/api-status.service';

@Component({
  selector: 'app-app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.css'
})
export class AppHeaderComponent implements OnInit, OnDestroy {
  toggleSidebar = output<void>();

  pageTitle = 'Agentic';
  apiStatus: ApiStatus = {
    isOnline: false,
    lastCheck: new Date(),
    consecutiveFailures: 0,
    isMaintenanceMode: false
  };

  readonly themeService = inject(ThemeService);
  private readonly apiStatusService = inject(ApiStatusService);
  private readonly router = inject(Router);
  private sub = new Subscription();

  ngOnInit(): void {
    this.sub.add(
      this.apiStatusService.status$.subscribe(s => {
        this.apiStatus = s;
      })
    );
    this.sub.add(
      this.router.events
        .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
        .subscribe(() => this.updateTitle())
    );
    this.updateTitle();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  currentTheme(): 'light' | 'dark' {
    return this.themeService.getCurrentTheme();
  }

  private updateTitle(): void {
    const path = this.router.url.split('?')[0].split('#')[0];
    if (path.startsWith('/agents')) {
      this.pageTitle = 'Agents';
    } else if (path.startsWith('/tools')) {
      this.pageTitle = 'Tools';
    } else if (path.startsWith('/llm')) {
      this.pageTitle = 'LLM';
    } else if (path.startsWith('/chatbot')) {
      this.pageTitle = 'Chat';
    } else {
      this.pageTitle = 'Agentic';
    }
  }
}
