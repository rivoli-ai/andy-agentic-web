import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { Agent } from '../../models/agent.model';
import { AgentService } from '../../core/services/agent.service';
import { ChatService, ChatMessage as ChatMessageInterface, ChatResponse, ChatSessionDto, ChatHistoryDto } from '../../core/services/chat.service';
import { MarkdownService } from '../../core/services/markdown.service';
import { NotificationService } from '../../core/services/notification.service';
import { MermaidAPI } from 'ngx-markdown';
import { ThemeService } from 'src/app/core/services/theme.service';

interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  agentId?: string;
  agentName?: string;
  isStreaming?: boolean;
}

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css']
})
export class ChatbotComponent implements OnInit, OnDestroy {
  @ViewChild('chatContainer') chatContainer!: ElementRef;
  
  chatForm: FormGroup;
  selectedAgent: Agent | null = null;
  messages: ChatMessage[] = [];
  isLoading = false;
  isExecuting = false;
  
  // Session management
  currentSessionId: string | null = null;
  chatSessions: ChatSessionDto[] = [];
  isSessionPanelOpen = false;
  isLoadingSessions = false;
  
  private subscription = new Subscription();

  public options: MermaidAPI.Config = {
    theme: MermaidAPI.Theme.Base,
  };

  constructor(
    private fb: FormBuilder,
    private agentService: AgentService,
    private chatService: ChatService,
    private markdownService: MarkdownService,
    private notificationService: NotificationService,
    private route: ActivatedRoute,
    private themeService: ThemeService
  ) {
    this.chatForm = this.fb.group({
      message: ['', [Validators.required, Validators.minLength(1)]],
      agentId: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.subscription.add(
      this.themeService.currentTheme$.subscribe(theme => {
        this.updateMermaidOptions(theme);
      })
    );

    this.subscription.add(
      this.route.queryParams.subscribe(params => {
        if (params['agentId']) {
          this.loadAgentById(params['agentId']);
        } else {
          this.addWelcomeMessage();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private loadAgentById(agentId: string): void {
    this.subscription.add(
      this.agentService.getAgentById(agentId).subscribe({
        next: (agent: Agent | undefined) => {
          if (agent) {
            this.selectedAgent = agent;
            this.chatForm.setValue({ 
              agentId: agent.id, 
              message: '' 
            });

            // Load chat sessions for this agent
            this.loadChatSessions(agent.id);

            // Add initial agent selection message
            this.messages.push({
              id: this.generateId(),
              content: `Agent selected: ${agent.name}. ${agent.description}`,
              isUser: false,
              timestamp: new Date(),
              agentId: agent.id,
              agentName: agent.name
            });
          }
        },
        error: (error: any) => {
          this.notificationService.error('Error', 'Unable to load agent');
          console.error('Error loading agent:', error);
        }
      })
    );
  }

  private loadChatSessions(agentId: string): void {
    this.isLoadingSessions = true;
    this.subscription.add(
      this.chatService.getChatSessions(agentId).subscribe({
        next: (sessions: ChatSessionDto[]) => {
          this.chatSessions = sessions;
          this.isLoadingSessions = false;
          
          // If there are active sessions, load the most recent one
          const activeSession = sessions.find(s => s.isActive);
          if (activeSession) {
            this.loadChatSession(activeSession.sessionId);
          }
        },
        error: (error: any) => {
          console.error('Error loading chat sessions:', error);
          this.isLoadingSessions = false;
        }
      })
    );
  }

  private loadChatSession(sessionId: string): void {
    this.currentSessionId = sessionId;
    this.messages = []; // Clear current messages
    
    // Load chat history for this session
    this.subscription.add(
      this.chatService.getChatHistoryBySession(sessionId).subscribe({
        next: (history: ChatHistoryDto[]) => {
          // Convert ChatHistoryDto to ChatMessage format
          this.messages = history
            .filter(msg => msg.role !== 'system') // Exclude system messages
            .map(msg => ({
              id: msg.id,
              content: msg.content,
              isUser: msg.role === 'user',
              timestamp: new Date(msg.timestamp),
              agentId: msg.agentId,
              agentName: msg.agentName
            }));
          
          this.scrollToBottom();
        },
        error: (error: any) => {
          console.error('Error loading chat history:', error);
          this.notificationService.error('Error', 'Unable to load chat history');
        }
      })
    );
  }

  // Start a new chat session
  startNewSession(): void {
    if (!this.selectedAgent) return;
    
    this.isLoading = true;
    this.subscription.add(
      this.chatService.createNewChatSession(this.selectedAgent.id, 'New Chat Session').subscribe({
        next: (sessionId: string) => {
          this.currentSessionId = sessionId;
          this.messages = [];
          this.isLoading = false;
          
          // Add welcome message for new session
          this.messages.push({
            id: this.generateId(),
            content: `New chat session started with ${this.selectedAgent!.name}`,
            isUser: false,
            timestamp: new Date(),
            agentId: this.selectedAgent!.id,
            agentName: this.selectedAgent!.name
          });
          
          // Reload sessions list
          this.loadChatSessions(this.selectedAgent!.id);
          this.scrollToBottom();
        },
        error: (error: any) => {
          this.isLoading = false;
          this.notificationService.error('Error', 'Unable to create new session');
          console.error('Error creating new session:', error);
        }
      })
    );
  }

  // Switch to an existing session
  switchToSession(sessionId: string): void {
    if (this.currentSessionId === sessionId) {
      return; // Already on this session
    }

    this.currentSessionId = sessionId;
    this.loadChatSession(sessionId);
    
    // Don't automatically close the sidebar - let user control it manually
    // this.isSessionPanelOpen = false;
  }

  // Delete a chat session
  deleteSession(sessionId: string, event: Event): void {
    event.stopPropagation(); // Prevent session switching
    
    if (confirm('Are you sure you want to delete this chat session? This action cannot be undone.')) {
      this.subscription.add(
        this.chatService.deleteChatSession(sessionId).subscribe({
          next: (success: boolean) => {
            if (success) {
              // If we deleted the current session, start a new one
              if (this.currentSessionId === sessionId) {
                this.startNewSession();
              }
              
              // Reload sessions list
              if (this.selectedAgent) {
                this.loadChatSessions(this.selectedAgent.id);
              }
              
              this.notificationService.success('Success', 'Chat session deleted');
            }
          },
          error: (error: any) => {
            this.notificationService.error('Error', 'Unable to delete session');
            console.error('Error deleting session:', error);
          }
        })
      );
    }
  }

  // Rename a chat session
  renameSession(session: ChatSessionDto, event: Event): void {
    event.stopPropagation(); // Prevent session switching
    
    const newTitle = prompt('Enter new session title:', session.agentName);
    if (newTitle && newTitle.trim() !== '') {
      this.subscription.add(
        this.chatService.renameChatSession(session.sessionId, newTitle.trim()).subscribe({
          next: (success: boolean) => {
            if (success) {
              // Reload sessions list
              if (this.selectedAgent) {
                this.loadChatSessions(this.selectedAgent.id);
              }
              this.notificationService.success('Success', 'Session renamed');
            }
          },
          error: (error: any) => {
            this.notificationService.error('Error', 'Unable to rename session');
            console.error('Error renaming session:', error);
          }
        })
      );
    }
  }

  private addWelcomeMessage(): void {
    this.messages.push({
      id: this.generateId(),
      content: 'Hello! I am your AI assistant. Select an agent and start chatting.',
      isUser: false,
      timestamp: new Date()
    });
  }

  private updateMermaidOptions(theme: 'light' | 'dark'): void {
    this.options = {
      fontFamily: '"trebuchet ms", verdana, arial, sans-serif',
      logLevel: MermaidAPI.LogLevel.Info,
      theme: theme === 'dark' ? MermaidAPI.Theme.Dark : MermaidAPI.Theme.Default,
    };
  }

  onSubmit(): void {
    if (this.chatForm.valid && this.selectedAgent) {
      const messageContent = this.chatForm.get('message')?.value;
      
      // If no current session, create one
      if (!this.currentSessionId) {
        this.startNewSession();
        // Wait a bit for session creation, then send message
        setTimeout(() => {
          this.sendMessage(messageContent);
        }, 500);
        return;
      }
      
      this.sendMessage(messageContent);
    }
  }

  private sendMessage(messageContent: string): void {
    if (!this.selectedAgent || !this.currentSessionId) return;

    // Add user message
    this.messages.push({
      id: this.generateId(),
      content: messageContent,
      isUser: true,
      timestamp: new Date()
    });

    // Clear form
    this.chatForm.patchValue({ message: '' });
    
    // Execute agent with session ID
    this.executeAgent(messageContent);
    this.scrollToBottom();
  }

  private executeAgent(userMessage: string): void {
    if (!this.selectedAgent || !this.currentSessionId) return;

    this.isExecuting = true;
    
    // Add streaming message
    const streamingMessage: ChatMessage = {
      id: this.generateId(),
      content: '',
      isUser: false,
      timestamp: new Date(),
      agentId: this.selectedAgent.id,
      agentName: this.selectedAgent.name,
      isStreaming: true
    };
    this.messages.push(streamingMessage);

    // Force change detection for immediate display
    this.scrollToBottom();

    this.subscription.add(
      this.chatService.sendMessageStream(userMessage, this.selectedAgent.id, this.currentSessionId).subscribe({
        next: (chunk: string) => {
          // Update the streaming message content in real-time
          streamingMessage.content += chunk;
          // Force change detection for live updates
          this.scrollToBottom();
        },
        complete: () => {
          // Streaming completed
          streamingMessage.isStreaming = false;
          this.isExecuting = false;
          this.scrollToBottom();
        },
        error: (error: any) => {
          // Remove streaming message and add error message
          this.messages = this.messages.filter(msg => msg.id !== streamingMessage.id);
          
          this.messages.push({
            id: this.generateId(),
            content: '❌ Sorry, an error occurred while executing the agent.',
            isUser: false,
            timestamp: new Date(),
            agentId: this.selectedAgent!.id,
            agentName: this.selectedAgent!.name
          });
          
          this.isExecuting = false;
          this.notificationService.error('Error', 'Agent execution failed');
          this.scrollToBottom();
        }
      })
    );
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.chatContainer) {
        this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
      }
    }, 100);
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  clearChat(): void {
    this.messages = [];
    if (this.selectedAgent) {
      this.startNewSession();
    } else {
      this.addWelcomeMessage();
    }
  }

  toggleSessionPanel(): void {
    console.log('Toggle clicked! Current state:', this.isSessionPanelOpen);
    this.isSessionPanelOpen = !this.isSessionPanelOpen;
    console.log('New state:', this.isSessionPanelOpen);
  }

  getAgentAvatar(agent: Agent): string {
    // Generate initials from agent name
    return agent.name.split(' ').map(word => word[0]).join('').toUpperCase().substring(0, 2);
  }

  getAvatarFromName(name: string): string {
    // Generate initials from name string
    return name.split(' ').map(word => word[0]).join('').toUpperCase().substring(0, 2);
  }

  getMessageTime(timestamp: Date | string): string {
    // Handle both Date objects and string timestamps
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid time';
    }
    
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  getSessionTime(timestamp: Date | string): string {
    // Handle both Date objects and string timestamps
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  trackByMessage(index: number, message: ChatMessage): string {
    return message.id;
  }

  trackBySession(index: number, session: ChatSessionDto): string {
    return session.sessionId;
  }

  hasStreamingMessages(): boolean {
    return this.messages.some(m => m.isStreaming);
  }

  copyMessageContent(content: string): void {
    navigator.clipboard.writeText(content).then(() => {
      this.notificationService.success('Copied!', 'Content copied to clipboard');
    }).catch(() => {
      this.notificationService.error('Error', 'Unable to copy content');
    });
  }

  isCurrentSession(sessionId: string): boolean {
    return this.currentSessionId === sessionId;
  }
}
