import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of, firstValueFrom } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { AppConfigService } from '../../config/app-config.service';
import { AuthProviderConfig, AuthConfigResponse } from '../oidc-config.loader';
import { authApiUrl } from '../auth-api-url';

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
  providedIn: 'root',
})
export class AuthService {
  private readonly tokenSignal = signal<string | null>(null);
  private readonly userSignal = signal<User | null>(null);
  readonly isAuthenticatedSignal = signal<boolean>(false);

  readonly loggedIn = computed(() => this.isAuthenticatedSignal() && this.tokenSignal() !== null);

  private readonly currentUserSubject = new BehaviorSubject<User | null>(null);
  readonly currentUser$ = this.currentUserSubject.asObservable();

  private readonly isLoggingOutSubject = new BehaviorSubject<boolean>(false);
  readonly isLoggingOut$ = this.isLoggingOutSubject.asObservable();

  private readonly isAuthLoadingSubject = new BehaviorSubject<boolean>(true);
  readonly isAuthLoading$ = this.isAuthLoadingSubject.asObservable();

  private readonly _providerConfigs = signal<AuthProviderConfig[]>([]);
  private _configLoaded = false;

  readonly providerConfigs = this._providerConfigs.asReadonly();
  readonly frontendOidcProviders = computed(() =>
    this._providerConfigs().filter(p => p.type === 'FrontendOidc')
  );
  readonly backendOAuthProviders = computed(() =>
    this._providerConfigs().filter(p => p.type === 'BackendOAuth')
  );
  readonly localProviders = computed(() => this._providerConfigs().filter(p => p.type === 'Local'));
  readonly isLocalEnabled = computed(() => this.localProviders().length > 0);

  constructor(
    private http: HttpClient,
    private router: Router,
    private appConfig: AppConfigService
  ) {
    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('auth_user');
    if (savedToken) {
      if (this.isJwtExpired(savedToken)) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      } else {
        this.tokenSignal.set(savedToken);
        this.isAuthenticatedSignal.set(true);
      }
    }
    if (savedUser && this.tokenSignal() !== null) {
      try {
        const parsed = JSON.parse(savedUser) as User;
        this.userSignal.set(parsed);
        this.currentUserSubject.next(parsed);
      } catch {
        /* ignore */
      }
    }
  }

  /** Called from APP_INITIALIZER after assets/config.json is loaded. */
  async initializeAfterConfigLoad(): Promise<void> {
    try {
      this.isAuthLoadingSubject.next(true);
      await this.loadProviderConfig(true);

      if (this.isLoggedIn()) {
        await this.syncUser();
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
    } finally {
      this.isAuthLoadingSubject.next(false);
    }
  }

  get isAuthenticated(): boolean {
    return this.loggedIn();
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getToken(): string | null {
    return this.tokenSignal();
  }

  isLoggedIn(): boolean {
    return this.loggedIn();
  }

  getAuthConfigUrl(): string {
    return authApiUrl(this.appConfig.apiUrl, '/auth/config');
  }

  private isJwtExpired(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return true;
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      const exp: unknown = payload?.exp;
      if (typeof exp !== 'number') return false;
      const skewSeconds = 5;
      return exp <= Math.floor(Date.now() / 1000) - skewSeconds;
    } catch {
      return true;
    }
  }

  clearSession(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    this.isAuthenticatedSignal.set(false);
    this.currentUserSubject.next(null);
  }

  async logout(): Promise<void> {
    this.isLoggingOutSubject.next(true);
    this.clearSession();
    this.isLoggingOutSubject.next(false);
    await this.router.navigate(['/login'], { replaceUrl: true });
  }

  resetLogoutState(): void {
    this.isLoggingOutSubject.next(false);
  }

  resetAuthLoadingState(): void {
    this.isAuthLoadingSubject.next(false);
  }

  async loadProviderConfig(force = false): Promise<AuthProviderConfig[]> {
    if (this._configLoaded && !force) return this._providerConfigs();

    const url = authApiUrl(this.appConfig.apiUrl, '/auth/config');
    try {
      // Use fetch so bootstrap is not blocked by AuthInterceptor ↔ AuthService circular DI.
      const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} loading ${url}`);
      }
      const data = (await response.json()) as AuthConfigResponse;
      const providers = Array.isArray(data?.providers) ? data.providers : [];
      this._providerConfigs.set(providers);
      this._configLoaded = true;
      return providers;
    } catch (err) {
      console.error('Failed to load auth provider config from', url, err);
      this._configLoaded = false;
      return [];
    }
  }

  getProviderConfig(name: string): AuthProviderConfig | undefined {
    return this._providerConfigs().find(p => p.name.toLowerCase() === name.toLowerCase());
  }

  handleOidcTokenLogin(
    provider: string,
    idToken: string,
    accessToken?: string
  ): Observable<{ token: string; user?: unknown }> {
    return this.http
      .post<{ token: string; user?: unknown }>(
        authApiUrl(this.appConfig.apiUrl, `/auth/${provider}/token`),
        {
          idToken,
          accessToken,
        }
      )
      .pipe(
        tap(response => this.setAuthState(response)),
        tap(() => void this.syncUser())
      );
  }

  async ensureUserLoaded(): Promise<void> {
    if (this.isLoggedIn() && !this.currentUser) {
      await this.syncUser();
    }
  }

  getUser(): Observable<User | null> {
    return this.http.get<AuthResponse>(`${this.appConfig.apiUrl}/auth/me`).pipe(
      map(response => response.user ?? null),
      tap(user => {
        this.currentUserSubject.next(user);
        if (user) localStorage.setItem('auth_user', JSON.stringify(user));
      }),
      catchError(() => {
        this.currentUserSubject.next(null);
        return of(null);
      })
    );
  }

  getAuthStatus(): Observable<AuthResponse> {
    return this.http.get<AuthResponse>(`${this.appConfig.apiUrl}/auth/status`);
  }

  extractRoles(token: string | null = this.getToken()): string[] {
    if (!token) return [];
    try {
      const parts = token.split('.');
      if (parts.length < 2) return [];
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      const candidates = [
        payload?.['role'],
        payload?.['roles'],
        payload?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'],
      ];
      const roles: string[] = [];
      for (const c of candidates) {
        if (Array.isArray(c)) roles.push(...c.filter((x: unknown) => typeof x === 'string'));
        else if (typeof c === 'string') roles.push(c);
      }
      return roles;
    } catch {
      return [];
    }
  }

  private async syncUser(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.post<AuthResponse>(`${this.appConfig.apiUrl}/auth/sync`, {})
      );
      if (response?.user) {
        this.userSignal.set(response.user);
        this.currentUserSubject.next(response.user);
        localStorage.setItem('auth_user', JSON.stringify(response.user));
      }
    } catch (error) {
      console.error('User sync failed:', error);
    }
  }

  private setAuthState(response: { token: string; user?: unknown }): void {
    this.tokenSignal.set(response.token);
    this.isAuthenticatedSignal.set(true);
    localStorage.setItem('auth_token', response.token);
    if (response.user) {
      localStorage.setItem('auth_user', JSON.stringify(response.user));
    }
  }
}
