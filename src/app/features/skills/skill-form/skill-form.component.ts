import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SkillRegistryAuthType, SkillRegistryInput } from '../../../models/skill.model';
import { SkillService } from '../../../core/services/skill.service';
import { NotificationService } from '../../../core/services/notification.service';

/**
 * Create or edit a skill registry connection (base URL + authentication).
 */
@Component({
  standalone: false,
  selector: 'app-skill-form',
  templateUrl: './skill-form.component.html',
  styleUrls: ['./skill-form.component.css'],
})
export class SkillFormComponent implements OnInit, OnDestroy {
  form: FormGroup;
  isEditMode = false;
  registryId: string | null = null;
  isSaving = false;

  readonly authTypes: { value: SkillRegistryAuthType; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'api_key', label: 'API Key' },
    { value: 'bearer', label: 'Bearer token' },
    { value: 'basic', label: 'Basic' },
    { value: 'oauth2', label: 'OAuth2 (client credentials)' },
  ];

  private subscription = new Subscription();

  constructor(
    private fb: FormBuilder,
    private skillService: SkillService,
    private notification: NotificationService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.form = this.createForm();
  }

  ngOnInit(): void {
    this.registryId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.registryId;

    if (this.isEditMode && this.registryId) {
      this.subscription.add(
        this.skillService.getRegistry(this.registryId).subscribe({
          next: registry => {
            this.form.patchValue({
              name: registry.name,
              description: registry.description,
              baseUrl: registry.baseUrl,
              authType: registry.authType,
              isActive: registry.isActive,
            });
          },
          error: () => this.notification.error('Skill registry', 'Failed to load registry'),
        })
      );
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  get authType(): SkillRegistryAuthType {
    return this.form.get('authType')?.value as SkillRegistryAuthType;
  }

  private createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      baseUrl: ['', [Validators.required, Validators.maxLength(500)]],
      authType: ['none' as SkillRegistryAuthType, [Validators.required]],
      isActive: [true],
      // auth fields
      apiKey: [''],
      header: [''],
      token: [''],
      username: [''],
      password: [''],
      clientId: [''],
      clientSecret: [''],
      tokenUrl: [''],
      scopes: [''],
    });
  }

  /** Builds the write-only authConfig JSON from the relevant auth fields. */
  private buildAuthConfig(): string | undefined {
    const v = this.form.value;
    switch (v.authType as SkillRegistryAuthType) {
      case 'api_key':
        if (!v.apiKey) return undefined;
        return JSON.stringify({ apiKey: v.apiKey, header: v.header || 'X-API-Key' });
      case 'bearer':
        return v.token ? JSON.stringify({ token: v.token }) : undefined;
      case 'basic':
        return v.username || v.password
          ? JSON.stringify({ username: v.username, password: v.password })
          : undefined;
      case 'oauth2':
        return v.clientId && v.clientSecret && v.tokenUrl
          ? JSON.stringify({
              clientId: v.clientId,
              clientSecret: v.clientSecret,
              tokenUrl: v.tokenUrl,
              scopes: v.scopes || undefined,
            })
          : undefined;
      default:
        return undefined;
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const input: SkillRegistryInput = {
      name: this.form.value.name,
      description: this.form.value.description || '',
      baseUrl: this.form.value.baseUrl,
      authType: this.form.value.authType,
      authConfig: this.buildAuthConfig(),
      isActive: this.form.value.isActive,
    };

    this.isSaving = true;
    const request$ =
      this.isEditMode && this.registryId
        ? this.skillService.updateRegistry(this.registryId, input)
        : this.skillService.createRegistry(input);

    this.subscription.add(
      request$.subscribe({
        next: () => {
          this.isSaving = false;
          this.notification.success('Saved', `Registry '${input.name}' saved`);
          this.router.navigate(['/skills']);
        },
        error: (error: { error?: { message?: string; error?: string } }) => {
          this.isSaving = false;
          this.notification.error(
            'Save failed',
            error?.error?.message || error?.error?.error || 'Could not save registry'
          );
        },
      })
    );
  }

  cancel(): void {
    this.router.navigate(['/skills']);
  }
}
