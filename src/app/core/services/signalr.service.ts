import { Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import { BehaviorSubject, Observable } from 'rxjs';
import { AppConfigService } from '../config/app-config.service';

export interface DocumentRagStatusUpdate {
  documentId: string;
  agentId: string;
  isRagProcessed: boolean;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class SignalRService {
  private hubConnection: HubConnection | null = null;
  private connectionStateSubject = new BehaviorSubject<HubConnectionState>(HubConnectionState.Disconnected);
  private documentRagStatusSubject = new BehaviorSubject<DocumentRagStatusUpdate | null>(null);

  constructor(private appConfig: AppConfigService) {}

  /**
   * Starts the SignalR connection
   */
  async startConnection(): Promise<void> {
    if (this.hubConnection?.state === HubConnectionState.Connected) {
      return;
    }

    this.hubConnection = new HubConnectionBuilder()
      .withUrl(this.appConfig.signalRUrl)
      .withAutomaticReconnect()
      .build();

    // Listen for document RAG status updates
    this.hubConnection.on('DocumentRagStatusUpdated', (update: DocumentRagStatusUpdate) => {
      console.log('SignalR: Received RAG status update:', update);
      this.documentRagStatusSubject.next(update);
    });

    // Handle connection state changes
    this.hubConnection.onclose(() => {
      this.connectionStateSubject.next(HubConnectionState.Disconnected);
    });

    this.hubConnection.onreconnecting(() => {
      this.connectionStateSubject.next(HubConnectionState.Reconnecting);
    });

    this.hubConnection.onreconnected(() => {
      this.connectionStateSubject.next(HubConnectionState.Connected);
    });

    try {
      await this.hubConnection.start();
      this.connectionStateSubject.next(HubConnectionState.Connected);
      console.log('SignalR connection started');
    } catch (error) {
      console.error('Error starting SignalR connection:', error);
      this.connectionStateSubject.next(HubConnectionState.Disconnected);
    }
  }

  /**
   * Stops the SignalR connection
   */
  async stopConnection(): Promise<void> {
    if (this.hubConnection) {
      await this.hubConnection.stop();
      this.hubConnection = null;
      this.connectionStateSubject.next(HubConnectionState.Disconnected);
      console.log('SignalR connection stopped');
    }
  }

  /**
   * Joins an agent group to receive RAG status updates for that agent
   */
  async joinAgentGroup(agentId: string): Promise<void> {
    console.log(`Attempting to join agent group: ${agentId}, Connection state: ${this.hubConnection?.state}`);
    if (this.hubConnection?.state === HubConnectionState.Connected) {
      try {
        await this.hubConnection.invoke('JoinAgentGroup', agentId);
        console.log(`Successfully joined agent group: ${agentId}`);
      } catch (error) {
        console.error('Error joining agent group:', error);
      }
    } else {
      console.warn('Cannot join agent group - SignalR not connected');
    }
  }

  /**
   * Leaves an agent group
   */
  async leaveAgentGroup(agentId: string): Promise<void> {
    if (this.hubConnection?.state === HubConnectionState.Connected) {
      try {
        await this.hubConnection.invoke('LeaveAgentGroup', agentId);
        console.log(`Left agent group: ${agentId}`);
      } catch (error) {
        console.error('Error leaving agent group:', error);
      }
    }
  }

  /**
   * Gets the current connection state
   */
  getConnectionState(): Observable<HubConnectionState> {
    return this.connectionStateSubject.asObservable();
  }

  /**
   * Gets document RAG status updates
   */
  getDocumentRagStatusUpdates(): Observable<DocumentRagStatusUpdate | null> {
    return this.documentRagStatusSubject.asObservable();
  }

  /**
   * Checks if the connection is active
   */
  isConnected(): boolean {
    return this.hubConnection?.state === HubConnectionState.Connected;
  }
}
