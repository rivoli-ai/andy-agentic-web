import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService, User } from '../../services/auth.service';

@Component({
  standalone: false,
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.css']
})
export class UserProfileComponent implements OnInit {
  currentUser$: Observable<User | null>;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit(): void {}

  async onLogout(): Promise<void> {
    try {
      await this.authService.logout();
      // No need to navigate as logout redirect will handle it
    } catch (error) {
      console.error('Logout error:', error);
      // Reset logout state on error
      this.authService.resetLogoutState();
    }
  }
}
