import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { LoggerService } from './logger.service';
import { SecureStorageService } from './secure-storage.service';

export type Language = 'es' | 'en';

/**
 * Clave para almacenar el idioma de la aplicación
 */
const LANGUAGE_STORAGE_KEY = 'app-language';

/**
 * Servicio de internacionalización
 * Maneja la carga de traducciones y el cambio de idioma
 */
@Injectable({
  providedIn: 'root',
})
export class I18nService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly logger = inject(LoggerService);
  private readonly secureStorage = inject(SecureStorageService);

  private translations: Record<string, Record<string, string>> = {};
  private currentLang: Language = 'es';

  /**
   * Cambia el idioma de la aplicación
   */
  async setLanguage(lang: Language): Promise<void> {
    this.currentLang = lang;
    if (isPlatformBrowser(this.platformId)) {
      this.secureStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    }
    await this.loadTranslations(lang);
  }

  /**
   * Traduce una clave
   */
  translate(key: string, params?: Record<string, string>): string {
    const lang = this.currentLang;
    const translation = this.translations[lang]?.[key] || this.translations['es']?.[key] || key;

    if (params) {
      return Object.entries(params).reduce(
        (text, [paramKey, paramValue]) => text.replace(`{{${paramKey}}}`, paramValue),
        translation,
      );
    }

    return translation;
  }

  /**
   * Inicializa el servicio con el idioma guardado o por defecto
   */
  async initialize(): Promise<void> {
    const savedLang = this.secureStorage.getItem(LANGUAGE_STORAGE_KEY) as Language | null;
    const lang = savedLang ?? 'es';
    await this.setLanguage(lang);
  }

  /**
   * Obtiene el idioma actual
   */
  getCurrentLanguage(): Language {
    return this.currentLang;
  }

  /**
   * Carga las traducciones para un idioma
   */
  private async loadTranslations(lang: Language): Promise<void> {
    if (this.translations[lang]) {
      return;
    }

    try {
      const translations = await firstValueFrom(
        this.http.get<Record<string, string>>(`/assets/i18n/${lang}.json`),
      );
      this.translations[lang] = translations;
    } catch (error) {
      this.logger.error('Error loading translations:', error);
    }
  }
}
