import { Injectable, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Clave para almacenar el slug del tradename de forma persistente
 * Esta clave NO lleva prefijo para evitar dependencia circular
 */
const TRADENAME_SLUG_KEY = '__gsti_tradename_slug__';

/**
 * Slug por defecto cuando no hay tradename configurado
 */
const DEFAULT_SLUG = 'gsti';

/**
 * Servicio para gestionar el prefijo de almacenamiento
 * basado en el slug del tradename del sistema
 */
@Injectable({
  providedIn: 'root',
})
export class StoragePrefixService {
  private readonly platformId = inject(PLATFORM_ID);

  /**
   * Signal que contiene el slug actual del tradename
   */
  private readonly slugSignal = signal<string>(this.loadPersistedSlug());

  /**
   * Obtiene el slug actual como readonly signal
   */
  readonly slug = this.slugSignal.asReadonly();

  /**
   * Carga el slug persistido en localStorage
   * @returns El slug persistido o el valor por defecto
   */
  private loadPersistedSlug(): string {
    if (!isPlatformBrowser(this.platformId)) {
      return DEFAULT_SLUG;
    }

    const persistedSlug = localStorage.getItem(TRADENAME_SLUG_KEY);
    return persistedSlug ?? DEFAULT_SLUG;
  }

  /**
   * Establece el tradename y persiste su slug
   * @param tradeName - Nombre comercial del sistema
   */
  setTradeName(tradeName: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const newSlug = this.createSlug(tradeName);

    // Solo actualizar si el slug cambió
    if (newSlug !== this.slugSignal()) {
      this.slugSignal.set(newSlug);
      localStorage.setItem(TRADENAME_SLUG_KEY, newSlug);
    }
  }

  /**
   * Obtiene el prefijo completo para una clave de storage
   * @param key - Clave original sin prefijo
   * @returns Clave con el prefijo del tradename
   */
  getPrefixedKey(key: string): string {
    const currentSlug = this.slugSignal();
    return `${currentSlug}_${key}`;
  }

  /**
   * Obtiene el slug actual (valor síncrono)
   * @returns El slug actual del tradename
   */
  getCurrentSlug(): string {
    return this.slugSignal();
  }

  /**
   * Convierte un nombre comercial a un slug válido
   * @param tradeName - Nombre comercial
   * @returns Slug en minúsculas, sin espacios ni caracteres especiales
   */
  private createSlug(tradeName: string): string {
    if (!tradeName || tradeName.trim().length === 0) {
      return DEFAULT_SLUG;
    }

    return tradeName
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remover acentos
      .replace(/[^a-z0-9\s-]/g, '') // Solo alfanuméricos, espacios y guiones
      .replace(/\s+/g, '-') // Espacios a guiones
      .replace(/-+/g, '-') // Múltiples guiones a uno solo
      .replace(/^-|-$/g, ''); // Remover guiones al inicio y final
  }
}
