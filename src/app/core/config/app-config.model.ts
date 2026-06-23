/** Runtime app settings loaded from assets/config.json (replace per deployment). */
export interface AppConfig {
  production: boolean;
  apiUrl: string;
  signalRUrl: string;
}
