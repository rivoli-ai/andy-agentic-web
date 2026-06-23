import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { SkillRegistry } from '../../models/skill.model';
import { SkillService } from '../../core/services/skill.service';
import { NotificationService } from '../../core/services/notification.service';
import { RoleService } from '../../core/services/role.service';

/**
 * Lists configured skill registry connections and lets users test, edit, or delete them.
 */
@Component({
  standalone: false,
  selector: 'app-skills',
  templateUrl: './skills.component.html',
  styleUrls: ['./skills.component.css'],
})
export class SkillsComponent implements OnInit, OnDestroy {
  registries: SkillRegistry[] = [];
  isLoading = true;
  testingId: string | null = null;
  hasWritePermission: Observable<boolean>;

  private subscription = new Subscription();

  constructor(
    private skillService: SkillService,
    private notification: NotificationService,
    private roleService: RoleService,
    private router: Router
  ) {
    this.hasWritePermission = this.roleService.hasWritePermission();
  }

  ngOnInit(): void {
    this.loadRegistries();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  loadRegistries(): void {
    this.isLoading = true;
    this.subscription.add(
      this.skillService.getRegistries().subscribe({
        next: registries => {
          this.registries = registries;
          this.isLoading = false;
        },
        error: () => {
          this.notification.error('Skill registries', 'Failed to load skill registries');
          this.isLoading = false;
        },
      })
    );
  }

  createRegistry(): void {
    this.router.navigate(['/skills/new']);
  }

  editRegistry(registry: SkillRegistry): void {
    this.router.navigate(['/skills', registry.id, 'edit']);
  }

  testRegistry(registry: SkillRegistry): void {
    this.testingId = registry.id;
    this.subscription.add(
      this.skillService.testRegistry(registry.id).subscribe({
        next: ok => {
          this.testingId = null;
          if (ok) {
            this.notification.success('Connection OK', `Reached '${registry.name}'`);
          } else {
            this.notification.error('Connection failed', `Could not reach '${registry.name}'`);
          }
        },
        error: () => {
          this.testingId = null;
          this.notification.error('Connection failed', `Could not reach '${registry.name}'`);
        },
      })
    );
  }

  deleteRegistry(registry: SkillRegistry): void {
    if (!confirm(`Delete skill registry '${registry.name}'?`)) {
      return;
    }
    this.subscription.add(
      this.skillService.deleteRegistry(registry.id).subscribe({
        next: () => {
          this.notification.success('Deleted', `Removed '${registry.name}'`);
          this.loadRegistries();
        },
        error: (error: { error?: { error?: string } }) => {
          this.notification.error(
            'Delete failed',
            error?.error?.error || `Could not delete '${registry.name}'`
          );
        },
      })
    );
  }

  trackById(_index: number, registry: SkillRegistry): string {
    return registry.id;
  }
}
