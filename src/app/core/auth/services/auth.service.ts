import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { MsalService } from '@azure/msal-angular';
import { AppConfigService } from '../../config/app-config.service';

export interface User {
  id: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  department?: string;
  createdAt: string;
  lastLogin: string;
  isActive: boolean;
}

export interface AuthResponse {
  isAuthenticated: boolean;
  user?: User;
  token?: string;
  expiresAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private isLoggingOutSubject = new BehaviorSubject<boolean>(false);
  public isLoggingOut$ = this.isLoggingOutSubject.asObservable();
  
  private isAuthLoadingSubject = new BehaviorSubject<boolean>(true);
  public isAuthLoading$ = this.isAuthLoadingSubject.asObservable();
  constructor(
    private http: HttpClient,
    private msalService: MsalService,
    private appConfig: AppConfigService
  ) {
    // Initialize MSAL and check authentication status
    this.initializeAuth().catch(error => {
      console.error('Auth initialization failed:', error);
    });
  }


  /**
   * Initialize MSAL and check authentication status
   */
  private async initializeAuth(): Promise<void> {
    try {
      // Set loading state
      this.isAuthLoadingSubject.next(true);
      
      // Initialize MSAL if not already initialized
      await this.msalService.initialize();
      
      // Handle redirect callbacks first
      await this.handleRedirectCallback();
      
      // Set active account if one exists
      const allAccounts = this.msalService.instance.getAllAccounts();
      if (allAccounts.length > 0) {
        console.log('AuthService: Setting active account from existing accounts');
        this.msalService.instance.setActiveAccount(allAccounts[0]);
      }
      
      // Check if user is already authenticated
      await this.checkAuthStatus();
      
      // Only set loading to false after authentication check is complete
      this.isAuthLoadingSubject.next(false);
    } catch (error) {
      console.error('MSAL initialization failed:', error);
      // Set loading to false on error
      this.isAuthLoadingSubject.next(false);
    }
  }

  /**
   * Check if user is currently authenticated
   */
  get isAuthenticated(): boolean {
    try {
      const account = this.msalService.instance.getActiveAccount();
      const hasAccount = account !== null;
      console.log('AuthService: isAuthenticated check - account:', account, 'hasAccount:', hasAccount);
      return hasAccount;
    } catch (error) {
      console.error('Error checking authentication status:', error);
      return false;
    }
  }

  /**
   * Get current user
   */
  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Login with Microsoft Entra using redirect flow
   */
  async login(): Promise<void> {
    try {
      // Ensure MSAL is initialized before attempting login
      await this.msalService.initialize();
      
      const loginRequest = {
        scopes: ['User.Read'],
        prompt: 'select_account'
      };

      // Use redirect instead of popup
      this.msalService.loginRedirect(loginRequest);
    } catch (error) {
      console.error('Login redirect error:', error);
      throw error;
    }
  }

  /**
   * Logout from Microsoft Entra using redirect flow
   */
  async logout(): Promise<void> {
    try {
      // Set logging out state immediately
      this.isLoggingOutSubject.next(true);
      
      // Ensure MSAL is initialized before attempting logout
      await this.msalService.initialize();
      
      // Use redirect instead of popup
      this.msalService.logoutRedirect({
        postLogoutRedirectUri: window.location.origin
      });
      
      // Clear local state immediately
      this.currentUserSubject.next(null);
    } catch (error) {
      console.error('Logout redirect failed:', error);
      // Reset logging out state on error
      this.isLoggingOutSubject.next(false);
      throw error;
    }
  }

  /**
   * Get user information from backend
   */
  getUser(): Observable<User | null> {
    return this.http.get<AuthResponse>(`${this.appConfig.apiUrl}/auth/me`).pipe(
      map(response => response.user || null),
      tap(user => this.currentUserSubject.next(user)),
      catchError(() => {
        this.currentUserSubject.next(null);
        return of(null);
      })
    );
  }

  /**
   * Reset logout state (useful for error handling)
   */
  resetLogoutState(): void {
    this.isLoggingOutSubject.next(false);
  }

  /**
   * Reset authentication loading state (useful for error handling)
   */
  resetAuthLoadingState(): void {
    this.isAuthLoadingSubject.next(false);
  }

  /**
   * Sync user with backend after login
   */
  private async syncUser(): Promise<void> {
    try {
      console.log('AuthService: Syncing user with backend');
      
      // Get the access token manually to ensure it's available
      const token = await this.getAccessToken();
      console.log('AuthService: Token for sync:', token ? 'Available' : 'Not available');
      
      const response = await this.http.post<AuthResponse>(`${this.appConfig.apiUrl}/auth/sync`, {}).toPromise();
      
      if (response?.user) {
        console.log('AuthService: User sync successful:', response.user);
        this.currentUserSubject.next(response.user);
      }
    } catch (error) {
      console.error('AuthService: User sync failed:', error);
      // Even if sync fails, we can still proceed with the login
    }
  }

  /**
   * Check authentication status
   */
  private async checkAuthStatus(): Promise<void> {
    try {
      // Ensure MSAL is initialized before checking auth status
      await this.msalService.initialize();
      
      console.log('AuthService: Checking authentication status');
      const account = this.msalService.instance.getActiveAccount();
      console.log('AuthService: Active account:', account);
      
      if (account) {
        console.log('AuthService: User is authenticated, syncing with backend');
        await this.syncUser();
        console.log('AuthService: User sync completed');
      } else {
        console.log('AuthService: No active account found');
        this.currentUserSubject.next(null);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      this.currentUserSubject.next(null);
    }
  }

  /**
   * Get authentication status
   */
  getAuthStatus(): Observable<AuthResponse> {
    return this.http.get<AuthResponse>(`${this.appConfig.apiUrl}/auth/status`);
  }

  /**
   * Get access token for API calls
   */
  async getAccessToken(): Promise<string | null> {
    try {
      const account = this.msalService.instance.getActiveAccount();
      if (!account) return null;

      const tokenRequest = {
        scopes: ['User.Read'],
        account: account
      };

      const response = await this.msalService.acquireTokenSilent(tokenRequest).toPromise();
      return response?.accessToken || null;
    } catch (error) {
      console.error('Failed to get access token:', error);
      return null;
    }
  }

  /**
   * Handle redirect callback after authentication
   */
  async handleRedirectCallback(): Promise<void> {
    try {
      // Don't set loading state here as it's managed by the caller
      const result = await this.msalService.handleRedirectObservable().toPromise();
      
      if (result && result.account) {
        console.log('AuthService: Redirect callback successful, setting active account');
        this.msalService.instance.setActiveAccount(result.account);
        await this.syncUser();
        console.log('AuthService: User sync completed after redirect');
      } else {
        console.log('AuthService: No result from redirect callback, checking existing accounts');
        // Check if we have existing accounts after redirect
        const accounts = this.msalService.instance.getAllAccounts();
        if (accounts.length > 0) {
          console.log('AuthService: Found existing accounts after redirect, setting active account');
          this.msalService.instance.setActiveAccount(accounts[0]);
          await this.syncUser();
          console.log('AuthService: User sync completed after redirect');
        }
      }
    } catch (error) {
      console.error('Redirect callback handling failed:', error);
    }
  }

  /**
   * Ensure user is loaded if authenticated
   */
  async ensureUserLoaded(): Promise<void> {
    if (this.isAuthenticated && !this.currentUser) {
      try {
        await this.syncUser();
      } catch (error) {
        console.error('Failed to load user:', error);
      }
    }
  }
}
