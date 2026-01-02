import { Injectable, signal, effect, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Theme = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly THEME_STORAGE_KEY = 'app-theme';
  private readonly themeSignal = signal<Theme>(this.getInitialTheme());
  private systemThemeMediaQuery?: MediaQueryList;
  private systemThemeListener?: (e: MediaQueryListEvent) => void;

  readonly theme = this.themeSignal.asReadonly();

  // Computed para obtener el tema efectivo (si es 'system', devuelve el tema del sistema)
  readonly effectiveTheme = signal<'light' | 'dark'>(this.getEffectiveTheme());

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      // Aplicar tema inicial solo en el navegador
      this.applyTheme(this.getEffectiveTheme());

      // Efecto para aplicar cambios de tema
      effect(() => {
        const theme = this.themeSignal();
        const effectiveTheme = this.getEffectiveTheme();
        this.effectiveTheme.set(effectiveTheme);
        this.applyTheme(effectiveTheme);
        this.saveTheme(theme);
        this.setupSystemThemeListener();
      });

      // Configurar listener inicial para cambios del sistema
      this.setupSystemThemeListener();
    }
  }

  /**
   * Obtiene el tema efectivo (si es 'system', devuelve el tema del sistema)
   */
  private getEffectiveTheme(): 'light' | 'dark' {
    const theme = this.themeSignal();
    if (theme === 'system') {
      if (isPlatformBrowser(this.platformId) && typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return 'light';
    }
    return theme;
  }

  /**
   * Configura el listener para cambios del sistema cuando el tema es 'system'
   */
  private setupSystemThemeListener(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Remover listener anterior si existe
    if (this.systemThemeListener && this.systemThemeMediaQuery) {
      this.systemThemeMediaQuery.removeEventListener('change', this.systemThemeListener);
    }

    // Solo escuchar cambios del sistema si el tema está en 'system'
    if (this.themeSignal() === 'system' && typeof window !== 'undefined' && window.matchMedia) {
      this.systemThemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.systemThemeListener = () => {
        const effectiveTheme = this.getEffectiveTheme();
        this.effectiveTheme.set(effectiveTheme);
        this.applyTheme(effectiveTheme);
      };
      this.systemThemeMediaQuery.addEventListener('change', this.systemThemeListener);
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
      return 'system'; // Por defecto system en SSR
    }

    // Verificar localStorage
    const savedTheme = localStorage.getItem(this.THEME_STORAGE_KEY) as Theme | null;
    if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
      return savedTheme;
    }

    // Por defecto usar el tema del sistema
    return 'system';
  }

  private applyTheme(theme: 'light' | 'dark'): void {
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

