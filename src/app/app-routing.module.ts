import { RouterModule, Routes } from '@angular/router';
import { AgentsComponent } from './features/agents/agents.component';
import { AgentFormComponent } from './features/agents/agent-form/agent-form.component';
import { AgentDetailComponent } from './features/agents/agent-detail/agent-detail.component';
import { ToolsComponent } from './features/tools/tools.component';
import { ToolFormComponent } from './features/tools/tool-form/tool-form.component';
import { LLMComponent } from './features/llm/llm.component';
import { LLMFormComponent } from './features/llm/llm-form/llm-form.component';
import { SettingsComponent } from './features/settings/settings.component';
import { ChatbotComponent } from './features/chatbot/chatbot.component';
import { LoginComponent } from './core/auth/components/login/login.component';
import { LogoutComponent } from './core/auth/components/logout/logout.component';
import { MaintenanceComponent } from './features/maintenance/maintenance.component';
import { AuthGuard } from './core/auth/guards/auth.guard';
import { ApiStatusGuard } from './core/guards/api-status.guard';

const routes: Routes = [
  // Authentication routes
  { path: 'login', component: LoginComponent },
  { path: 'logout', component: LogoutComponent },
  
  // Maintenance route
  { path: 'maintenance', component: MaintenanceComponent },
  
  // Protected routes
  { path: '', redirectTo: '/agents', pathMatch: 'full' },
  { path: 'agents', component: AgentsComponent, canActivate: [AuthGuard, ApiStatusGuard] },
  { path: 'agents/new', component: AgentFormComponent, canActivate: [AuthGuard, ApiStatusGuard] },
  { path: 'agents/:id', component: AgentDetailComponent, canActivate: [AuthGuard, ApiStatusGuard] },
  { path: 'agents/:id/edit', component: AgentFormComponent, canActivate: [AuthGuard, ApiStatusGuard] },
  { path: 'tools', component: ToolsComponent, canActivate: [AuthGuard, ApiStatusGuard] },
  { path: 'tools/new', component: ToolFormComponent, canActivate: [AuthGuard, ApiStatusGuard] },
  { path: 'tools/:id/edit', component: ToolFormComponent, canActivate: [AuthGuard, ApiStatusGuard] },
  { path: 'llm', component: LLMComponent, canActivate: [AuthGuard, ApiStatusGuard] },
  { path: 'llm/new', component: LLMFormComponent, canActivate: [AuthGuard, ApiStatusGuard] },
  { path: 'llm/:id/edit', component: LLMFormComponent, canActivate: [AuthGuard, ApiStatusGuard] },
  { path: 'settings', component: SettingsComponent, canActivate: [AuthGuard, ApiStatusGuard] },
  { path: 'chatbot', component: ChatbotComponent, canActivate: [AuthGuard, ApiStatusGuard] },
  { path: '**', redirectTo: '/agents' }
];

export const AppRoutingModule = RouterModule.forRoot(routes);
