import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { ApiStatusService, ApiStatus } from '../../core/services/api-status.service';

@Component({
  selector: 'app-maintenance',
  templateUrl: './maintenance.component.html',
  styleUrls: ['./maintenance.component.css']
})
export class MaintenanceComponent implements OnInit, OnDestroy {
  isRetrying = false;
  retryCountdown = 30;
  lastCheckTime = new Date();
  apiStatus: ApiStatus = {
    isOnline: false,
    lastCheck: new Date(),
    consecutiveFailures: 0,
    isMaintenanceMode: true
  };
  
  private countdownSubscription?: Subscription;
  private retryInterval?: Subscription;

  constructor(
    private router: Router,
    private apiStatusService: ApiStatusService
  ) {}

  ngOnInit(): void {
    // Subscribe to API status changes
    this.apiStatusService.status$.subscribe(status => {
      this.apiStatus = status;
      this.lastCheckTime = status.lastCheck;
      
      // If API is back online, redirect to main app
      if (status.isOnline && !status.isMaintenanceMode) {
        this.router.navigate(['/agents']);
      }
    });
    
    this.startCountdown();
  }

  ngOnDestroy(): void {
    if (this.countdownSubscription) {
      this.countdownSubscription.unsubscribe();
    }
    if (this.retryInterval) {
      this.retryInterval.unsubscribe();
    }
  }

  startCountdown(): void {
    this.retryCountdown = 30;
    this.countdownSubscription = interval(1000).subscribe(() => {
      this.retryCountdown--;
      if (this.retryCountdown <= 0) {
        this.retryCountdown = 30;
        this.retryConnection();
      }
    });
  }

  retryConnection(): void {
    this.isRetrying = true;
    this.lastCheckTime = new Date();
    
    // Force API status check
    this.apiStatusService.forceRetry();
    
    // Reset retrying state after a delay
    setTimeout(() => {
      this.isRetrying = false;
      this.startCountdown();
    }, 2000);
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
