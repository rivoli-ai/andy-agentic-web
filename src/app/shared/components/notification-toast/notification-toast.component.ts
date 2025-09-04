import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { NotificationService } from '../../../core/services/notification.service';
import { Notification, NotificationType } from '../../../models/notification.model';

@Component({
  selector: 'app-notification-toast',
  templateUrl: './notification-toast.component.html',
  styleUrls: ['./notification-toast.component.css'],
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateX(100%)', opacity: 0 }))
      ])
    ])
  ]
})
export class NotificationToastComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  private subscription = new Subscription();
  private progressIntervals = new Map<string, any>();

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.subscription.add(
      this.notificationService.notifications$.subscribe(notifications => {
        this.notifications = notifications;
        this.updateProgressBars();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.clearAllProgressIntervals();
  }

  hideNotification(id: string): void {
    this.notificationService.hide(id);
  }

  getNotificationClasses(type: NotificationType): string {
    const baseClasses = 'notification-toast';
    return `${baseClasses} ${type}`;
  }

  getProgressBarClasses(type: NotificationType): string {
    switch (type) {
      case NotificationType.SUCCESS:
        return 'bg-green-500';
      case NotificationType.ERROR:
        return 'bg-red-500';
      case NotificationType.WARNING:
        return 'bg-yellow-500';
      case NotificationType.INFO:
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  }

  getProgressPercentage(id: string): number {
    const notification = this.notifications.find(n => n.id === id);
    if (!notification || !notification.options || !notification.options.duration) return 100;

    const elapsed = Date.now() - notification.createdAt.getTime();
    const duration = notification.options.duration;
    const percentage = Math.max(0, 100 - (elapsed / duration) * 100);
    
    return Math.round(percentage);
  }

  private updateProgressBars(): void {
    this.clearAllProgressIntervals();
    
    this.notifications.forEach(notification => {
      if (notification.options && notification.options.duration && notification.options.duration > 0) {
        const interval = setInterval(() => {
          // Force la mise à jour de la vue
          this.notifications = [...this.notifications];
        }, 100);
        
        this.progressIntervals.set(notification.id, interval);
        
        // Arrêter l'intervalle après la durée
        setTimeout(() => {
          const interval = this.progressIntervals.get(notification.id);
          if (interval) {
            clearInterval(interval);
            this.progressIntervals.delete(notification.id);
          }
        }, notification.options.duration);
      }
    });
  }

  private clearAllProgressIntervals(): void {
    this.progressIntervals.forEach(interval => clearInterval(interval));
    this.progressIntervals.clear();
  }
}
