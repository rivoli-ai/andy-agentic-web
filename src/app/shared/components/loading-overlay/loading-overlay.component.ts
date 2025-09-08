import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading-overlay',
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/90 backdrop-blur-md">
      <div class="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 max-w-md mx-4 text-center transform transition-all duration-300 ease-out">
        <!-- Logo/Icon -->
        <div class="mb-6">
          <div class="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg mb-4 relative overflow-hidden">
            <!-- Animated background -->
            <div class="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 opacity-20 animate-pulse"></div>
            
            <!-- Spinner -->
            <svg class="animate-spin h-10 w-10 text-white relative z-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          
          <!-- Title -->
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">{{ title }}</h2>
          <p class="text-gray-600 dark:text-gray-300 mb-4">{{ message }}</p>
          
          <!-- Progress Bar -->
          <div *ngIf="showProgress" class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
            <div 
              class="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500 ease-out"
              [style.width.%]="progress"
            ></div>
          </div>
          
          <!-- Steps -->
          <div *ngIf="steps && steps.length > 0" class="text-left space-y-2">
            <div 
              *ngFor="let step of steps; let i = index" 
              class="flex items-center text-sm"
              [class.text-gray-400]="i > currentStep"
              [class.text-blue-600]="i === currentStep"
              [class.text-green-600]="i < currentStep"
            >
              <div 
                class="w-5 h-5 rounded-full flex items-center justify-center mr-3 flex-shrink-0"
                [class.bg-blue-100]="i === currentStep"
                [class.bg-green-100]="i < currentStep"
                [class.bg-gray-100]="i > currentStep"
              >
                <svg *ngIf="i < currentStep" class="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>
                <div *ngIf="i === currentStep" class="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                <div *ngIf="i > currentStep" class="w-2 h-2 bg-gray-300 rounded-full"></div>
              </div>
              <span>{{ step }}</span>
            </div>
          </div>
        </div>
        
        <!-- Additional Info -->
        <div *ngIf="additionalInfo" class="text-sm text-gray-500 dark:text-gray-400">
          {{ additionalInfo }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    .animate-pulse {
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
  `]
})
export class LoadingOverlayComponent {
  @Input() title: string = 'Loading...';
  @Input() message: string = 'Please wait while we process your request.';
  @Input() showProgress: boolean = false;
  @Input() progress: number = 0;
  @Input() steps: string[] = [];
  @Input() currentStep: number = 0;
  @Input() additionalInfo: string = '';
}
