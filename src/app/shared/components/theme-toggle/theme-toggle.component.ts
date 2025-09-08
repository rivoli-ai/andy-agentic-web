import { Component, OnInit } from '@angular/core';
import { ThemeService } from '../../../core/services/theme.service';
import { Theme } from 'src/app/models/theme.model';

@Component({
  selector: 'app-theme-toggle',
  templateUrl: './theme-toggle.component.html',
  styleUrls: ['./theme-toggle.component.css']
})
export class ThemeToggleComponent implements OnInit {
  currentTheme: Theme = 'dark';
  isTransitioning = false;

  constructor(private themeService: ThemeService) {}

  ngOnInit(): void {
    this.themeService.currentTheme$.subscribe((theme: Theme) => {
      this.currentTheme = theme;
      // Reset transitioning state after theme change
      setTimeout(() => {
        this.isTransitioning = false;
      }, 200);
    });
  }

  toggleTheme(): void {
    if (this.isTransitioning) return;
    
    this.isTransitioning = true;
    this.themeService.toggleTheme();
  }

  setTheme(theme: Theme): void {
    if (this.isTransitioning) return;
    
    this.isTransitioning = true;
    this.themeService.setTheme(theme);
  }
}
