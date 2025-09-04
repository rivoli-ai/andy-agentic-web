import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Notification, NotificationType } from '../../models/notification.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$: Observable<Notification[]> = this.notificationsSubject.asObservable();

  constructor() {}

  private show(notification: Partial<Notification>): string {
    const id = this.generateId();
    const newNotification: Notification = {
      id,
      type: notification.type || NotificationType.INFO,
      title: notification.title || '',
      message: notification.message || '',
      isVisible: true,
      createdAt: new Date(),
      options: notification.options
    };

    const currentNotifications = this.notificationsSubject.value;
    this.notificationsSubject.next([...currentNotifications, newNotification]);

    // Auto-hide after duration or default to 5 seconds
    const duration = notification.options?.duration || 5000;
    if (duration > 0) {
      setTimeout(() => this.hide(id), duration);
    }

    return id;
  }

  success(title: string, message: string, duration?: number): string {
    return this.show({ 
      type: NotificationType.SUCCESS, 
      title, 
      message, 
      options: { duration } 
    });
  }

  error(title: string, message: string, duration?: number): string {
    return this.show({ 
      type: NotificationType.ERROR, 
      title, 
      message, 
      options: { duration } 
    });
  }

  warning(title: string, message: string, duration?: number): string {
    return this.show({ 
      type: NotificationType.WARNING, 
      title, 
      message, 
      options: { duration } 
    });
  }

  info(title: string, message: string, duration?: number): string {
    return this.show({ 
      type: NotificationType.INFO, 
      title, 
      message, 
      options: { duration } 
    });
  }

  hide(id: string): void {
    const currentNotifications = this.notificationsSubject.value;
    const updatedNotifications = currentNotifications.map(notification =>
      notification.id === id ? { ...notification, isVisible: false } : notification
    );
    this.notificationsSubject.next(updatedNotifications);

    // Remove from array after animation
    setTimeout(() => {
      const filteredNotifications = this.notificationsSubject.value.filter(
        notification => notification.id !== id
      );
      this.notificationsSubject.next(filteredNotifications);
    }, 300);
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
