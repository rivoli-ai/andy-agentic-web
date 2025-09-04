import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { TagDto } from '../../models/agent.model';
import { ApiService } from './api.service';

// Backend DTO for tags
interface TagDtoResponse {
  id: string;
  name: string;
  color: string;
}

@Injectable({
  providedIn: 'root'
})
export class TagService {
  constructor(private apiService: ApiService) {}

  // Get all available tags from the API
  getTags(): Observable<TagDto[]> {
    return this.apiService.get<TagDtoResponse[]>('/tags').pipe(
      map(tags => tags.map(tag => ({
        id: tag.id,
        name: tag.name,
        color: tag.color
      }))),
      catchError(error => {
        console.error('Error fetching tags:', error);
        // Return empty array on error to prevent breaking the UI
        return of([]);
      })
    );
  }

  // Get tag by ID
  getTagById(id: string): Observable<TagDto> {
    return this.apiService.get<TagDtoResponse>(`/tags/${id}`).pipe(
      map(tag => ({
        id: tag.id,
        name: tag.name,
        color: tag.color
      })),
      catchError(error => {
        console.error('Error fetching tag:', error);
        return throwError(() => new Error('Failed to fetch tag'));
      })
    );
  }

  // Create a new tag
  createTag(tag: Omit<TagDto, 'id'>): Observable<TagDto> {
    return this.apiService.post<TagDtoResponse>('/tags', tag).pipe(
      map(response => ({
        id: response.id,
        name: response.name,
        color: response.color
      })),
      catchError(error => {
        console.error('Error creating tag:', error);
        return throwError(() => new Error('Failed to create tag'));
      })
    );
  }

  // Update an existing tag
  updateTag(id: string, tag: Partial<TagDto>): Observable<TagDto> {
    return this.apiService.put<TagDtoResponse>(`/tags/${id}`, tag).pipe(
      map(response => ({
        id: response.id,
        name: response.name,
        color: response.color
      })),
      catchError(error => {
        console.error('Error updating tag:', error);
        return throwError(() => new Error('Failed to update tag'));
      })
    );
  }

  // Delete a tag
  deleteTag(id: string): Observable<void> {
    return this.apiService.delete<void>(`/tags/${id}`).pipe(
      catchError(error => {
        console.error('Error deleting tag:', error);
        return throwError(() => new Error('Failed to delete tag'));
      })
    );
  }
}
