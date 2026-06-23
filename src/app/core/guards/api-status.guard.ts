import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { ApiStatusService } from '../services/api-status.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ApiStatusGuard implements CanActivate {
  constructor(
    private apiStatusService: ApiStatusService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return this.apiStatusService.status$.pipe(
      map(status => {
        // If API is down and in maintenance mode, redirect to maintenance page
        if (status.isMaintenanceMode && !status.isOnline) {
          this.router.navigate(['/maintenance']);
          return false;
        }
        
        // Allow access if API is online or not in maintenance mode
        return true;
      })
    );
  }
}
