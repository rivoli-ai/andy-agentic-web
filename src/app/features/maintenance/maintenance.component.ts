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
    });
    
  }

  ngOnDestroy(): void {
    if (this.countdownSubscription) {
      this.countdownSubscription.unsubscribe();
    }
    if (this.retryInterval) {
      this.retryInterval.unsubscribe();
    }
  }


  retryConnection(): void {
    this.isRetrying = true;
    this.lastCheckTime = new Date();
    
    // Force API status check
    this.apiStatusService.forceRetry();
    
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
