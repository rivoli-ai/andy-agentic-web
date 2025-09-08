import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-logout',
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 dark:from-gray-900 dark:via-purple-900 dark:to-gray-900 flex items-center justify-center p-4 relative overflow-hidden">
      <!-- Animated Background Elements -->
      <div class="absolute inset-0 overflow-hidden">
        <div class="absolute -top-40 -right-40 w-80 h-80 bg-red-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500/20 rounded-full blur-3xl animate-pulse" style="animation-delay: 1s;"></div>
      </div>
      
      <!-- Main Content -->
      <div class="relative z-10 w-full max-w-md text-center">
        <!-- Logo -->
        <div class="mb-8">
          <div class="mx-auto w-20 h-20 bg-gradient-to-br from-red-500 to-orange-600 rounded-3xl flex items-center justify-center shadow-2xl mb-6 relative group">
            <div class="absolute inset-0 bg-gradient-to-br from-red-400 to-orange-500 rounded-3xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
            <svg class="w-10 h-10 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
            </svg>
          </div>
        </div>

        <!-- Logout Card -->
        <div class="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-10 relative overflow-hidden">
          <div class="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-3xl"></div>
          
          <div class="relative z-10">
            <h2 class="text-3xl font-bold text-white mb-4">Signing Out</h2>
            <p class="text-slate-300 text-lg mb-8">Please wait while we securely sign you out of your account.</p>
            
            <!-- Progress Indicator -->
            <div class="mb-8">
              <div class="w-full bg-gray-200/20 rounded-full h-2 mb-4">
                <div 
                  class="bg-gradient-to-r from-red-500 to-orange-600 h-2 rounded-full transition-all duration-500 ease-out"
                  [style.width.%]="progress"
                ></div>
              </div>
              <p class="text-sm text-slate-400">{{ currentMessage }}</p>
            </div>
            
            <!-- Error Message -->
            <div *ngIf="errorMessage" class="mb-6 bg-red-500/20 border border-red-500/40 text-red-200 px-6 py-4 rounded-2xl backdrop-blur-sm">
              <div class="flex items-center">
                <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
                </svg>
                {{ errorMessage }}
              </div>
            </div>
            
            <!-- Retry Button -->
            <button
              *ngIf="errorMessage"
              (click)="retryLogout()"
              class="w-full px-6 py-3 bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-200 font-medium rounded-xl transition-colors duration-200"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class LogoutComponent implements OnInit, OnDestroy {
  progress = 0;
  currentMessage = 'Clearing session data...';
  errorMessage = '';
  
  private destroy$ = new Subject<void>();
  private progressInterval?: number;
  private messages = [
    'Clearing session data...',
    'Signing out from Microsoft...',
    'Cleaning up resources...',
    'Redirecting to login...'
  ];
  private currentMessageIndex = 0;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.startLogout();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopProgress();
  }

  private async startLogout(): Promise<void> {
    this.startProgress();
    
    try {
      await this.authService.logout();
      // Progress will complete and redirect will happen
    } catch (error) {
      console.error('Logout error:', error);
      this.errorMessage = 'Logout failed. Please try again.';
      this.stopProgress();
    }
  }

  async retryLogout(): Promise<void> {
    this.errorMessage = '';
    this.progress = 0;
    this.currentMessageIndex = 0;
    this.currentMessage = this.messages[0];
    await this.startLogout();
  }

  private startProgress(): void {
    this.stopProgress();
    
    this.progressInterval = window.setInterval(() => {
      if (this.progress < 100) {
        this.progress += Math.random() * 20;
        if (this.progress > 100) this.progress = 100;
        
        // Update message based on progress
        const messageProgress = this.progress / 100;
        const newMessageIndex = Math.min(
          Math.floor(messageProgress * this.messages.length),
          this.messages.length - 1
        );
        
        if (newMessageIndex !== this.currentMessageIndex) {
          this.currentMessageIndex = newMessageIndex;
          this.currentMessage = this.messages[this.currentMessageIndex];
        }
        
        // Complete and redirect
        if (this.progress >= 100) {
          this.stopProgress();
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 500);
        }
      }
    }, 200);
  }

  private stopProgress(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = undefined;
    }
  }
}

