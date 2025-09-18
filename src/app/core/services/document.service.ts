import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay, catchError, map } from 'rxjs/operators';
import { Document, CreateDocumentDto, UpdateDocumentDto, DocumentUploadResponse } from '../../models/document.model';
import { ApiService } from './api.service';

// Backend DTOs
interface DocumentDto {
  id: string;
  name: string;
  description?: string;
  content: string;
  type: string;
  size: number;
  agentId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdByUserId?: string;
  isPublic: boolean;
  metadata?: string;
  isRagProcessed: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  constructor(private apiService: ApiService) {}

  // Convert backend DTOs to frontend models
  private mapDocumentDto(dto: DocumentDto): Document {
    return {
      id: dto.id,
      name: dto.name,
      description: dto.description,
      content: dto.content,
      type: dto.type as any,
      size: dto.size,
      agentId: dto.agentId,
      isActive: dto.isActive,
      createdAt: new Date(dto.createdAt),
      updatedAt: new Date(dto.updatedAt),
      createdByUserId: dto.createdByUserId,
      isPublic: dto.isPublic,
      isRagProcessed: dto.isRagProcessed,
      metadata: dto.metadata ? JSON.parse(dto.metadata) : undefined
    };
  }

  // Convert frontend models to backend DTOs
  private mapToDocumentDto(document: CreateDocumentDto | UpdateDocumentDto): any {
    return {
      ...document,
      metadata: document.metadata ? JSON.stringify(document.metadata) : undefined
    };
  }

  // Get all documents
  getDocuments(): Observable<Document[]> {
    return this.apiService.get<DocumentDto[]>('/documents').pipe(
      map(dtos => dtos.map(dto => this.mapDocumentDto(dto))),
      catchError(error => {
        console.error('Error fetching documents:', error);
        return throwError(() => new Error('Failed to fetch documents'));
      })
    );
  }

  // Get documents by agent ID
  getDocumentsByAgentId(agentId: string): Observable<Document[]> {
    return this.apiService.get<DocumentDto[]>(`/documents/agent/${agentId}`).pipe(
      map(dtos => dtos.map(dto => this.mapDocumentDto(dto))),
      catchError(error => {
        console.error('Error fetching documents for agent:', error);
        return throwError(() => new Error('Failed to fetch documents for agent'));
      })
    );
  }

  // Get document by ID
  getDocumentById(id: string): Observable<Document> {
    return this.apiService.get<DocumentDto>(`/documents/${id}`).pipe(
      map(dto => this.mapDocumentDto(dto)),
      catchError(error => {
        console.error('Error fetching document:', error);
        return throwError(() => new Error('Failed to fetch document'));
      })
    );
  }

  // Create new document
  createDocument(document: CreateDocumentDto): Observable<Document> {
    const dto = this.mapToDocumentDto(document);
    
    return this.apiService.post<DocumentDto>('/documents', dto).pipe(
      map(responseDto => this.mapDocumentDto(responseDto)),
      catchError(error => {
        console.error('Error creating document:', error);
        return throwError(() => new Error('Failed to create document'));
      })
    );
  }

  // Update document
  updateDocument(id: string, document: UpdateDocumentDto): Observable<Document> {
    const dto = this.mapToDocumentDto(document);
    
    return this.apiService.put<DocumentDto>(`/documents/${id}`, dto).pipe(
      map(responseDto => this.mapDocumentDto(responseDto)),
      catchError(error => {
        console.error('Error updating document:', error);
        return throwError(() => new Error('Failed to update document'));
      })
    );
  }

  // Delete document
  deleteDocument(id: string): Observable<void> {
    return this.apiService.delete<void>(`/documents/${id}`).pipe(
      catchError(error => {
        console.error('Error deleting document:', error);
        return throwError(() => new Error('Failed to delete document'));
      })
    );
  }

  // Upload document file
  uploadDocument(agentId: string, file: File): Observable<DocumentUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('agentId', agentId);

    return this.apiService.post<DocumentUploadResponse>('/documents/upload', formData).pipe(
      catchError(error => {
        console.error('Error uploading document:', error);
        return throwError(() => new Error('Failed to upload document'));
      })
    );
  }

  // Download document
  downloadDocument(id: string): Observable<Blob> {
    return this.apiService.getBlob(`/documents/${id}/download`).pipe(
      catchError(error => {
        console.error('Error downloading document:', error);
        return throwError(() => new Error('Failed to download document'));
      })
    );
  }

  // Get document content
  getDocumentContent(id: string): Observable<string> {
    return this.apiService.get<string>(`/documents/${id}/content`).pipe(
      catchError(error => {
        console.error('Error fetching document content:', error);
        return throwError(() => new Error('Failed to fetch document content'));
      })
    );
  }

  // Search documents
  searchDocuments(query: string, agentId?: string): Observable<Document[]> {
    const params: any = { q: query };
    if (agentId) {
      params.agentId = agentId;
    }

    return this.apiService.get<DocumentDto[]>('/documents/search', params).pipe(
      map(dtos => dtos.map(dto => this.mapDocumentDto(dto))),
      catchError(error => {
        console.error('Error searching documents:', error);
        return throwError(() => new Error('Failed to search documents'));
      })
    );
  }


  // Remove document from agent (handles RAG removal)
  removeDocumentFromAgent(agentId: string, documentId: string): Observable<void> {
    return this.apiService.delete<void>(`/documents/associate?agentId=${agentId}&documentId=${documentId}`).pipe(
      catchError(error => {
        console.error('Error removing document from agent:', error);
        return throwError(() => new Error('Failed to remove document from agent'));
      })
    );
  }
}
