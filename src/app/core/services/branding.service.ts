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
        this.settings.set(settings);
        this.applyBranding(settings);
      }
    } catch (error) {
      console.error('Error al cargar branding:', error);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Aplica las configuraciones de branding a la aplicación
   */
  private applyBranding(settings: SystemSettings): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Actualizar favicon (primero para que se cargue rápido)
    this.updateFavicon(settings.systemSettingFavicon);

    // Actualizar manifest de PWA (importante para la instalación)
    this.updateManifest(settings);

    // Actualizar logo en el documento
    this.updateLogo(settings.systemSettingLogo);

    // Actualizar colores del tema
    this.updateThemeColors(settings.systemSettingSidebarColor);

    // Actualizar título de la aplicación
    this.updateTitle(settings.systemSettingTradeName);

    // Actualizar meta tags
    this.updateMetaTags(settings);
  }

  /**
   * Actualiza el favicon de la aplicación y los iconos de Apple
   */
  private updateFavicon(faviconUrl: string): void {
    if (!faviconUrl) return;

    // Actualizar favicon principal
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = faviconUrl;
    link.type = 'image/png';

    // Actualizar apple-touch-icon
    let appleIcon = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
    if (!appleIcon) {
      appleIcon = document.createElement('link');
      appleIcon.rel = 'apple-touch-icon';
      document.getElementsByTagName('head')[0].appendChild(appleIcon);
    }
    appleIcon.href = faviconUrl;

    // Actualizar apple-touch-icon con tamaños específicos
    const sizes = ['192x192', '512x512'];
    sizes.forEach(size => {
      let sizedIcon = document.querySelector(`link[rel='apple-touch-icon'][sizes='${size}']`) as HTMLLinkElement;
      if (!sizedIcon) {
        sizedIcon = document.createElement('link');
        sizedIcon.rel = 'apple-touch-icon';
        sizedIcon.setAttribute('sizes', size);
        document.getElementsByTagName('head')[0].appendChild(sizedIcon);
      }
      sizedIcon.href = faviconUrl;
    });
  }

  /**
   * Actualiza el manifest de la PWA dinámicamente
   * Esto es crucial para que el favicon se use cuando se instala la PWA
   *
   * Nota: Algunos navegadores pueden cachear el manifest, por lo que es importante
   * actualizarlo antes de que el usuario intente instalar la PWA
   */
  private updateManifest(settings: SystemSettings): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const faviconUrl = settings.systemSettingFavicon || '/assets/gsti/icon.png';
    const logoUrl = settings.systemSettingLogo || '/assets/gsti/adaptive-icon.png';
    const tradeName = settings.systemSettingTradeName || 'GSTI PWA';
    const sidebarColor = settings.systemSettingSidebarColor || '093057';

    // Crear nuevo manifest con los iconos actualizados
    const manifest = {
      name: `${tradeName} - PWA Empleado`,
      short_name: tradeName,
      description: `Aplicación PWA para empleados de ${tradeName}`,
      theme_color: `#${sidebarColor}`,
      background_color: '#ffffff',
      display: 'standalone',
      orientation: 'portrait',
      scope: '/',
      start_url: '/',
      icons: [
        {
          src: faviconUrl,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: faviconUrl,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: logoUrl,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        },
        {
          src: logoUrl,
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

    // Crear URL del blob
    const manifestUrl = URL.createObjectURL(blob);

    // Actualizar o crear el link del manifest
    let manifestLink = document.querySelector("link[rel='manifest']") as HTMLLinkElement;
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      document.getElementsByTagName('head')[0].appendChild(manifestLink);
    }

    // Remover el link anterior para forzar la actualización
    const oldHref = manifestLink.href;
    manifestLink.remove();

    // Crear nuevo link con la nueva URL
    const newManifestLink = document.createElement('link');
    newManifestLink.rel = 'manifest';
    newManifestLink.href = manifestUrl;
    newManifestLink.setAttribute('crossorigin', 'use-credentials');
    document.getElementsByTagName('head')[0].appendChild(newManifestLink);

    // Limpiar URL anterior si existe
    if (oldHref && oldHref.startsWith('blob:')) {
      URL.revokeObjectURL(oldHref);
    }

    // Forzar actualización del manifest en el navegador
    // Esto es importante para que el navegador recargue el manifest
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      // Si hay un service worker, puede que necesite actualizar el manifest
      navigator.serviceWorker.controller.postMessage({
        type: 'MANIFEST_UPDATED',
        manifestUrl: manifestUrl
      });
    }
  }

  /**
   * Actualiza el logo en el documento (si existe un elemento con id 'app-logo')
   */
  private updateLogo(logoUrl: string): void {
    if (!logoUrl) return;

    const logoElement = document.getElementById('app-logo') as HTMLImageElement;
    if (logoElement) {
      logoElement.src = logoUrl;
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

    document.title = `${tradeName} - PWA Empleado`;
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

