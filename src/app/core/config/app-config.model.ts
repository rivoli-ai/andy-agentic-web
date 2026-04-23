/** Runtime app settings loaded from assets/config.json (replace per deployment). */
export interface AzureAdConfig {
  clientId: string;
  tenantId: string;
  redirectUri: string;
}

export interface AppConfig {
  production: boolean;
  apiUrl: string;
  signalRUrl: string;
  azureAd: AzureAdConfig;
}
