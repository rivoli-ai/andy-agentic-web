import { RouterModule, Routes } from '@angular/router';
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

const routes: Routes = [
  { path: '', redirectTo: '/agents', pathMatch: 'full' },
  { path: 'agents', component: AgentsComponent },
  { path: 'agents/new', component: AgentFormComponent },
  { path: 'agents/:id', component: AgentDetailComponent },
  { path: 'agents/:id/edit', component: AgentFormComponent },
  { path: 'tools', component: ToolsComponent },
  { path: 'tools/new', component: ToolFormComponent },
  { path: 'tools/:id/edit', component: ToolFormComponent },
  { path: 'mcp', component: MCPComponent },
  { path: 'llm', component: LLMComponent },
  { path: 'llm/new', component: LLMFormComponent },
  { path: 'llm/:id/edit', component: LLMFormComponent },
  { path: 'settings', component: SettingsComponent },
  { path: 'chatbot', component: ChatbotComponent },
  { path: '**', redirectTo: '/agents' }
];

export const AppRoutingModule = RouterModule.forRoot(routes);
