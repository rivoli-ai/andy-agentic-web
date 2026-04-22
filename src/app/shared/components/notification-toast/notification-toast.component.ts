import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { NotificationService } from '../../../core/services/notification.service';
import { Notification, NotificationType } from '../../../models/notification.model';

@Component({
  standalone: false,
  selector: 'app-notification-toast',
  templateUrl: './notification-toast.component.html',
  styleUrls: ['./notification-toast.component.css'],
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateY(calc(100% + 12px))', opacity: 0 }),
        animate(
          '320ms cubic-bezier(0.16, 1, 0.3, 1)',
          style({ transform: 'translateY(0)', opacity: 1 })
        )
      ]),
      transition(':leave', [
        animate(
          '240ms cubic-bezier(0.4, 0, 1, 1)',
          style({ transform: 'translateY(12px)', opacity: 0 })
        )
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
    return `notification-toast w-full max-w-md ${type}`;
  }

  getProgressBarClasses(type: NotificationType): string {
    switch (type) {
      case NotificationType.SUCCESS:
        return 'bg-success-500';
      case NotificationType.ERROR:
        return 'bg-error-500';
      case NotificationType.WARNING:
        return 'bg-warning-500';
      case NotificationType.INFO:
        return 'bg-primary-500';
      default:
        return 'bg-ink-muted';
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
