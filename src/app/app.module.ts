import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { ClipboardButtonComponent, ClipboardOptions, MarkdownModule } from 'ngx-markdown';
import { MarkedOptions } from 'ngx-markdown';
import { marked } from 'marked';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthModule } from './core/auth/auth.module';
import { ThemeService } from './core/services/theme.service';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';

// Shared components
import { NotificationToastComponent } from './shared/components/notification-toast/notification-toast.component';
import { ToolExecutionDisplayComponent } from './shared/components/tool-execution-display/tool-execution-display.component';
import { ToolExecutionSummaryComponent } from './shared/components/tool-execution-summary/tool-execution-summary.component';
import { ThemeToggleComponent } from './shared/components/theme-toggle/theme-toggle.component';
import { LoadingOverlayComponent } from './shared/components/loading-overlay/loading-overlay.component';

// Role pipes
import { HasRolePipe, HasAnyRolePipe, HasWritePermissionPipe, HasReadPermissionPipe } from './shared/pipes/role.pipe';

// Feature components
import { AgentsComponent } from './features/agents/agents.component';
import { AgentFormComponent } from './features/agents/agent-form/agent-form.component';
import { AgentDetailComponent } from './features/agents/agent-detail/agent-detail.component';
import { ToolsComponent } from './features/tools/tools.component';
import { ToolFormComponent } from './features/tools/tool-form/tool-form.component';
import { ToolDetailComponent } from './features/tools/tool-detail/tool-detail.component';
import { LLMComponent } from './features/llm/llm.component';
import { LLMFormComponent } from './features/llm/llm-form/llm-form.component';
import { LLMDetailComponent } from './features/llm/llm-detail/llm-detail.component';
import { SettingsComponent } from './features/settings/settings.component';
import { ChatbotComponent } from './features/chatbot/chatbot.component';
import { highlight } from 'prismjs';
import { HashLocationStrategy, LocationStrategy } from '@angular/common';

@NgModule({
  declarations: [
    AppComponent,
    NotificationToastComponent,
    AgentsComponent,
    AgentFormComponent,
    AgentDetailComponent,
    ToolsComponent,
    ToolFormComponent,
    ToolDetailComponent,
    LLMComponent,
    LLMFormComponent,
    LLMDetailComponent,
    SettingsComponent,
    ChatbotComponent,
    ToolExecutionDisplayComponent,
    ToolExecutionSummaryComponent,
    ThemeToggleComponent,
    LoadingOverlayComponent,
    HasRolePipe,
    HasAnyRolePipe,
    HasWritePermissionPipe,
    HasReadPermissionPipe
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    AppRoutingModule,
    AuthModule,
    MarkdownModule.forRoot({
      clipboardOptions: {
        provide: ClipboardOptions,
        useValue: {
          buttonComponent: ClipboardButtonComponent,
        },
      },
    })
  ],
  providers: [
    ThemeService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    { provide: LocationStrategy, useClass: HashLocationStrategy }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
