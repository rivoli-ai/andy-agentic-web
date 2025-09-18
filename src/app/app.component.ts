import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ThemeService } from './core/services/theme.service';
import { AuthService, User } from './core/auth/services/auth.service';
import { ApiStatusService, ApiStatus } from './core/services/api-status.service';
import { environment } from '../environments/environment';
import { Theme } from './models/theme.model';

// Prism.js imports will be added later when needed

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Agentic';
  currentTheme: Theme = 'light';
  isSidebarOpen = true;
  isSidebarCollapsed = false;
  isMobile = false;
  isChatbotRoute = false;
  isUserMenuOpen = false;
  currentUser: User | null = null;
  isAuthenticated = false;
  isLoggingOut = false;
  isAuthLoading = true;
  
  // Navbar functionality
  searchQuery = '';
  hasNotifications = false;
  isNotificationsOpen = false;
  isQuickActionsOpen = false;
  
  // API connectivity
  apiStatus: ApiStatus = {
    isOnline: false, // Start as offline until initialization completes
    lastCheck: new Date(),
    consecutiveFailures: 0,
    isMaintenanceMode: false
  };
  
  // Track initialization state
  private isInitializing = true;
  
  // Loading progress states
  authProgress = 0;
  authSteps = [
    'Initializing authentication',
    'Checking API connectivity',
    'Verifying user credentials',
    'Loading user profile',
    'Setting up workspace'
  ];
  authCurrentStep = 0;
  
  logoutProgress = 0;
  logoutSteps = [
    'Clearing session data',
    'Signing out from Microsoft',
    'Cleaning up resources',
    'Redirecting to login'
  ];
  logoutCurrentStep = 0;
  
  private progressInterval?: number;

  constructor(
    private themeService: ThemeService,
    private authService: AuthService,
    private apiStatusService: ApiStatusService,
    private router: Router
  ) {
    // Apply theme immediately to prevent FOUC
    this.themeService.setTheme(this.themeService.getCurrentTheme());
  }

  ngOnInit(): void {
    // Start initialization process
    this.initializeApp();

    // Subscribe to theme changes
    this.themeService.currentTheme$.subscribe((theme: Theme) => {
      this.currentTheme = theme;
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        this.isNotificationsOpen = false;
        this.isQuickActionsOpen = false;
      }
    });

    // Subscribe to API status changes
    this.apiStatusService.status$.subscribe(status => {
      // Only update API status after initialization is complete
      if (!this.isInitializing) {
        this.apiStatus = status;
        
      }
    });

    // Subscribe to authentication changes
    this.authService.currentUser$.subscribe(user => {
      console.log('AppComponent: User state changed:', user);
      this.currentUser = user;
      this.isAuthenticated = !!user;
      console.log('AppComponent: isAuthenticated set to:', this.isAuthenticated);
    });

    // Subscribe to logout state
    this.authService.isLoggingOut$.subscribe(isLoggingOut => {
      this.isLoggingOut = isLoggingOut;
      if (isLoggingOut) {
        this.startLogoutProgress();
      } else {
        this.stopProgress();
      }
    });

    // Subscribe to authentication loading state
    this.authService.isAuthLoading$.subscribe(isAuthLoading => {
      this.isAuthLoading = isAuthLoading;
      if (isAuthLoading) {
        this.startAuthProgress();
      } else {
        this.stopProgress();
      }
    });

    // Redirect callbacks are handled automatically by the auth service initialization
    // No need to call handleRedirectCallback separately

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

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  toggleSidebarCollapse(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  // Navbar functionality methods
  onSearchChange(): void {
    // Implement search functionality
    console.log('Search query:', this.searchQuery);
    // You can emit this to a service or handle search logic here
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.onSearchChange();
  }

  toggleNotifications(): void {
    this.isNotificationsOpen = !this.isNotificationsOpen;
    this.isQuickActionsOpen = false; // Close other menus
  }

  toggleQuickActions(): void {
    this.isQuickActionsOpen = !this.isQuickActionsOpen;
    this.isNotificationsOpen = false; // Close other menus
  }

  // App initialization
  private async initializeApp(): Promise<void> {
    try {
      // Step 1: Initialize authentication
      this.updateAuthProgress(0);
      await this.delay(500); // Simulate initialization time

      // Step 2: Check API connectivity
      this.updateAuthProgress(1);
      const isApiHealthy = await this.checkInitialApiHealth();
      
      // Update API status based on health check result
      this.apiStatus = {
        isOnline: isApiHealthy,
        lastCheck: new Date(),
        consecutiveFailures: isApiHealthy ? 0 : 1,
        isMaintenanceMode: false
      };
      
      if (!isApiHealthy) {
        // If API is not healthy, show error
        this.isInitializing = false;
        return;
      }


      // Step 3: Continue with authentication
      this.updateAuthProgress(2);
      await this.delay(300);


      // Step 4: Load user profile
      this.updateAuthProgress(3);
      await this.delay(200);


      // Step 5: Setup workspace
      this.updateAuthProgress(4);
      await this.delay(200);


      // Complete initialization
      this.updateAuthProgress(100);
      
      // Mark initialization as complete - now API status service can take over
      this.isInitializing = false;
      
    } catch (error) {
      console.error('App initialization failed:', error);
      // On error, mark initialization as complete
      this.isInitializing = false;
    }
  }

  private updateAuthProgress(step: number): void {
    this.authCurrentStep = step;
    this.authProgress = (step / (this.authSteps.length - 1)) * 100;
  }

  private async checkInitialApiHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${environment.apiUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch (error) {
      console.warn('Initial API health check failed:', error);
      return false;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // API status methods
  retryApiConnection(): void {
    this.apiStatusService.forceRetry();
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

  async logout(): Promise<void> {
    try {
      await this.authService.logout();
      // No need to navigate to login as logout redirect will handle it
    } catch (error) {
      console.error('Logout error:', error);
      // Reset logout state on error
      this.authService.resetLogoutState();
    }
  }

  ngOnDestroy(): void {
    this.stopProgress();
  }

  private startAuthProgress(): void {
    this.stopProgress();
    this.authProgress = 0;
    this.authCurrentStep = 0;
    
    this.progressInterval = window.setInterval(() => {
      if (this.authProgress < 100) {
        const increment = Math.random() * 15; // Random increment for realistic progress
        this.authProgress = Math.min(this.authProgress + increment, 100);
        
        // Update current step based on progress
        const stepProgress = this.authProgress / 100;
        this.authCurrentStep = Math.min(
          Math.floor(stepProgress * this.authSteps.length),
          this.authSteps.length - 1
        );
      }
    }, 200);
  }

  private startLogoutProgress(): void {
    this.stopProgress();
    this.logoutProgress = 0;
    this.logoutCurrentStep = 0;
    
    this.progressInterval = window.setInterval(() => {
      if (this.logoutProgress < 100) {
        const increment = Math.random() * 20; // Faster progress for logout
        this.logoutProgress = Math.min(this.logoutProgress + increment, 100);
        
        // Update current step based on progress
        const stepProgress = this.logoutProgress / 100;
        this.logoutCurrentStep = Math.min(
          Math.floor(stepProgress * this.logoutSteps.length),
          this.logoutSteps.length - 1
        );
      }
    }, 150);
  }

  private stopProgress(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = undefined;
    }
  }


}
