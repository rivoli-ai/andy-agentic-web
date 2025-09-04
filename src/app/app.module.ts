import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ClipboardButtonComponent, ClipboardOptions, MarkdownModule } from 'ngx-markdown';
import { MarkedOptions } from 'ngx-markdown';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

// Shared components
import { NotificationToastComponent } from './shared/components/notification-toast/notification-toast.component';

// Feature components
import { AgentsComponent } from './features/agents/agents.component';
import { AgentFormComponent } from './features/agents/agent-form/agent-form.component';
import { AgentDetailComponent } from './features/agents/agent-detail/agent-detail.component';
import { ToolsComponent } from './features/tools/tools.component';
import { ToolFormComponent } from './features/tools/tool-form/tool-form.component';
import { MCPComponent } from './features/mcp/mcp.component';
import { LLMComponent } from './features/llm/llm.component';
import { LLMFormComponent } from './features/llm/llm-form/llm-form.component';
import { SettingsComponent } from './features/settings/settings.component';
import { ChatbotComponent } from './features/chatbot/chatbot.component';
import { highlight } from 'prismjs';

@NgModule({
  declarations: [
    AppComponent,
    NotificationToastComponent,
    AgentsComponent,
    AgentFormComponent,
    AgentDetailComponent,
    ToolsComponent,
    ToolFormComponent,
    MCPComponent,
    LLMComponent,
    LLMFormComponent,
    SettingsComponent,
    ChatbotComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    AppRoutingModule,
    MarkdownModule.forRoot({
      clipboardOptions: {
        provide: ClipboardOptions,
        useValue: {
          buttonComponent: ClipboardButtonComponent,
        },
      },
    })
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
