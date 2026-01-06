import { Injectable, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SystemSettings } from '@modules/system-settings/domain/system-settings.port';
import { GetSystemSettingsUseCase } from '@modules/system-settings/application/get-system-settings.use-case';

/**
 * Servicio para gestionar el branding de la aplicación
 * Aplica las configuraciones del sistema (logos, colores, favicon, etc.)
 */
@Injectable({
  providedIn: 'root'
})
export class BrandingService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly getSystemSettingsUseCase = inject(GetSystemSettingsUseCase);

  readonly settings = signal<SystemSettings | null>(null);
  readonly loading = signal(false);
  private manifestVersion = 0;

  /**
   * Carga las configuraciones del sistema y aplica el branding
   */
  async loadBranding(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.loading.set(true);

    try {
      const settings = await this.getSystemSettingsUseCase.execute();

      if (settings) {
        console.log('Branding cargado:', {
          tradeName: settings.systemSettingTradeName,
          logo: settings.systemSettingLogo,
          favicon: settings.systemSettingFavicon
        });

        this.settings.set(settings);

        // Remover cualquier manifest estático ANTES de aplicar el branding
        this.removeStaticManifest();

        await this.applyBranding(settings);
        this.setupInstallPromptListener();
      } else {
        console.warn('No se obtuvieron configuraciones del sistema');
      }
    } catch (error) {
      console.error('Error al cargar branding:', error);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Remueve cualquier manifest estático que pueda estar presente
   */
  private removeStaticManifest(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Remover todos los links de manifest que apunten al archivo estático
    const allManifests = document.querySelectorAll("link[rel='manifest']");
    allManifests.forEach(link => {
      const href = (link as HTMLLinkElement).href;
      // Si el href apunta al manifest estático, removerlo
      if (href.includes('manifest.webmanifest') && !href.startsWith('blob:')) {
        console.log('Removiendo manifest estático:', href);
        link.remove();
      }
    });
  }

  /**
   * Configura un listener para el evento beforeinstallprompt
   * Esto asegura que el manifest esté actualizado antes de que el usuario instale la PWA
   */
  private setupInstallPromptListener(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Escuchar el evento beforeinstallprompt para asegurar que el manifest esté actualizado
    // El tipo BeforeInstallPromptEvent no está disponible en todos los navegadores, así que usamos any
    window.addEventListener('beforeinstallprompt', async (_e: any) => {
      // Forzar actualización del manifest antes de mostrar el prompt de instalación
      const currentSettings = this.settings();
      if (currentSettings) {
        console.log('Actualizando manifest antes de la instalación de la PWA...');
        await this.updateManifest(currentSettings);
        // Pequeño delay para asegurar que el manifest se haya actualizado
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }, { once: true });

    // También escuchar cuando el usuario hace clic en "Instalar" o similar
    window.addEventListener('appinstalled', () => {
      console.log('PWA instalada exitosamente con branding actualizado');
    });
  }

  /**
   * Fuerza la actualización del manifest (útil para debugging o actualizaciones manuales)
   */
  async forceManifestUpdate(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const currentSettings = this.settings();
    if (currentSettings) {
      await this.updateManifest(currentSettings);
    }
  }

  /**
   * Aplica las configuraciones de branding a la aplicación
   */
  private async applyBranding(settings: SystemSettings): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Actualizar título de la aplicación PRIMERO (antes del manifest)
    this.updateTitle(settings.systemSettingTradeName);

    // Actualizar meta tags PRIMERO (antes del manifest)
    this.updateMetaTags(settings);

    // Actualizar favicon (primero para que se cargue rápido)
    this.updateFavicon(settings.systemSettingFavicon);

    // Actualizar logo en el documento
    this.updateLogo(settings.systemSettingLogo);

    // Actualizar colores del tema
    this.updateThemeColors(settings.systemSettingSidebarColor);

    // Actualizar manifest de PWA (importante para la instalación)
    // Esto debe hacerse después de pre-cargar los iconos
    // Pero creamos un manifest inicial inmediatamente sin esperar los iconos
    await this.updateManifest(settings);
  }

  /**
   * Agrega cache busting a una URL para evitar que el navegador use versiones cacheadas
   */
  private addCacheBusting(url: string): string {
    if (!url) return url;
    // Agregar timestamp y versión para evitar caché
    const separator = url.includes('?') ? '&' : '?';
    const timestamp = Date.now();
    return `${url}${separator}v=${this.manifestVersion}&t=${timestamp}`;
  }

  /**
   * Pre-carga un icono para asegurar que esté disponible antes de actualizar el manifest
   */
  private preloadIcon(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!url) {
        resolve();
        return;
      }

      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => {
        console.warn(`No se pudo cargar el icono: ${url}`);
        resolve(); // Resolver de todas formas para no bloquear
      };
      img.src = this.addCacheBusting(url);
    });
  }

  /**
   * Actualiza el favicon de la aplicación y los iconos de Apple
   */
  private updateFavicon(faviconUrl: string): void {
    if (!faviconUrl) return;

    const faviconUrlWithCache = this.addCacheBusting(faviconUrl);

    // Actualizar favicon principal
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    // Forzar actualización removiendo y recreando
    const oldHref = link.href;
    link.remove();
    link = document.createElement('link');
    link.rel = 'icon';
    link.href = faviconUrlWithCache;
    link.type = 'image/png';
    document.getElementsByTagName('head')[0].appendChild(link);

    // Actualizar apple-touch-icon
    let appleIcon = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
    if (appleIcon) {
      appleIcon.remove();
    }
    appleIcon = document.createElement('link');
    appleIcon.rel = 'apple-touch-icon';
    appleIcon.href = faviconUrlWithCache;
    document.getElementsByTagName('head')[0].appendChild(appleIcon);

    // Actualizar apple-touch-icon con tamaños específicos
    const sizes = ['192x192', '512x512'];
    sizes.forEach(size => {
      const existingIcon = document.querySelector(`link[rel='apple-touch-icon'][sizes='${size}']`) as HTMLLinkElement;
      if (existingIcon) {
        existingIcon.remove();
      }
      const sizedIcon = document.createElement('link');
      sizedIcon.rel = 'apple-touch-icon';
      sizedIcon.setAttribute('sizes', size);
      sizedIcon.href = faviconUrlWithCache;
      document.getElementsByTagName('head')[0].appendChild(sizedIcon);
    });
  }

  /**
   * Actualiza el manifest de la PWA dinámicamente
   * Esto es crucial para que el favicon se use cuando se instala la PWA
   *
   * Nota: Algunos navegadores pueden cachear el manifest, por lo que es importante
   * actualizarlo antes de que el usuario intente instalar la PWA
   */
  private async updateManifest(settings: SystemSettings): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const faviconUrl = settings.systemSettingFavicon || '/assets/gsti/icon.png';
    const logoUrl = settings.systemSettingLogo || '/assets/gsti/adaptive-icon.png';
    // Asegurar que el tradeName viene del servicio, sin fallback por defecto
    const tradeName = settings.systemSettingTradeName?.trim() || 'GSTI PWA';
    const sidebarColor = settings.systemSettingSidebarColor || '093057';

    // Log para debugging
    console.log('Actualizando manifest con tradeName:', tradeName);
    console.log('Settings recibidos:', {
      tradeName: settings.systemSettingTradeName,
      favicon: settings.systemSettingFavicon,
      logo: settings.systemSettingLogo
    });

    // Incrementar versión del manifest para forzar actualización
    this.manifestVersion++;

    // Pre-cargar iconos antes de crear el manifest para asegurar que estén disponibles
    await Promise.all([
      this.preloadIcon(faviconUrl),
      this.preloadIcon(logoUrl)
    ]);

    // Agregar cache busting a las URLs de los iconos
    const faviconUrlWithCache = this.addCacheBusting(faviconUrl);
    const logoUrlWithCache = this.addCacheBusting(logoUrl);

    // Crear nuevo manifest con los iconos actualizados y cache busting
    // Asegurar que el nombre no tenga espacios extra ni caracteres especiales
    const cleanTradeName = tradeName.trim();
    const manifest = {
      name: cleanTradeName,
      short_name: cleanTradeName.length > 12 ? cleanTradeName.substring(0, 12) : cleanTradeName,
      description: `Aplicación PWA para empleados de ${cleanTradeName}`,
      theme_color: `#${sidebarColor}`,
      background_color: '#ffffff',
      display: 'standalone',
      orientation: 'portrait',
      scope: '/',
      start_url: '/',
      icons: [
        {
          src: faviconUrlWithCache,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: faviconUrlWithCache,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: logoUrlWithCache,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        },
        {
          src: logoUrlWithCache,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'maskable'
        }
      ],
      categories: ['business', 'productivity'],
      lang: 'es',
      prefer_related_applications: false
    };

    // Crear blob con el manifest
    const blob = new Blob([JSON.stringify(manifest, null, 2)], {
      type: 'application/manifest+json'
    });

    // Crear URL del blob con timestamp único para evitar caché
    const timestamp = Date.now();
    const manifestUrl = URL.createObjectURL(blob);

    // Remover TODOS los links de manifest existentes (incluido el estático)
    const existingManifests = document.querySelectorAll("link[rel='manifest']");
    existingManifests.forEach(link => {
      const oldHref = (link as HTMLLinkElement).href;
      link.remove();
      // Limpiar URLs blob anteriores
      if (oldHref && oldHref.startsWith('blob:')) {
        URL.revokeObjectURL(oldHref);
      }
    });

    // Pequeño delay para asegurar que los links anteriores se hayan removido completamente
    await new Promise(resolve => setTimeout(resolve, 50));

    // Crear nuevo link con la nueva URL
    const newManifestLink = document.createElement('link');
    newManifestLink.rel = 'manifest';
    newManifestLink.href = manifestUrl;
    newManifestLink.setAttribute('crossorigin', 'use-credentials');
    document.getElementsByTagName('head')[0].appendChild(newManifestLink);

    // Log para verificar que el manifest se creó correctamente
    console.log('Manifest actualizado:', {
      name: manifest.name,
      short_name: manifest.short_name,
      manifestUrl: manifestUrl,
      version: this.manifestVersion
    });

    // Forzar actualización del manifest en el navegador
    // Esto es importante para que el navegador recargue el manifest
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      // Si hay un service worker, puede que necesite actualizar el manifest
      navigator.serviceWorker.controller.postMessage({
        type: 'MANIFEST_UPDATED',
        manifestUrl: manifestUrl,
        version: this.manifestVersion,
        timestamp: timestamp
      });
    }

    // Disparar evento personalizado para notificar que el manifest fue actualizado
    window.dispatchEvent(new CustomEvent('manifest-updated', {
      detail: { manifestUrl, version: this.manifestVersion, timestamp }
    }));
  }

  /**
   * Actualiza el logo en el documento (si existe un elemento con id 'app-logo')
   */
  private updateLogo(logoUrl: string): void {
    if (!logoUrl) return;

    const logoElement = document.getElementById('app-logo') as HTMLImageElement;
    if (logoElement) {
      // Agregar cache busting para forzar la actualización del logo
      const logoUrlWithCache = this.addCacheBusting(logoUrl);
      logoElement.src = logoUrlWithCache;
      logoElement.alt = this.settings()?.systemSettingTradeName || 'Logo';
    }
  }

  /**
   * Actualiza los colores del tema basado en el color del sidebar
   */
  private updateThemeColors(sidebarColor: string): void {
    if (!sidebarColor) return;

    // Convertir hex a RGB si es necesario
    const color = sidebarColor.startsWith('#') ? sidebarColor.slice(1) : sidebarColor;
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);

    // Actualizar CSS variables para el color primario
    document.documentElement.style.setProperty('--primary', `#${color}`);
    document.documentElement.style.setProperty('--primary-rgb', `${r}, ${g}, ${b}`);

    // Actualizar theme-color para PWA
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', `#${color}`);
    }
  }

  /**
   * Actualiza el título de la aplicación
   */
  private updateTitle(tradeName: string): void {
    if (!tradeName) return;

    document.title = `${tradeName}`;
  }

  /**
   * Actualiza los meta tags de la aplicación
   */
  private updateMetaTags(settings: SystemSettings): void {
    // Actualizar description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.getElementsByTagName('head')[0].appendChild(metaDescription);
    }
    metaDescription.setAttribute(
      'content',
      `Aplicación PWA para empleados de ${settings.systemSettingTradeName}`
    );

    // Actualizar apple-mobile-web-app-title
    let appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (!appleTitle) {
      appleTitle = document.createElement('meta');
      appleTitle.setAttribute('name', 'apple-mobile-web-app-title');
      document.getElementsByTagName('head')[0].appendChild(appleTitle);
    }
    appleTitle.setAttribute('content', settings.systemSettingTradeName);
  }

  /**
   * Obtiene el color primario actual
   */
  getPrimaryColor(): string {
    return this.settings()?.systemSettingSidebarColor || '#093057';
  }

  /**
   * Obtiene la URL del logo actual
   */
  getLogoUrl(): string {
    return this.settings()?.systemSettingLogo || '/assets/gsti/adaptive-icon.png';
  }

  /**
   * Obtiene el nombre comercial actual
   */
  getTradeName(): string {
    return this.settings()?.systemSettingTradeName || 'GSTI';
  }
}

