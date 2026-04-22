import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription, combineLatest } from 'rxjs';
import { Agent } from '../../models/agent.model';
import { AgentService } from '../../core/services/agent.service';
import { ChatService, ChatMessage as ChatMessageInterface, ChatResponse, ChatSessionDto, ChatHistoryDto, ToolExecutionLogDto } from '../../core/services/chat.service';
import { MarkdownService } from '../../core/services/markdown.service';
import { NotificationService } from '../../core/services/notification.service';
import type { MermaidAPI } from 'ngx-markdown';
import { ThemeService } from 'src/app/core/services/theme.service';

interface ChatImage {
  data: string; // base64 encoded image data
  mimeType: string;
  name?: string;
}

interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  agentId?: string;
  agentName?: string;
  isStreaming?: boolean;
  userId?: string;
  toolExecutions?: ToolExecution[];
  thinking?: string;
  isThinking?: boolean;
  showThinking?: boolean;
  images?: ChatImage[];
  isExpanded?: boolean; // For long user messages
}

interface ToolExecution {
  id: string;
  toolId: string;
  toolName: string;
  tool?: {
    id: string;
    name: string;
    type: string;
    description: string;
  };
  agentId?: string;
  sessionId?: string;
  parameters: Record<string, any>;
  result: any;
  success: boolean;
  errorMessage?: string;
  executedAt: Date;
  executionTime: number;
  usedParameters?: Record<string, any>;
}

@Component({
  standalone: false,
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css']
})
export class ChatbotComponent implements OnInit, OnDestroy {
  @ViewChild('chatContainer') chatContainer!: ElementRef;
  @ViewChild('messageTextarea', { static: false }) messageTextarea!: ElementRef<HTMLTextAreaElement>;
  
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
  
  // Tool execution tracking
  allToolExecutions: ToolExecution[] = [];
  isToolSummaryExpanded = false;
  showToolExecutions = true;
  
  // Cancellation support
  private currentStreamSubscription: Subscription | null = null;
  private abortController: AbortController | null = null;
  
  private subscription = new Subscription();
  private pendingTimeouts: number[] = [];
  
  // Message preview settings
  private readonly MESSAGE_PREVIEW_LENGTH = 200; // Characters to show in preview (reduced for smaller preview)
  private readonly MESSAGE_PREVIEW_LINES = 3; // Lines to show in preview (reduced for smaller preview)
  
  // Track the current streaming message to update it precisely
  private currentStreamingMessage: ChatMessage | null = null;

  // Image upload support
  selectedImages: ChatImage[] = [];
  imagePreviewUrls: string[] = [];

  // Image modal support
  selectedImageForModal: string | null = null;
  isImageModalOpen = false;

  public options: MermaidAPI.MermaidConfig = {
    theme: 'base',
  };

  constructor(
    private fb: FormBuilder,
    private agentService: AgentService,
    private chatService: ChatService,
    private markdownService: MarkdownService,
    private notificationService: NotificationService,
    private route: ActivatedRoute,
    private themeService: ThemeService,
    private cdr: ChangeDetectorRef
  ) {
    this.chatForm = this.fb.group({
      message: ['', [Validators.required, Validators.minLength(1)]],
      agentId: ['', Validators.required]
    });

    // Subscribe to message changes to auto-resize textarea
    this.chatForm.get('message')?.valueChanges.subscribe(() => {
      setTimeout(() => this.autoResizeTextarea(), 0);
    });
  }

  ngOnInit(): void {
    console.log('ChatbotComponent: ngOnInit called');
    
    this.subscription.add(
      this.themeService.currentTheme$.subscribe((theme: any) => {
        this.updateMermaidOptions(theme);
      })
    );

    // Use combineLatest to handle both route and query parameters
    this.subscription.add(
      combineLatest([
        this.route.params,
        this.route.queryParams
      ]).subscribe(([routeParams, queryParams]) => {
        console.log('ChatbotComponent: Route params:', routeParams);
        console.log('ChatbotComponent: Query params:', queryParams);
        
        // Priority: route params > query params > localStorage
        let agentId = routeParams['agentId'] || queryParams['agentId'];
        
        if (agentId) {
          console.log('ChatbotComponent: Loading agent from URL:', agentId);
          this.loadAgentById(agentId);
        } else {
          // Check if there's a persisted agent in localStorage
          const persistedAgentId = localStorage.getItem('selectedAgentId');
          console.log('ChatbotComponent: Persisted agent ID:', persistedAgentId);
          if (persistedAgentId) {
            console.log('ChatbotComponent: Loading agent from localStorage:', persistedAgentId);
            this.loadAgentById(persistedAgentId);
          } else {
            console.log('ChatbotComponent: No agent found, showing welcome message');
            this.addWelcomeMessage();
          }
        }
      })
    );
  }

  ngOnDestroy(): void {
    // Clean up all subscriptions
    this.subscription.unsubscribe();
    
    // Stop any streaming
    this.stopStreaming();
    
    // Clear all pending timeouts
    this.pendingTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    this.pendingTimeouts = [];
  }

  private loadAgentById(agentId: string): void {
    console.log('ChatbotComponent: loadAgentById called with:', agentId);
    this.subscription.add(
      this.agentService.getAgentById(agentId).subscribe({
        next: (agent: Agent | undefined) => {
          console.log('ChatbotComponent: Agent loaded:', agent);
          if (agent) {
            this.selectedAgent = agent;
            this.chatForm.setValue({ 
              agentId: agent.id, 
              message: '' 
            });

            // Persist the selected agent to localStorage
            localStorage.setItem('selectedAgentId', agent.id);
            console.log('ChatbotComponent: Agent persisted to localStorage:', agent.id);

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
          // Clear invalid agent from localStorage
          localStorage.removeItem('selectedAgentId');
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
    this.clearToolExecutions(); // Clear previous tool executions
    
    // Load chat history for this session
    this.subscription.add(
      this.chatService.getChatHistoryBySession(sessionId).subscribe({
        next: (history: ChatHistoryDto[]) => {
          // Process tool executions from chat history
          this.processChatHistoryForToolExecutions(history);
          
          // Convert ChatHistoryDto to ChatMessage format
          this.messages = history
            .filter(msg => msg.role !== 'system') // Exclude system messages
            .map(msg => {
              const chatMessage: ChatMessage = {
                id: msg.id,
                content: msg.content,
                isUser: msg.role === 'user',
                timestamp: new Date(msg.timestamp),
                agentId: msg.agentId,
                agentName: msg.agentName,
                thinking: msg.thinking,
                isThinking: false, // Historical messages are never actively thinking
                showThinking: false,
                images: msg.images,
                isExpanded: false // Default to collapsed for long messages
              };
              
              // Add tool execution data from ToolResults array (new format)
              if (msg.toolResults && Array.isArray(msg.toolResults) && msg.toolResults.length > 0) {
                chatMessage.toolExecutions = msg.toolResults
                  .map((toolLog: ToolExecutionLogDto) => 
                    this.convertToolExecutionLogToToolExecution(toolLog)
                  )
                  .sort((a, b) => a.executedAt.getTime() - b.executedAt.getTime());
              }
              // Fallback to legacy single tool execution format
              else if (msg.isToolExecution && msg.toolName) {
                const toolExecution = this.convertChatHistoryToToolExecution(msg);
                if (toolExecution) {
                  chatMessage.toolExecutions = [toolExecution];
                }
              }
              
              return chatMessage;
            });
          
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
    
    // Clear any persisted agent when showing welcome message
    localStorage.removeItem('selectedAgentId');
  }

  private updateMermaidOptions(theme: 'light' | 'dark'): void {
    this.options = {
      fontFamily: '"trebuchet ms", verdana, arial, sans-serif',
      logLevel: 'info',
      theme: theme === 'dark' ? 'dark' : 'default',
    };
  }

  onSubmit(): void {
    if (this.chatForm.valid && this.selectedAgent) {
      const messageContent = this.chatForm.get('message')?.value;
      
      // If no current session, create one
      if (!this.currentSessionId) {
        this.startNewSession();
        // Wait a bit for session creation, then send message
        const timeoutId = window.setTimeout(() => {
          this.sendMessage(messageContent);
          // Remove from pending timeouts
          const index = this.pendingTimeouts.indexOf(timeoutId);
          if (index > -1) this.pendingTimeouts.splice(index, 1);
        }, 500);
        this.pendingTimeouts.push(timeoutId);
        return;
      }
      
      this.sendMessage(messageContent);
    }
  }

  private sendMessage(messageContent: string): void {
    if (!this.selectedAgent || !this.currentSessionId) return;

    // Store images before clearing (they'll be cleared after sending)
    const imagesToSend = this.selectedImages.length > 0 ? [...this.selectedImages] : undefined;

    // Add user message with images
    const userMessage: ChatMessage = {
      id: this.generateId(),
      content: messageContent,
      isUser: true,
      timestamp: new Date(),
      showThinking: false,
      images: imagesToSend,
      isExpanded: false // Default to collapsed for long messages
    };
    this.messages.push(userMessage);

    // Clear form
    this.chatForm.patchValue({ message: '' });
    
    // Reset textarea height after clearing
    setTimeout(() => this.autoResizeTextarea(), 0);
    
    // Execute agent with session ID and images (pass images before clearing)
    this.executeAgent(messageContent, imagesToSend);
    
    // Clear selected images after starting the agent execution
    this.clearSelectedImages();
    
    this.scrollToBottom();
  }

  private executeAgent(userMessage: string, images?: ChatImage[]): void {
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
      isStreaming: true,
      showThinking: false
    };
    this.messages.push(streamingMessage);
    this.currentStreamingMessage = streamingMessage; // Track this message for precise updates

    // Force change detection for immediate display
    this.scrollToBottom();

    // Create abort controller for cancellation
    this.abortController = new AbortController();

    // Convert images to DTO format (use passed images or fallback to selectedImages)
    const imagesToUse = images || this.selectedImages;
    const imageDtos = imagesToUse && imagesToUse.length > 0 ? imagesToUse.map(img => ({
      data: img.data,
      mimeType: img.mimeType,
      name: img.name
    })) : undefined;

    console.log('[Frontend] Sending images count:', imageDtos?.length ?? 0);
    console.log('[Frontend] Images passed to executeAgent:', images?.length ?? 0);
    if (imageDtos && imageDtos.length > 0) {
      console.log('[Frontend] First image MIME type:', imageDtos[0].mimeType);
      console.log('[Frontend] First image data length:', imageDtos[0].data?.length ?? 0);
    }

    this.currentStreamSubscription = this.chatService.sendMessageStream(userMessage, this.selectedAgent.id, this.currentSessionId, imageDtos, this.abortController.signal).subscribe({
      next: (chunk: {type: string, data: string}) => {
        // Handle different types of streaming data
        if (chunk.type === 'content') {
          // Content chunk - no longer thinking/reasoning
          streamingMessage.content += chunk.data;
          streamingMessage.isThinking = false;
        } else if (chunk.type === 'thinking') {
          // Thinking/Reasoning chunk - actively thinking/reasoning
          streamingMessage.thinking = (streamingMessage.thinking || '') + chunk.data;
          streamingMessage.isThinking = true;
        }
        // Force change detection for live updates
        this.scrollToBottom();
      },
      complete: () => {
        // Streaming completed
        streamingMessage.isStreaming = false;
        streamingMessage.isThinking = false;
        this.isExecuting = false;
        
        // Clean up the subscription reference
        if (this.currentStreamSubscription) {
          this.currentStreamSubscription = null;
        }
        this.abortController = null;
        
        // Force change detection
        this.cdr.detectChanges();
        
        // Wait a moment for backend to process tool executions, then reload
        if (this.currentSessionId) {
          const timeoutId = window.setTimeout(() => {
            this.reloadChatHistory();
            // Force change detection after reloading chat history
            this.cdr.detectChanges();
            // Clear the streaming message reference after update
            this.currentStreamingMessage = null;
            // Remove from pending timeouts
            const index = this.pendingTimeouts.indexOf(timeoutId);
            if (index > -1) this.pendingTimeouts.splice(index, 1);
          }, 500); // Reduced delay for faster tool execution display
          this.pendingTimeouts.push(timeoutId);
        }
        
        this.scrollToBottom();
      },
      error: (error: any) => {
        // Check if it was cancelled
        if (error.name === 'AbortError' || error.message?.includes('aborted')) {
          // Remove streaming message and add cancellation message
          this.messages = this.messages.filter(msg => msg.id !== streamingMessage.id);
          
          this.messages.push({
            id: this.generateId(),
            content: '⏹️ Message generation stopped by user.',
            isUser: false,
            timestamp: new Date(),
            agentId: this.selectedAgent!.id,
            agentName: this.selectedAgent!.name
          });
        } else {
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
          
          this.notificationService.error('Error', 'Agent execution failed');
        }
        
        this.isExecuting = false;
        this.currentStreamSubscription = null;
        this.abortController = null;
        this.scrollToBottom();
      }
    });
  }

  stopStreaming(): void {
    // Cancel the streaming subscription
    if (this.currentStreamSubscription) {
      this.currentStreamSubscription.unsubscribe();
      this.currentStreamSubscription = null;
    }
    
    // Abort the ongoing request
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    
    // Reset execution state
    this.isExecuting = false;
    
    // Clear streaming message reference
    this.currentStreamingMessage = null;
    
    // Find and update the current streaming message
    const streamingMessage = this.messages.find(msg => msg.isStreaming);
    if (streamingMessage) {
      // Mark the message as no longer streaming
      streamingMessage.isStreaming = false;
      
      // If the message has no content, replace it with a stopped message
      if (!streamingMessage.content || streamingMessage.content.trim() === '') {
        streamingMessage.content = '⏹️ Message generation stopped by user.';
      } else {
        // If there's partial content, append the stopped indicator
        streamingMessage.content += '\n\n⏹️ *Generation stopped by user*';
      }
    }
    
    this.isExecuting = false;
    
    // Force change detection to update the UI immediately
    this.cdr.detectChanges();
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    const timeoutId = window.setTimeout(() => {
      if (this.chatContainer) {
        this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
      }
      // Remove from pending timeouts
      const index = this.pendingTimeouts.indexOf(timeoutId);
      if (index > -1) this.pendingTimeouts.splice(index, 1);
    }, 100);
    this.pendingTimeouts.push(timeoutId);
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  private reloadChatHistory(): void {
    if (!this.currentSessionId) return;
    
    this.subscription.add(
      this.chatService.getChatHistoryBySession(this.currentSessionId).subscribe({
        next: (history: ChatHistoryDto[]) => {
          // Process tool executions from chat history for summary
          this.processChatHistoryForToolExecutions(history);
          
          // Find the most recent agent message and update it with tool executions
          this.updateLatestAgentMessageWithToolExecutions(history);
          
          // Force change detection to ensure UI updates
          this.cdr.detectChanges();
          this.scrollToBottom();
        },
        error: (error: any) => {
          console.error('Error reloading chat history:', error);
        }
      })
    );
  }

  private updateLatestAgentMessageWithToolExecutions(history: ChatHistoryDto[]): void {
    console.log('Updating latest agent message with tool executions...');
    console.log('Current messages:', this.messages);
    console.log('History from backend:', history);
    console.log('Current streaming message:', this.currentStreamingMessage);
    
    // Use the tracked streaming message if available (most accurate)
    let latestAgentMessage = this.currentStreamingMessage;
    
    // If no tracked message, find the most recent agent message in the UI
    if (!latestAgentMessage) {
      latestAgentMessage = this.messages
        .filter(msg => !msg.isUser && msg.agentId)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
    }
    
    console.log('Latest agent message:', latestAgentMessage);
    
    if (!latestAgentMessage) {
      console.log('No latest agent message found');
      return;
    }
    
    // Find the corresponding history entry for this message
    // Strategy 1: Match by content (most reliable for the just-streamed message)
    let historyEntry = history.find(h => 
      h.role === 'assistant' && 
      h.agentId === latestAgentMessage!.agentId &&
      h.content && latestAgentMessage!.content &&
      h.content.trim() === latestAgentMessage!.content.trim()
    );
    
    // Strategy 2: Match by timestamp (within 10 seconds, tighter window)
    if (!historyEntry) {
      historyEntry = history.find(h => 
        h.role === 'assistant' && 
        h.agentId === latestAgentMessage!.agentId &&
        Math.abs(new Date(h.timestamp).getTime() - latestAgentMessage!.timestamp.getTime()) < 10000 // Within 10 seconds
      );
    }
    
    // Strategy 3: Match by content prefix (first 100 characters)
    if (!historyEntry) {
      const contentPrefix = latestAgentMessage.content.substring(0, 100).trim();
      historyEntry = history.find(h => 
        h.role === 'assistant' && 
        h.agentId === latestAgentMessage!.agentId &&
        h.content && contentPrefix &&
        h.content.substring(0, 100).trim() === contentPrefix
      );
    }
    
    // Strategy 4: Fallback - most recent assistant message with tool results
    if (!historyEntry) {
      historyEntry = history
        .filter(h => h.role === 'assistant' && h.agentId === latestAgentMessage!.agentId && h.toolResults && h.toolResults.length > 0)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    }
    
    console.log('Found history entry:', historyEntry);
    
    if (historyEntry && historyEntry.toolResults && historyEntry.toolResults.length > 0) {
      console.log('Tool results found:', historyEntry.toolResults);
      
      // Clear any existing tool executions to avoid duplicates
      latestAgentMessage.toolExecutions = [];
      
      // Update the message with tool executions
      latestAgentMessage.toolExecutions = historyEntry.toolResults
        .map((toolLog: ToolExecutionLogDto) => 
          this.convertToolExecutionLogToToolExecution(toolLog)
        )
        .sort((a, b) => a.executedAt.getTime() - b.executedAt.getTime());
      
      console.log('Updated message with tool executions:', latestAgentMessage);
      
      // Trigger change detection for this specific message
      this.triggerChangeDetection();
      
      // Also trigger change detection after a short delay to ensure UI updates
      const timeoutId = window.setTimeout(() => {
        this.cdr.detectChanges();
        // Remove from pending timeouts
        const index = this.pendingTimeouts.indexOf(timeoutId);
        if (index > -1) this.pendingTimeouts.splice(index, 1);
      }, 100);
      this.pendingTimeouts.push(timeoutId);
    } else {
      console.log('No tool results found for this message');
      // Clear tool executions if no results found (avoid showing old ones)
      latestAgentMessage.toolExecutions = [];
    }
  }

  private triggerChangeDetection(): void {
    // Force Angular change detection to update the UI
    // This is a lightweight way to update the specific message without refreshing the entire component
    this.cdr.detectChanges();
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

  toggleToolExecutions(): void {
    this.showToolExecutions = !this.showToolExecutions;
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

  // Tool execution methods
  addToolExecution(toolExecution: ToolExecution): void {
    this.allToolExecutions.push(toolExecution);
  }

  getToolExecutionsForSession(): ToolExecution[] {
    return this.allToolExecutions;
  }

  toggleToolSummary(): void {
    this.isToolSummaryExpanded = !this.isToolSummaryExpanded;
  }

  clearToolExecutions(): void {
    this.allToolExecutions = [];
  }

  // Convert ToolExecutionLogDto to ToolExecution
  convertToolExecutionLogToToolExecution(toolLog: ToolExecutionLogDto): ToolExecution {
    return {
      id: toolLog.id,
      toolId: toolLog.toolId,
      toolName: toolLog.toolName,
      tool: toolLog.tool ? {
        id: toolLog.tool.id,
        name: toolLog.tool.name,
        type: toolLog.tool.type,
        description: toolLog.tool.description
      } : undefined,
      agentId: toolLog.agentId,
      sessionId: toolLog.sessionId,
      parameters: toolLog.parameters || {},
      result: toolLog.result,
      success: toolLog.success,
      errorMessage: toolLog.errorMessage,
      executedAt: new Date(toolLog.executedAt),
      executionTime: toolLog.executionTime || 0,
      usedParameters: toolLog.usedParameters
    };
  }

  // Convert ChatHistoryDto to ToolExecution (legacy method for backward compatibility)
  convertChatHistoryToToolExecution(chatHistory: any): ToolExecution | null {
    if (!chatHistory.isToolExecution || !chatHistory.toolName) {
      return null;
    }

    return {
      id: chatHistory.id,
      toolId: chatHistory.id, // Use chat history ID as fallback
      toolName: chatHistory.toolName,
      agentId: chatHistory.agentId,
      sessionId: chatHistory.sessionId,
      parameters: {}, // We don't have parameters in legacy format
      result: chatHistory.toolResult || chatHistory.content,
      success: !chatHistory.toolResult?.includes('Error') && !chatHistory.content.includes('Error'),
      errorMessage: chatHistory.toolResult?.includes('Error') ? chatHistory.toolResult : undefined,
      executedAt: new Date(chatHistory.timestamp),
      executionTime: 0, // We don't have execution time in legacy format
      usedParameters: {}
    };
  }

  // Process chat history to extract tool executions
  processChatHistoryForToolExecutions(chatHistory: ChatHistoryDto[]): void {
    this.allToolExecutions = [];
    
    chatHistory.forEach(history => {
      // Process ToolResults array if available (new format)
      if (history.toolResults && Array.isArray(history.toolResults)) {
        history.toolResults.forEach((toolLog: ToolExecutionLogDto) => {
          const toolExecution = this.convertToolExecutionLogToToolExecution(toolLog);
          this.allToolExecutions.push(toolExecution);
        });
      }
      // Fallback to legacy single tool execution format
      else if (history.isToolExecution && history.toolName) {
        const toolExecution = this.convertChatHistoryToToolExecution(history);
        if (toolExecution) {
          this.allToolExecutions.push(toolExecution);
        }
      }
    });
    
    // Sort all tool executions by execution time
    this.allToolExecutions.sort((a, b) => a.executedAt.getTime() - b.executedAt.getTime());
  }

  isCurrentSession(sessionId: string): boolean {
    return this.currentSessionId === sessionId;
  }

  // Toggle thinking/reasoning section visibility
  toggleThinking(message: ChatMessage): void {
    message.showThinking = !message.showThinking;
  }

  // Get last thinking/reasoning phrase for preview (ChatGPT style)
  public getLastThinkingPhrase(thinking: string | undefined): string {
    if (!thinking) return '';
    
    // Get last sentence or last 100 characters
    const trimmed = thinking.trim();
    
    // Try to get the last sentence
    const lastPeriod = trimmed.lastIndexOf('.');
    if (lastPeriod > 0 && lastPeriod > trimmed.length - 100) {
      const lastSentence = trimmed.substring(Math.max(0, trimmed.lastIndexOf('.', lastPeriod - 1) + 1)).trim();
      return lastSentence || trimmed.substring(Math.max(0, trimmed.length - 100));
    }
    
    // If no period or too short, get last 100 characters
    return trimmed.length > 100 ? '...' + trimmed.substring(trimmed.length - 100) : trimmed;
  }

  // Get avatar from agent name (first two letters)
  public getAgentAvatarFromName(agentName: string | undefined): string {
    if (!agentName) return '??';
    const parts = agentName.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return agentName.substring(0, 2).toUpperCase();
  }

  // Image upload handling
  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      Array.from(input.files).forEach(file => {
        this.processImageFile(file);
      });
      // Reset input to allow selecting the same file again
      input.value = '';
    }
  }

  // Process image file and add to selected images
  private processImageFile(file: File): void {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        if (e.target?.result) {
          const dataUrl = e.target.result as string;
          const image: ChatImage = {
            data: dataUrl,
            mimeType: file.type,
            name: file.name
          };
          this.selectedImages.push(image);
          this.imagePreviewUrls.push(dataUrl);
          this.cdr.detectChanges();
        }
      };
      reader.readAsDataURL(file);
    }
  }

  // Handle paste event - detect images and format text
  onPaste(event: ClipboardEvent): void {
    const clipboardData = event.clipboardData;
    if (!clipboardData) return;

    // Check if clipboard contains image
    const items = Array.from(clipboardData.items);
    const imageItem = items.find(item => item.type.startsWith('image/'));

    if (imageItem) {
      // Prevent default paste behavior
      event.preventDefault();
      
      // Get image as file
      const file = imageItem.getAsFile();
      if (file) {
        this.processImageFile(file);
        this.notificationService.success('Image Pasted', 'Image has been added from clipboard', 3000);
      }
      return;
    }

    // Check if clipboard contains text
    const pastedText = clipboardData.getData('text');
    if (pastedText) {
      // Check if text needs formatting
      const formattedText = this.formatPastedText(pastedText);
      
      if (formattedText !== pastedText) {
        // Prevent default paste and use formatted text
        event.preventDefault();
        
        const currentValue = this.chatForm.get('message')?.value || '';
        const newValue = currentValue + formattedText;
        this.chatForm.patchValue({ message: newValue });
        
        // Auto-resize textarea after formatting
        setTimeout(() => this.autoResizeTextarea(), 0);
        
        this.notificationService.success('Text Formatted', 'Pasted text has been formatted', 2000);
      } else {
        // Auto-resize even for unformatted text
        setTimeout(() => this.autoResizeTextarea(), 0);
      }
    }
  }

  // Auto-resize textarea based on content
  onTextareaInput(event: Event): void {
    this.autoResizeTextarea();
  }

  // Handle keyboard events in textarea
  onTextareaKeydown(event: KeyboardEvent): void {
    // If Enter is pressed without Shift, submit the form
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault(); // Prevent new line
      
      // Only submit if form is valid and agent is selected
      if (this.chatForm.valid && this.selectedAgent && !this.isExecuting) {
        this.onSubmit();
      }
    }
    // Shift+Enter will allow default behavior (new line)
  }

  private autoResizeTextarea(): void {
    // Use ViewChild reference if available, otherwise fallback to querySelector
    const textarea = this.messageTextarea?.nativeElement || 
                     (document.querySelector('textarea[formControlName="message"]') as HTMLTextAreaElement);
    
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Set height based on content, with min and max constraints
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 48), 320); // 48px min (3rem), 320px max (20rem)
      textarea.style.height = newHeight + 'px';
      
      // Only show scrollbar if content exceeds max height
      if (textarea.scrollHeight > 320) {
        textarea.style.overflowY = 'auto';
      } else {
        textarea.style.overflowY = 'hidden';
      }
    }
  }

  // Format pasted text based on content type
  private formatPastedText(text: string): string {
    const trimmed = text.trim();
    
    // Check if it's JSON
    if (this.isJson(trimmed)) {
      try {
        const parsed = JSON.parse(trimmed);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return text;
      }
    }

    // Check if it's HTML
    if (this.isHtml(trimmed)) {
      // For HTML, try to format with basic indentation
      return this.formatHtml(trimmed);
    }

    // Check if it's XML
    if (this.isXml(trimmed)) {
      return this.formatXml(trimmed);
    }

    // Check if it's a URL
    if (this.isUrl(trimmed)) {
      return trimmed; // URLs should stay as is
    }

    // Check if it's very long (more than 500 characters)
    if (trimmed.length > 500) {
      // For long text, add line breaks every 100 characters at word boundaries
      return this.addLineBreaks(trimmed, 100);
    }

    return text;
  }

  // Check if text is valid JSON
  private isJson(text: string): boolean {
    if (!text.startsWith('{') && !text.startsWith('[')) {
      return false;
    }
    try {
      JSON.parse(text);
      return true;
    } catch {
      return false;
    }
  }

  // Check if text is HTML
  private isHtml(text: string): boolean {
    const htmlRegex = /<[a-z][\s\S]*>/i;
    return htmlRegex.test(text);
  }

  // Add line breaks to long text at word boundaries
  private addLineBreaks(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }

    const words = text.split(' ');
    let result = '';
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + word).length > maxLength && currentLine.length > 0) {
        result += currentLine.trim() + '\n';
        currentLine = word + ' ';
      } else {
        currentLine += word + ' ';
      }
    }

    if (currentLine.trim().length > 0) {
      result += currentLine.trim();
    }

    return result;
  }

  // Check if text is XML
  private isXml(text: string): boolean {
    if (!text.startsWith('<')) {
      return false;
    }
    // Basic XML detection - check for XML declaration or common XML tags
    return /^<\?xml|^<[a-z]+[\s>]/i.test(text);
  }

  // Format XML with basic indentation
  private formatXml(xml: string): string {
    // Simple XML formatting - add line breaks after tags
    let formatted = xml.replace(/>\s*</g, '>\n<');
    // Add indentation
    const lines = formatted.split('\n');
    let indent = 0;
    const indentSize = 2;
    
    return lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      
      if (trimmed.startsWith('</')) {
        indent--;
      }
      
      const indented = ' '.repeat(Math.max(0, indent * indentSize)) + trimmed;
      
      if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.endsWith('/>') && !trimmed.includes('<?')) {
        indent++;
      }
      
      return indented;
    }).join('\n');
  }

  // Format HTML with basic indentation
  private formatHtml(html: string): string {
    // Simple HTML formatting - add line breaks after tags
    let formatted = html.replace(/>\s*</g, '>\n<');
    // Add basic indentation
    const lines = formatted.split('\n');
    let indent = 0;
    const indentSize = 2;
    
    return lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      
      // Decrease indent for closing tags
      if (trimmed.startsWith('</')) {
        indent = Math.max(0, indent - 1);
      }
      
      const indented = ' '.repeat(indent * indentSize) + trimmed;
      
      // Increase indent for opening tags (but not self-closing or void elements)
      if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.endsWith('/>') && 
          !trimmed.match(/<(br|hr|img|input|meta|link|area|base|col|embed|source|track|wbr)/i)) {
        indent++;
      }
      
      return indented;
    }).join('\n');
  }

  // Check if text is a URL
  private isUrl(text: string): boolean {
    try {
      const url = new URL(text);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  removeImage(index: number): void {
    this.selectedImages.splice(index, 1);
    this.imagePreviewUrls.splice(index, 1);
    this.cdr.detectChanges();
  }

  clearSelectedImages(): void {
    this.selectedImages = [];
    this.imagePreviewUrls = [];
    this.cdr.detectChanges();
  }

  // Image modal methods
  openImageModal(imageSrc: string): void {
    this.selectedImageForModal = imageSrc;
    this.isImageModalOpen = true;
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
  }

  closeImageModal(): void {
    this.isImageModalOpen = false;
    this.selectedImageForModal = null;
    // Restore body scroll
    document.body.style.overflow = '';
  }

  // Handle ESC key to close modal
  @HostListener('document:keydown.escape', ['$event'])
  handleEscapeKey(event: KeyboardEvent): void {
    if (this.isImageModalOpen) {
      this.closeImageModal();
    }
  }

  // Check if message is long enough to show preview
  isLongMessage(message: ChatMessage): boolean {
    if (!message.content) return false;
    const lineCount = message.content.split('\n').length;
    return message.content.length > this.MESSAGE_PREVIEW_LENGTH || lineCount > this.MESSAGE_PREVIEW_LINES;
  }

  // Get preview text for long messages
  getMessagePreview(message: ChatMessage): string {
    if (!message.content) return '';
    if (!this.isLongMessage(message)) return message.content;
    
    // Try to cut at a word boundary or line break
    const preview = message.content.substring(0, this.MESSAGE_PREVIEW_LENGTH);
    const lastSpace = preview.lastIndexOf(' ');
    const lastNewline = preview.lastIndexOf('\n');
    const cutPoint = Math.max(lastSpace, lastNewline);
    
    // If we found a good break point (within 70% of target length), use it
    if (cutPoint > this.MESSAGE_PREVIEW_LENGTH * 0.7) {
      return message.content.substring(0, cutPoint).trim() + '...';
    }
    return preview.trim() + '...';
  }

  // Get the remaining text length after preview
  getRemainingLength(message: ChatMessage): number {
    if (!message.content || !this.isLongMessage(message)) return 0;
    const preview = this.getMessagePreview(message);
    return message.content.length - preview.length + 3; // +3 for "..."
  }

  // Toggle message expansion
  toggleMessageExpansion(message: ChatMessage): void {
    message.isExpanded = !message.isExpanded;
    this.cdr.detectChanges();
  }
}

