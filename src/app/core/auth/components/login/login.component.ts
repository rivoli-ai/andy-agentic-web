import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { filter, take, debounceTime } from 'rxjs/operators';
import { Subject, Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  standalone: false,
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, OnDestroy {
  isLoading = false;
  errorMessage = '';
  returnUrl = '';
  retryCount = 0;
  maxRetries = 3;
  
  private destroy$ = new Subject<void>();
  private authSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Get return url from route parameters or default to '/'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
    
    // Reset loading state in case user returned from redirect
    this.isLoading = false;
    this.errorMessage = '';
    this.retryCount = 0;
    
    // Check if user is already authenticated
    if (this.authService.isAuthenticated) {
      this.router.navigate([this.returnUrl]);
      return;
    }

    // Listen for authentication state changes
    this.authSubscription = this.authService.currentUser$
      .pipe(
        filter(user => user !== null),
        take(1),
        debounceTime(100) // Small delay to prevent race conditions
      )
      .subscribe(user => {
        if (user) {
          this.router.navigate([this.returnUrl]);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.authSubscription?.unsubscribe();
  }

  async onLogin(): Promise<void> {
    if (this.isLoading) return;

    this.isLoading = true;
    this.errorMessage = '';

    try {
      // Add a small delay to show the loading state
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // With redirect flow, the login method will redirect the user
      await this.authService.login();
      
      // Set a timeout to reset loading state in case redirect doesn't happen
      // This prevents the loading state from staying indefinitely
      setTimeout(() => {
        if (this.isLoading) {
          this.isLoading = false;
          this.errorMessage = 'Login is taking longer than expected. Please try again.';
          this.retryCount++;
        }
      }, 10000); // 10 second timeout
      
    } catch (error: any) {
      this.isLoading = false;
      this.retryCount++;
      
      // Provide more specific error messages
      if (error?.message?.includes('popup')) {
        this.errorMessage = 'Login popup was blocked. Please allow popups and try again.';
      } else if (error?.message?.includes('network')) {
        this.errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error?.message?.includes('timeout')) {
        this.errorMessage = 'Login timed out. Please try again.';
      } else {
        this.errorMessage = 'Login failed. Please try again.';
      }
      
      console.error('Login error:', error);
    }
  }

  onRetry(): void {
    if (this.retryCount < this.maxRetries) {
      this.onLogin();
    } else {
      this.errorMessage = 'Maximum retry attempts reached. Please refresh the page and try again.';
    }
  }

  onRefresh(): void {
    window.location.reload();
  }

  get canRetry(): boolean {
    return this.retryCount < this.maxRetries && !this.isLoading;
  }

  get showRetryMessage(): boolean {
    return this.retryCount >= this.maxRetries;
  }
}
