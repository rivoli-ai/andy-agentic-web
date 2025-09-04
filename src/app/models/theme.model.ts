export type Theme = 'light' | 'dark';

export interface ThemeConfig {
  current: Theme;
  systemPreference: boolean;
  autoSwitch: boolean;
}

export interface ThemeToggleEvent {
  theme: Theme;
  source: 'manual' | 'system' | 'auto';
}
