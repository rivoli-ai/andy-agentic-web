import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval, timer } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface ApiStatus {
  isOnline: boolean;
  lastCheck: Date;
  consecutiveFailures: number;
  isMaintenanceMode: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ApiStatusService {
  private statusSubject = new BehaviorSubject<ApiStatus>({
    isOnline: true,
    lastCheck: new Date(),
    consecutiveFailures: 0,
    isMaintenanceMode: false
  });

  public status$: Observable<ApiStatus> = this.statusSubject.asObservable();
  
  private checkInterval?: any;
  private readonly MAX_FAILURES = 3;
  private readonly CHECK_INTERVAL = 30000; // 30 seconds
  private readonly MAINTENANCE_REDIRECT_DELAY = 5000; // 5 seconds

  constructor(private router: Router) {
    // Start monitoring immediately
    this.startMonitoring();
  }

  private startMonitoring(): void {
    // Check immediately
    this.checkApiStatus();
    
    // Then check every 30 seconds
    this.checkInterval = setInterval(() => {
      this.checkApiStatus();
    }, this.CHECK_INTERVAL);
  }

  private async checkApiStatus(): Promise<void> {
    try {
      const response = await fetch(`${environment.apiUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000)
      });
      
      const isOnline = response.ok;
      const currentStatus = this.statusSubject.value;
      
      if (isOnline) {
        // API is back online
        this.statusSubject.next({
          isOnline: true,
          lastCheck: new Date(),
          consecutiveFailures: 0,
          isMaintenanceMode: false
        });
        
        // If we were in maintenance mode, redirect back to the app
        if (currentStatus.isMaintenanceMode) {
          this.router.navigate(['/agents']);
        }
      } else {
        this.handleApiFailure();
      }
    } catch (error) {
      console.warn('API connectivity check failed:', error);
      this.handleApiFailure();
    }
  }

  private handleApiFailure(): void {
    const currentStatus = this.statusSubject.value;
    const newFailures = currentStatus.consecutiveFailures + 1;
    
    this.statusSubject.next({
      isOnline: false,
      lastCheck: new Date(),
      consecutiveFailures: newFailures,
      isMaintenanceMode: currentStatus.isMaintenanceMode
    });

    // If we've had too many consecutive failures and we're not already in maintenance mode
    if (newFailures >= this.MAX_FAILURES && !currentStatus.isMaintenanceMode) {
      this.enterMaintenanceMode();
    }
  }

  private enterMaintenanceMode(): void {
    this.statusSubject.next({
      isOnline: false,
      lastCheck: new Date(),
      consecutiveFailures: this.statusSubject.value.consecutiveFailures,
      isMaintenanceMode: true
    });

    // Redirect to maintenance page after a short delay
    timer(this.MAINTENANCE_REDIRECT_DELAY).subscribe(() => {
      this.router.navigate(['/maintenance']);
    });
  }

  public forceRetry(): void {
    this.checkApiStatus();
  }

  public getCurrentStatus(): ApiStatus {
    return this.statusSubject.value;
  }

  public isApiOnline(): boolean {
    return this.statusSubject.value.isOnline;
  }

  public isInMaintenanceMode(): boolean {
    return this.statusSubject.value.isMaintenanceMode;
  }

  ngOnDestroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }
}
