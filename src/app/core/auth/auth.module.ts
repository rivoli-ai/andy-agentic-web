import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import {
  AuthModule as OidcAuthModule,
  StsConfigHttpLoader,
  StsConfigLoader,
} from 'angular-auth-oidc-client';

import { AuthService } from './services/auth.service';
import { LoginComponent } from './components/login/login.component';
import { CallbackComponent } from './components/callback/callback.component';
import { LogoutComponent } from './components/logout/logout.component';
import { UserProfileComponent } from './components/user-profile/user-profile.component';
import { AppConfigService } from '../config/app-config.service';
import { loadOidcConfigs } from './oidc-config.loader';

export function oidcConfigFactory(http: HttpClient, config: AppConfigService) {
  return new StsConfigHttpLoader(loadOidcConfigs(http, config.apiUrl));
}

@NgModule({
  declarations: [LoginComponent, CallbackComponent, LogoutComponent, UserProfileComponent],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    OidcAuthModule.forRoot({
      loader: {
        provide: StsConfigLoader,
        useFactory: oidcConfigFactory,
        deps: [HttpClient, AppConfigService],
      },
    }),
  ],
  exports: [
    LoginComponent,
    CallbackComponent,
    LogoutComponent,
    UserProfileComponent,
    OidcAuthModule,
  ],
})
export class AuthModule {}
