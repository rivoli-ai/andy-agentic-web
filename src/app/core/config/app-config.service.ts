import { Injectable } from '@angular/core';
import { AppConfig } from './app-config.model';

@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private config!: AppConfig;

  /** Load before app bootstrap via APP_INITIALIZER. */
  load(): Promise<void> {
    return fetch('assets/config.json', { cache: 'no-store' })
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to load assets/config.json (${res.status}). Ensure the file exists under src/assets/.`);
        }
        return res.json() as Promise<AppConfig>;
      })
      .then(json => {
        this.config = json;
      });
  }

  private requireConfig(): AppConfig {
    if (!this.config) {
      throw new Error('App config not loaded yet (APP_INITIALIZER should run first).');
    }
    return this.config;
  }

  get production(): boolean {
    return this.requireConfig().production;
  }

  get apiUrl(): string {
    return this.requireConfig().apiUrl;
  }

  get signalRUrl(): string {
    return this.requireConfig().signalRUrl;
  }

  get azureAd(): AppConfig['azureAd'] {
    return this.requireConfig().azureAd;
  }
}
