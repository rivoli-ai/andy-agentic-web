import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { MsalModule, MsalService, MSAL_INSTANCE } from '@azure/msal-angular';
import { IPublicClientApplication, PublicClientApplication } from '@azure/msal-browser';

import { AuthService } from './services/auth.service';
import { AuthGuard } from './guards/auth.guard';
import { LoginComponent } from './components/login/login.component';
import { LogoutComponent } from './components/logout/logout.component';
import { UserProfileComponent } from './components/user-profile/user-profile.component';
import { AppConfigService } from '../config/app-config.service';

// MSAL configuration (reads assets/config.json loaded in APP_INITIALIZER)
export function MSALInstanceFactory(config: AppConfigService): IPublicClientApplication {
  const ad = config.azureAd;
  return new PublicClientApplication({
    auth: {
      clientId: ad.clientId,
      authority: `https://login.microsoftonline.com/${ad.tenantId}`,
      redirectUri: ad.redirectUri
    },
    cache: {
      cacheLocation: 'localStorage',
      storeAuthStateInCookie: false
    }
  });
}

@NgModule({
  declarations: [
    LoginComponent,
    LogoutComponent,
    UserProfileComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    MsalModule
  ],
  providers: [
    AuthService,
    AuthGuard,
    {
      provide: MSAL_INSTANCE,
      useFactory: MSALInstanceFactory,
      deps: [AppConfigService]
    },
    MsalService
  ],
  exports: [
    LoginComponent,
    LogoutComponent,
    UserProfileComponent
  ]
})
export class AuthModule { }
