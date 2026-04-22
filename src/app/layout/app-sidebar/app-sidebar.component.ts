import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService, User } from '../../core/auth/services/auth.service';

@Component({
  selector: 'app-app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './app-sidebar.component.html',
  styleUrl: './app-sidebar.component.css'
})
export class AppSidebarComponent {
  isCollapsed = input(false);
  mobileOpen = input(false);

  collapseToggled = output<void>();
  mobileDrawerClose = output<void>();

  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  onToggleCollapse(): void {
    this.collapseToggled.emit();
  }

  onMobileNavLinkClick(): void {
    if (this.mobileOpen()) {
      this.mobileDrawerClose.emit();
    }
  }

  async logout(): Promise<void> {
    try {
      await this.authService.logout();
    } catch (e) {
      console.error(e);
    }
  }

  userInitials(user: User | null): string {
    if (!user) {
      return 'U';
    }
    if (user.firstName && user.lastName) {
      return (user.firstName[0] + user.lastName[0]).toUpperCase();
    }
    if (user.displayName) {
      return user.displayName[0].toUpperCase();
    }
    return (user.email[0] || 'U').toUpperCase();
  }

  agentsNavActive(): boolean {
    const path = this.router.url.split('?')[0].split('#')[0];
    return path === '/agents' || path.startsWith('/agents/');
  }
}
