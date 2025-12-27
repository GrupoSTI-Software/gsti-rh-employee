import { Injectable, signal, effect, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly THEME_STORAGE_KEY = 'app-theme';
  private readonly themeSignal = signal<Theme>(this.getInitialTheme());

  readonly theme = this.themeSignal.asReadonly();

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      // Aplicar tema inicial solo en el navegador
      this.applyTheme(this.themeSignal());

      // Efecto para aplicar cambios de tema
      effect(() => {
        const theme = this.themeSignal();
        this.applyTheme(theme);
        this.saveTheme(theme);
      });

      // Escuchar cambios del sistema
      if (typeof window !== 'undefined' && window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', () => {
          if (!localStorage.getItem(this.THEME_STORAGE_KEY)) {
            this.setTheme(mediaQuery.matches ? 'dark' : 'light');
          }
        });
      }
    }
  }

  setTheme(theme: Theme): void {
    this.themeSignal.set(theme);
  }

  toggleTheme(): void {
    this.setTheme(this.themeSignal() === 'light' ? 'dark' : 'light');
  }

  private getInitialTheme(): Theme {
    if (!isPlatformBrowser(this.platformId)) {
      return 'light'; // Por defecto light en SSR
    }

    // Primero verificar localStorage
    const savedTheme = localStorage.getItem(
      this.THEME_STORAGE_KEY
    ) as Theme | null;
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }

    // Luego verificar preferencia del sistema
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }

    // Por defecto light
    return 'light';
  }

  private applyTheme(theme: Theme): void {
    if (isPlatformBrowser(this.platformId) && typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }

  private saveTheme(theme: Theme): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.THEME_STORAGE_KEY, theme);
    }
  }
}

