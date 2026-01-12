import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Language = 'es' | 'en';

@Injectable({
  providedIn: 'root',
})
export class I18nService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly LANGUAGE_STORAGE_KEY = 'app-language';
  private readonly languageSignal = signal<Language>(this.getInitialLanguage());
  private translations: Record<string, Record<string, string>> = {};

  readonly language = this.languageSignal.asReadonly();

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      void this.loadTranslations();
    }
  }

  setLanguage(lang: Language): void {
    this.languageSignal.set(lang);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.LANGUAGE_STORAGE_KEY, lang);
    }
  }

  translate(key: string, params?: Record<string, string>): string {
    const lang = this.languageSignal();
    const translation = this.translations[lang]?.[key] || this.translations['es']?.[key] || key;

    if (params) {
      return Object.entries(params).reduce(
        (text, [paramKey, paramValue]) => text.replace(`{{${paramKey}}}`, paramValue),
        translation,
      );
    }

    return translation;
  }

  private getInitialLanguage(): Language {
    if (!isPlatformBrowser(this.platformId)) {
      return 'es'; // Por defecto español en SSR
    }

    const savedLang = localStorage.getItem(this.LANGUAGE_STORAGE_KEY) as Language | null;
    if (savedLang === 'es' || savedLang === 'en') {
      return savedLang;
    }
    return 'es'; // Por defecto español
  }

  private async loadTranslations(): Promise<void> {
    try {
      const [esTranslations, enTranslations] = await Promise.all([
        fetch('/assets/i18n/es.json').then((res) => res.json()),
        fetch('/assets/i18n/en.json').then((res) => res.json()),
      ]);

      this.translations = {
        es: esTranslations,
        en: enTranslations,
      };
    } catch (error) {
      console.error('Error loading translations:', error);
      this.translations = { es: {}, en: {} };
    }
  }
}
