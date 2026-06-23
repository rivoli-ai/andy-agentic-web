import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import {
  AgentSkill,
  AttachSkillInput,
  SkillRegistry,
  SkillSearchResult,
} from '../../../models/skill.model';
import { SkillService } from '../../../core/services/skill.service';
import { NotificationService } from '../../../core/services/notification.service';

/**
 * Embeddable section (used inside the agent form) to search a configured skill registry
 * and attach/detach skills for a specific agent.
 */
@Component({
  standalone: false,
  selector: 'app-agent-skills',
  templateUrl: './agent-skills.component.html',
  styleUrls: ['./agent-skills.component.css'],
})
export class AgentSkillsComponent implements OnInit, OnDestroy {
  @Input() agentId!: string;

  registries: SkillRegistry[] = [];
  selectedRegistryId = '';
  searchQuery = '';
  searchResults: SkillSearchResult[] = [];
  attachedSkills: AgentSkill[] = [];
  isSearching = false;
  isLoading = true;

  private subscription = new Subscription();

  constructor(private skillService: SkillService, private notification: NotificationService) {}

  ngOnInit(): void {
    this.subscription.add(
      this.skillService.getRegistries().subscribe({
        next: registries => {
          this.registries = registries.filter(r => r.isActive);
          if (this.registries.length > 0) {
            this.selectedRegistryId = this.registries[0].id;
          }
        },
        error: () => this.notification.error('Skills', 'Failed to load registries'),
      })
    );
    this.loadAttached();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  loadAttached(): void {
    if (!this.agentId) {
      this.isLoading = false;
      return;
    }
    this.isLoading = true;
    this.subscription.add(
      this.skillService.getAgentSkills(this.agentId).subscribe({
        next: skills => {
          this.attachedSkills = skills;
          this.isLoading = false;
        },
        error: () => {
          this.notification.error('Skills', 'Failed to load attached skills');
          this.isLoading = false;
        },
      })
    );
  }

  search(): void {
    // An empty query is allowed: the registry returns all skills (browse mode).
    if (!this.selectedRegistryId) {
      this.searchResults = [];
      return;
    }
    this.isSearching = true;
    this.subscription.add(
      this.skillService.searchSkills(this.selectedRegistryId, this.searchQuery.trim()).subscribe({
        next: results => {
          this.searchResults = results;
          this.isSearching = false;
        },
        error: () => {
          this.notification.error('Skills', 'Search failed');
          this.isSearching = false;
        },
      })
    );
  }

  isAttached(result: SkillSearchResult): boolean {
    return this.attachedSkills.some(
      s =>
        s.skillRegistryId === this.selectedRegistryId &&
        s.namespace === result.namespace &&
        s.skillSlug === result.skillSlug &&
        s.version === result.version
    );
  }

  attach(result: SkillSearchResult): void {
    const input: AttachSkillInput = {
      skillRegistryId: this.selectedRegistryId,
      namespace: result.namespace,
      skillSlug: result.skillSlug,
      version: result.version,
      displayName: result.displayName,
      description: result.description,
      isActive: true,
    };
    this.subscription.add(
      this.skillService.attachSkill(this.agentId, input).subscribe({
        next: skill => {
          this.attachedSkills = [...this.attachedSkills, skill];
          this.notification.success('Skill attached', `Added '${skill.displayName}'`);
        },
        error: (error: { error?: { message?: string } }) =>
          this.notification.error(
            'Attach failed',
            error?.error?.message || 'Could not attach skill'
          ),
      })
    );
  }

  detach(skill: AgentSkill): void {
    this.subscription.add(
      this.skillService.detachSkill(this.agentId, skill.id).subscribe({
        next: () => {
          this.attachedSkills = this.attachedSkills.filter(s => s.id !== skill.id);
          this.notification.success('Skill detached', `Removed '${skill.displayName}'`);
        },
        error: () => this.notification.error('Detach failed', 'Could not detach skill'),
      })
    );
  }

  trackBySkillId(_index: number, skill: AgentSkill): string {
    return skill.id;
  }

  trackByResult(_index: number, result: SkillSearchResult): string {
    return `${result.namespace}/${result.skillSlug}@${result.version}`;
  }
}
