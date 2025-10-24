import { RouterModule, Routes } from '@angular/router';
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
import { LoginComponent } from './core/auth/components/login/login.component';
import { LogoutComponent } from './core/auth/components/logout/logout.component';
import { AuthGuard } from './core/auth/guards/auth.guard';
import { ApiStatusGuard } from './core/guards/api-status.guard';
import { WriteRoleGuard } from './core/guards/role.guard';

const routes: Routes = [
  // Authentication routes
  { path: 'login', component: LoginComponent },
  { path: 'logout', component: LogoutComponent },
  
  
  // Protected routes
  { path: '', redirectTo: '/agents', pathMatch: 'full' },
  { path: 'agents', component: AgentsComponent, canActivate: [AuthGuard, ApiStatusGuard] },
  { path: 'agents/new', component: AgentFormComponent, canActivate: [AuthGuard, ApiStatusGuard, WriteRoleGuard] },
  { path: 'agents/:id', component: AgentDetailComponent, canActivate: [AuthGuard, ApiStatusGuard] },
  { path: 'agents/:id/edit', component: AgentFormComponent, canActivate: [AuthGuard, ApiStatusGuard, WriteRoleGuard] },
  { path: 'tools', component: ToolsComponent, canActivate: [AuthGuard, ApiStatusGuard] },
  { path: 'tools/new', component: ToolFormComponent, canActivate: [AuthGuard, ApiStatusGuard, WriteRoleGuard] },
  { path: 'tools/:id', component: ToolDetailComponent, canActivate: [AuthGuard, ApiStatusGuard] },
  { path: 'tools/:id/edit', component: ToolFormComponent, canActivate: [AuthGuard, ApiStatusGuard, WriteRoleGuard] },
  { path: 'llm', component: LLMComponent, canActivate: [AuthGuard, ApiStatusGuard] },
  { path: 'llm/new', component: LLMFormComponent, canActivate: [AuthGuard, ApiStatusGuard, WriteRoleGuard] },
  { path: 'llm/:id', component: LLMDetailComponent, canActivate: [AuthGuard, ApiStatusGuard] },
  { path: 'llm/:id/edit', component: LLMFormComponent, canActivate: [AuthGuard, ApiStatusGuard, WriteRoleGuard] },
  { path: 'settings', component: SettingsComponent, canActivate: [AuthGuard, ApiStatusGuard] },
  { path: 'chatbot', component: ChatbotComponent, canActivate: [AuthGuard, ApiStatusGuard] },
  { path: 'chatbot/:agentId', component: ChatbotComponent, canActivate: [AuthGuard, ApiStatusGuard] },
  { path: '**', redirectTo: '/agents' }
];

export const AppRoutingModule = RouterModule.forRoot(routes);
