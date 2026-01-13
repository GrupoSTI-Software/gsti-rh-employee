import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '@env/environment';
import { StoragePrefixService } from './storage-prefix.service';

/**
 * Servicio para almacenamiento seguro de datos
 * Proporciona cifrado para datos sensibles y manejo seguro de cookies
 * Todas las claves se prefijan automáticamente con el slug del tradename
 */
@Injectable({
  providedIn: 'root',
})
export class SecureStorageService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly storagePrefixService = inject(StoragePrefixService);

  /**
   * Clave de cifrado derivada del navegador (fingerprint básico)
   * En producción, considera usar una clave más robusta
   */
  private getEncryptionKey(): string {
    if (!isPlatformBrowser(this.platformId)) {
      return 'ssr-fallback-key';
    }

    // Generar una clave basada en características del navegador
    const components = [
      navigator.userAgent,
      navigator.language,
      new Date().getTimezoneOffset().toString(),
      screen.colorDepth?.toString() ?? '',
    ];

    return this.hashString(components.join('|'));
  }

  /**
   * Hash simple para generar claves (no criptográficamente seguro para producción)
   * Para producción, usar Web Crypto API
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convertir a 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Cifra un string usando XOR simple
   * Para producción, usar Web Crypto API con AES-GCM
   */
  encrypt(data: string): string {
    if (!data) return '';

    const key = this.getEncryptionKey();
    let result = '';

    for (let i = 0; i < data.length; i++) {
      const charCode = data.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }

    // Codificar en base64 para almacenamiento seguro
    return btoa(result);
  }

  /**
   * Descifra un string
   */
  decrypt(encryptedData: string): string {
    if (!encryptedData) return '';

    try {
      const key = this.getEncryptionKey();
      const data = atob(encryptedData);
      let result = '';

      for (let i = 0; i < data.length; i++) {
        const charCode = data.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        result += String.fromCharCode(charCode);
      }

      return result;
    } catch {
      return '';
    }
  }

  /**
   * Obtiene la clave con prefijo del tradename
   * @param key - Clave original
   * @returns Clave con prefijo
   */
  private getPrefixedKey(key: string): string {
    return this.storagePrefixService.getPrefixedKey(key);
  }

  /**
   * Establece una cookie segura
   * @param name - Nombre de la cookie (se prefijará automáticamente)
   * @param value - Valor de la cookie
   * @param days - Días de expiración
   */
  setSecureCookie(name: string, value: string, days = 7): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const prefixedName = this.getPrefixedKey(name);
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);

    // Configurar cookie con atributos de seguridad
    const cookieAttributes: string[] = [
      `${prefixedName}=${encodeURIComponent(value)}`,
      `expires=${expires.toUTCString()}`,
      'path=/',
      'SameSite=Strict',
    ];

    // En producción (HTTPS), agregar Secure
    if (environment.PRODUCTION || window.location.protocol === 'https:') {
      cookieAttributes.push('Secure');
    }

    document.cookie = cookieAttributes.join('; ');
  }

  /**
   * Obtiene una cookie
   * @param name - Nombre de la cookie (se prefijará automáticamente)
   * @returns Valor de la cookie o null
   */
  getCookie(name: string): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    const prefixedName = this.getPrefixedKey(name);
    const nameEQ = `${prefixedName}=`;
    const cookies = document.cookie.split(';');

    for (const cookie of cookies) {
      const trimmedCookie = cookie.trim();
      if (trimmedCookie.startsWith(nameEQ)) {
        return decodeURIComponent(trimmedCookie.substring(nameEQ.length));
      }
    }

    return null;
  }

  /**
   * Elimina una cookie
   * @param name - Nombre de la cookie (se prefijará automáticamente)
   */
  deleteCookie(name: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const prefixedName = this.getPrefixedKey(name);
    document.cookie = `${prefixedName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict`;
  }

  /**
   * Almacena datos cifrados en sessionStorage (más seguro que localStorage)
   * @param key - Clave (se prefijará automáticamente)
   * @param value - Valor a cifrar y almacenar
   */
  setEncryptedItem(key: string, value: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const prefixedKey = this.getPrefixedKey(key);
    const encrypted = this.encrypt(value);
    sessionStorage.setItem(prefixedKey, encrypted);
  }

  /**
   * Obtiene datos cifrados de sessionStorage
   * @param key - Clave (se prefijará automáticamente)
   * @returns Valor descifrado o null
   */
  getEncryptedItem(key: string): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    const prefixedKey = this.getPrefixedKey(key);
    const encrypted = sessionStorage.getItem(prefixedKey);
    if (!encrypted) {
      return null;
    }

    return this.decrypt(encrypted);
  }

  /**
   * Elimina un item de sessionStorage
   * @param key - Clave (se prefijará automáticamente)
   */
  removeEncryptedItem(key: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const prefixedKey = this.getPrefixedKey(key);
    sessionStorage.removeItem(prefixedKey);
  }

  /**
   * Almacena datos en localStorage
   * @param key - Clave (se prefijará automáticamente)
   * @param value - Valor a almacenar
   */
  setItem(key: string, value: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const prefixedKey = this.getPrefixedKey(key);
    localStorage.setItem(prefixedKey, value);
  }

  /**
   * Obtiene datos de localStorage
   * @param key - Clave (se prefijará automáticamente)
   * @returns Valor o null
   */
  getItem(key: string): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    const prefixedKey = this.getPrefixedKey(key);
    return localStorage.getItem(prefixedKey);
  }

  /**
   * Elimina un item de localStorage
   * @param key - Clave (se prefijará automáticamente)
   */
  removeItem(key: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const prefixedKey = this.getPrefixedKey(key);
    localStorage.removeItem(prefixedKey);
  }

  /**
   * Limpia todos los datos sensibles almacenados con el prefijo actual
   */
  clearAllSecureData(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const currentSlug = this.storagePrefixService.getCurrentSlug();
    const prefix = `${currentSlug}_`;

    // Limpiar cookies de autenticación con prefijo
    this.deleteCookie('auth_token');

    // Limpiar sessionStorage con prefijo actual
    const sessionKeysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(prefix)) {
        sessionKeysToRemove.push(key);
      }
    }
    sessionKeysToRemove.forEach((key) => sessionStorage.removeItem(key));

    // Limpiar localStorage con prefijo actual
    const localKeysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) {
        localKeysToRemove.push(key);
      }
    }
    localKeysToRemove.forEach((key) => localStorage.removeItem(key));
  }
}
