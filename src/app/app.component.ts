import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ThemeService } from './core/services/theme.service';
import { Theme } from './models/theme.model';

// Prism.js imports will be added later when needed

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Agentic';
  currentTheme: Theme = 'light';
  isSidebarOpen = true;
  isSidebarCollapsed = false;
  isMobile = false;
  isChatbotRoute = false;
  isUserMenuOpen = false;

  constructor(
    private themeService: ThemeService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.themeService.currentTheme$.subscribe(theme => {
      this.currentTheme = theme;
    });

    // Listen to route changes to detect chatbot route
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event) => {
      const navigationEvent = event as NavigationEnd;
      this.isChatbotRoute = navigationEvent.urlAfterRedirects === '/chatbot' || navigationEvent.urlAfterRedirects.startsWith('/chatbot?');
    });

    this.checkScreenSize();
    
    // Debounce resize events to avoid excessive calls
    let resizeTimeout: any;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => this.checkScreenSize(), 150);
    });
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  toggleSidebarCollapse(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  private checkScreenSize(): void {
    this.isMobile = window.innerWidth < 768;
    if (this.isMobile) {
      this.isSidebarOpen = false;
    }
  }

  onSidebarItemClick(): void {
    if (this.isMobile) {
      this.isSidebarOpen = false;
    }
  }

  logout(): void {
    // TODO: Implement logout logic
    console.log('Logout clicked');
    // You can add your logout logic here:
    // - Clear authentication tokens
    // - Redirect to login page
    // - Clear user data from storage
    // - etc.
  }
}
