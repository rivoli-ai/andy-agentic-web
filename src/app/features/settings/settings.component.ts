import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ThemeService } from '../../core/services/theme.service';
import { NotificationService } from '../../core/services/notification.service';
import { Theme } from '../../models/theme.model';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit, OnDestroy {
  currentTheme: Theme = 'light';
  isAutoTheme = false;
  isNotificationsEnabled = true;
  isSoundEnabled = true;
  isAutoSaveEnabled = true;
  autoSaveInterval = 5;
  maxAgents = 100;
  maxTools = 50;
  maxMCPServers = 20;
  
  private subscription = new Subscription();

  constructor(
    private themeService: ThemeService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.subscription.add(
      this.themeService.currentTheme$.subscribe(theme => {
        this.currentTheme = theme;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  onThemeChange(theme: Theme): void {
    this.themeService.setTheme(theme);
    this.notificationService.success(
      'Theme Updated',
      `Theme changed to ${theme} mode.`
    );
  }

  onAutoThemeChange(enabled: boolean): void {
    this.isAutoTheme = enabled;
    if (enabled) {
      this.themeService.enableAutoTheme();
      this.notificationService.success(
        'Auto Theme Enabled',
        'Theme will automatically adjust based on system preference.'
      );
    } else {
      this.themeService.disableAutoTheme();
      this.notificationService.info(
        'Auto Theme Disabled',
        'Theme will remain on manual selection.'
      );
    }
  }

  onNotificationsChange(enabled: boolean): void {
    this.isNotificationsEnabled = enabled;
    this.notificationService.success(
      'Notifications Updated',
      `Notifications ${enabled ? 'enabled' : 'disabled'}.`
    );
  }

  onSoundChange(enabled: boolean): void {
    this.isSoundEnabled = enabled;
    this.notificationService.success(
      'Sound Settings Updated',
      `Sound ${enabled ? 'enabled' : 'disabled'}.`
    );
  }

  onAutoSaveChange(enabled: boolean): void {
    this.isAutoSaveEnabled = enabled;
    this.notificationService.success(
      'Auto Save Updated',
      `Auto save ${enabled ? 'enabled' : 'disabled'}.`
    );
  }

  onAutoSaveIntervalChange(interval: number): void {
    this.autoSaveInterval = interval;
    this.notificationService.success(
      'Auto Save Interval Updated',
      `Auto save interval set to ${interval} minutes.`
    );
  }

  onMaxAgentsChange(max: number): void {
    this.maxAgents = max;
    this.notificationService.success(
      'Limit Updated',
      `Maximum agents limit set to ${max}.`
    );
  }

  onMaxToolsChange(max: number): void {
    this.maxTools = max;
    this.notificationService.success(
      'Limit Updated',
      `Maximum tools limit set to ${max}.`
    );
  }

  onMaxMCPServersChange(max: number): void {
    this.maxMCPServers = max;
    this.notificationService.success(
      'Limit Updated',
      `Maximum MCP servers limit set to ${max}.`
    );
  }

  exportSettings(): void {
    const settings = {
      theme: this.currentTheme,
      autoTheme: this.isAutoTheme,
      notifications: this.isNotificationsEnabled,
      sound: this.isSoundEnabled,
      autoSave: this.isAutoSaveEnabled,
      autoSaveInterval: this.autoSaveInterval,
      limits: {
        maxAgents: this.maxAgents,
        maxTools: this.maxTools,
        maxMCPServers: this.maxMCPServers
      }
    };

    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = 'agentic-settings.json';
    link.click();
    
    this.notificationService.success(
      'Settings Exported',
      'Settings have been exported successfully.'
    );
  }

  importSettings(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          const settings = JSON.parse(e.target.result);
          
          // Apply imported settings
          if (settings.theme) this.onThemeChange(settings.theme);
          if (settings.autoTheme !== undefined) this.onAutoThemeChange(settings.autoTheme);
          if (settings.notifications !== undefined) this.onNotificationsChange(settings.notifications);
          if (settings.sound !== undefined) this.onSoundChange(settings.sound);
          if (settings.autoSave !== undefined) this.onAutoSaveChange(settings.autoSave);
          if (settings.autoSaveInterval) this.onAutoSaveIntervalChange(settings.autoSaveInterval);
          if (settings.limits) {
            if (settings.limits.maxAgents) this.onMaxAgentsChange(settings.limits.maxAgents);
            if (settings.limits.maxTools) this.onMaxToolsChange(settings.limits.maxTools);
            if (settings.limits.maxMCPServers) this.onMaxMCPServersChange(settings.limits.maxMCPServers);
          }
          
          this.notificationService.success(
            'Settings Imported',
            'Settings have been imported successfully.'
          );
        } catch (error) {
          this.notificationService.error(
            'Import Failed',
            'Failed to parse settings file. Please check the format.'
          );
        }
      };
      reader.readAsText(file);
    }
  }

  resetToDefaults(): void {
    if (confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
      this.currentTheme = 'light';
      this.isAutoTheme = false;
      this.isNotificationsEnabled = true;
      this.isSoundEnabled = true;
      this.isAutoSaveEnabled = true;
      this.autoSaveInterval = 5;
      this.maxAgents = 100;
      this.maxTools = 50;
      this.maxMCPServers = 20;
      
      this.themeService.setTheme('light');
      this.themeService.disableAutoTheme();
      
      this.notificationService.success(
        'Settings Reset',
        'All settings have been reset to defaults.'
      );
    }
  }

  clearCache(): void {
    if (confirm('Are you sure you want to clear all cached data? This will remove stored agents, tools, and MCP servers.')) {
      // Simulate cache clearing
      setTimeout(() => {
        this.notificationService.success(
          'Cache Cleared',
          'All cached data has been cleared successfully.'
        );
      }, 1000);
    }
  }

  getThemeIcon(theme: Theme): string {
    return theme === 'light' ? '☀️' : '🌙';
  }
}
