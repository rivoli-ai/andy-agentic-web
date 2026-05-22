import { Injectable } from '@angular/core';
import { Observable, of, throwError, firstValueFrom } from 'rxjs';
import { delay, catchError, map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AppConfigService } from '../config/app-config.service';
import { AuthService } from '../auth/services/auth.service';

export interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  agentId?: string;
  agentName?: string;
  userId?: string;
  thinking?: string;
}

export interface ChatResponse {
  response: string;
  agentName: string;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
  tokensUsed?: number;
  responseTime?: number;
}

export interface ChatImageDto {
  data: string; // base64 encoded image data (with data URI prefix)
  mimeType: string;
  name?: string;
}

export interface CreateChatMessageDto {
  content: string;
  agentId: string;
  sessionId?: string;
  images?: ChatImageDto[];
}

export interface ChatSessionDto {
  sessionId: string;
  agentId: string;
  agentName: string;
  startedAt: Date;
  lastActivityAt: Date;
  messageCount: number;
  totalTokens: number;
  sessionTitle?: string;
  description?: string; // First user message as session description
  isActive: boolean;
}

export interface ToolExecutionLogDto {
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

export interface ChatHistoryDto {
  id: string;
  content: string;
  role: string;
  agentName: string;
  timestamp: Date;
  agentId: string;
  sessionId: string;
  tokenCount: number;
  isToolExecution: boolean;
  toolName?: string;
  toolResult?: string;
  toolResults: ToolExecutionLogDto[];
  thinking?: string;
  images?: ChatImageDto[];
}

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  constructor(
    private apiService: ApiService,
    private http: HttpClient,
    private authService: AuthService,
    private appConfig: AppConfigService
  ) {}

  private getAccessToken(): Promise<string | null> {
    return Promise.resolve(this.authService.getToken());
  }

  // Send message with optional session ID
  sendMessage(content: string, agentId: string, sessionId?: string): Observable<ChatResponse> {
    const message: CreateChatMessageDto = {
      content,
      agentId,
      sessionId,
    };

    return this.apiService.post<ChatResponse>('/chat', message);
  }

  // Send streaming message with optional session ID, images, and abort signal
  sendMessageStream(
    content: string,
    agentId: string,
    sessionId?: string,
    images?: ChatImageDto[],
    abortSignal?: AbortSignal
  ): Observable<{ type: string; data: string }> {
    const message: CreateChatMessageDto = {
      content,
      agentId,
      sessionId,
      images,
    };

    return new Observable<{ type: string; data: string }>(observer => {
      let cancelled = false;
      let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

      const teardown = () => {
        cancelled = true;
        reader?.cancel().catch(() => undefined);
      };

      this.getAccessToken()
        .then(token => {
          if (cancelled) {
            return;
          }

          if (!token) {
            observer.error(new Error('No access token available'));
            return;
          }

          // Use fetch with proper authentication headers and abort signal
          fetch(`${this.appConfig.apiUrl}/chat/stream`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(message),
            signal: abortSignal,
          })
            .then(response => {
              if (cancelled) {
                return;
              }

              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }

              reader = response.body?.getReader() ?? null;
              if (!reader) {
                throw new Error('No response body');
              }

              const decoder = new TextDecoder();
              let lineBuffer = '';

              const processSseLine = (line: string) => {
                if (cancelled) {
                  return;
                }

                if (!line.startsWith('data: ')) {
                  return;
                }

                const data = line.substring(6).trim();
                if (data === '[DONE]') {
                  observer.complete();
                  return;
                }
                if (!data) {
                  return;
                }

                try {
                  const parsed = JSON.parse(data);
                  if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
                    const delta = parsed.choices[0].delta;
                    if (delta.thinking) {
                      observer.next({ type: 'thinking', data: delta.thinking });
                    } else if (delta.content) {
                      observer.next({ type: 'content', data: delta.content });
                    }
                  }
                  if (
                    parsed.choices &&
                    parsed.choices[0] &&
                    parsed.choices[0].finish_reason === 'stop'
                  ) {
                    observer.complete();
                  }
                } catch (error) {
                  console.warn(
                    'Failed to parse streaming response as JSON, treating as plain text:',
                    error
                  );
                  observer.next({ type: 'content', data: data });
                }
              };

              const readChunk = () => {
                if (cancelled || !reader) {
                  return;
                }

                reader
                  .read()
                  .then(({ done, value }) => {
                    if (cancelled) {
                      return;
                    }

                    if (done) {
                      if (lineBuffer.trim()) {
                        processSseLine(lineBuffer);
                      }
                      observer.complete();
                      return;
                    }

                    lineBuffer += decoder.decode(value, { stream: true });
                    const lines = lineBuffer.split('\n');
                    lineBuffer = lines.pop() ?? '';

                    lines.forEach(processSseLine);

                    readChunk();
                  })
                  .catch(error => {
                    if (cancelled) {
                      return;
                    }

                    // Check if the error is due to abort
                    if (error.name === 'AbortError') {
                      observer.error(new Error('Request aborted by user'));
                    } else {
                      observer.error(error);
                    }
                  });
              };

              readChunk();
            })
            .catch(error => {
              if (cancelled) {
                return;
              }

              // Check if the error is due to abort
              if (error.name === 'AbortError') {
                observer.error(new Error('Request aborted by user'));
              } else {
                observer.error(error);
              }
            });
        })
        .catch(error => {
          if (!cancelled) {
            observer.error(error);
          }
        });

      return teardown;
    });
  }

  // Get chat history for a specific session
  getChatHistoryBySession(sessionId: string): Observable<ChatHistoryDto[]> {
    return this.apiService.get<ChatHistoryDto[]>(`/chat/history/session/${sessionId}`).pipe(
      catchError(error => {
        console.warn('Session history endpoint not available yet:', error);
        return of([]); // Return empty array as fallback
      })
    );
  }

  // Get chat history for an agent
  getChatHistory(agentId: string): Observable<ChatHistoryDto[]> {
    return this.apiService.get<ChatHistoryDto[]>(`/chat/history/${agentId}`).pipe(
      catchError(error => {
        console.warn('Agent history endpoint not available yet:', error);
        return of([]); // Return empty array as fallback
      })
    );
  }

  // Get all chat sessions for an agent
  getChatSessions(agentId?: string): Observable<ChatSessionDto[]> {
    const url = agentId ? `/chat/sessions?agentId=${agentId}` : '/chat/sessions';
    return this.apiService.get<ChatSessionDto[]>(url).pipe(
      catchError(error => {
        console.warn('Sessions endpoint not available yet:', error);
        return of([]); // Return empty array as fallback
      })
    );
  }

  // Get a specific chat session
  getChatSession(sessionId: string): Observable<ChatSessionDto> {
    return this.apiService.get<ChatSessionDto>(`/chat/sessions/${sessionId}`).pipe(
      catchError(error => {
        console.warn('Session endpoint not available yet:', error);
        return of({} as ChatSessionDto); // Return empty session as fallback
      })
    );
  }

  // Create a new chat session
  createNewChatSession(agentId: string, sessionTitle?: string): Observable<string> {
    const body = { agentId, sessionTitle };
    return this.apiService.post<{ sessionId: string }>('/chat/sessions', body).pipe(
      map(response => response.sessionId),
      catchError(error => {
        console.warn('Create session endpoint not available yet:', error);
        // Generate a local session ID as fallback
        const fallbackSessionId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        return of(fallbackSessionId);
      })
    );
  }

  // Close a chat session
  closeChatSession(sessionId: string): Observable<boolean> {
    return this.apiService.put<boolean>(`/chat/sessions/${sessionId}/close`, {}).pipe(
      catchError(error => {
        console.warn('Close session endpoint not available yet:', error);
        return of(true); // Return success as fallback
      })
    );
  }

  // Delete a chat session
  deleteChatSession(sessionId: string): Observable<boolean> {
    return this.apiService.delete<boolean>(`/chat/sessions/${sessionId}`).pipe(
      catchError(error => {
        console.warn('Delete session endpoint not available yet:', error);
        return of(true); // Return success as fallback
      })
    );
  }

  // Rename a chat session
  renameChatSession(sessionId: string, newTitle: string): Observable<boolean> {
    return this.apiService.put<boolean>(`/chat/sessions/${sessionId}/rename`, { newTitle }).pipe(
      catchError(error => {
        console.warn('Rename session endpoint not available yet:', error);
        return of(true); // Return success as fallback
      })
    );
  }

  // Search chat messages
  searchChatMessages(searchTerm: string, agentId?: string): Observable<ChatHistoryDto[]> {
    const url = agentId
      ? `/chat/search?term=${searchTerm}&agentId=${agentId}`
      : `/chat/search?term=${searchTerm}`;
    return this.apiService.get<ChatHistoryDto[]>(url).pipe(
      catchError(error => {
        console.warn('Search endpoint not available yet:', error);
        return of([]); // Return empty array as fallback
      })
    );
  }

  // Get chat history summary
  getChatHistorySummary(agentId?: string): Observable<any> {
    const url = agentId ? `/chat/summary?agentId=${agentId}` : '/chat/summary';
    return this.apiService.get<any>(url).pipe(
      catchError(error => {
        console.warn('Summary endpoint not available yet:', error);
        return of({}); // Return empty object as fallback
      })
    );
  }
}
