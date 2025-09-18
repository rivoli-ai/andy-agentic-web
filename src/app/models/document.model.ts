export interface Document {
  id: string;
  name: string;
  description?: string;
  content: string;
  type: DocumentType;
  size: number;
  agentId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdByUserId?: string;
  isPublic: boolean;
  isRagProcessed: boolean;
  metadata?: DocumentMetadata;
}

export enum DocumentType {
  TEXT = 'text',
  MARKDOWN = 'markdown',
  PDF = 'pdf',
  DOCX = 'docx',
  TXT = 'txt',
  JSON = 'json',
  XML = 'xml',
  CSV = 'csv',
  HTML = 'html'
}

export interface DocumentMetadata {
  originalFileName?: string;
  mimeType?: string;
  encoding?: string;
  language?: string;
  wordCount?: number;
  pageCount?: number;
  lastModified?: Date;
  tags?: string[];
  category?: string;
}

export interface CreateDocumentDto {
  name: string;
  description?: string;
  content: string;
  type: DocumentType;
  agentId: string;
  isActive?: boolean;
  isPublic?: boolean;
  metadata?: DocumentMetadata;
}

export interface UpdateDocumentDto {
  name?: string;
  description?: string;
  content?: string;
  type?: DocumentType;
  isActive?: boolean;
  isPublic?: boolean;
  metadata?: DocumentMetadata;
}

export interface DocumentUploadResponse {
  success: boolean;
  document?: Document;
  error?: string;
  message?: string;
}
