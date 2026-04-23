/** Runtime app settings loaded from assets/config.json (replace per deployment). */
export interface AzureAdConfig {
  clientId: string;
  tenantId: string;
  redirectUri: string;
  /** Backend API scope for acquireTokenSilent (e.g. api://{app-id}/Api.Access). */
  scope: string;
}

export interface AppConfig {
  production: boolean;
  apiUrl: string;
  signalRUrl: string;
  azureAd: AzureAdConfig;
}
