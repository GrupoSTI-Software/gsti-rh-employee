import { Injectable, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ISystemSettings } from '@modules/system-settings/domain/system-settings.port';
import { GetSystemSettingsUseCase } from '@modules/system-settings/application/get-system-settings.use-case';
import { LoggerService } from '@core/services/logger.service';
import { StoragePrefixService } from './storage-prefix.service';
import { environment } from '@env/environment';

/**
 * Servicio para gestionar el branding de la aplicación
 * Aplica las configuraciones del sistema (logos, colores, favicon, etc.)
 */
@Injectable({
  providedIn: 'root',
})
export class BrandingService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly getSystemSettingsUseCase = inject(GetSystemSettingsUseCase);
  private readonly logger = inject(LoggerService);
  private readonly storagePrefixService = inject(StoragePrefixService);

  readonly settings = signal<ISystemSettings | null>(null);
  readonly loading = signal(false);
  private manifestVersion = 0;

  /**
   * Carga las configuraciones del sistema y aplica el branding
   */
  async loadBranding(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Persistir la URL de la API para que el script inline de index.html
    // pueda hacer fetch directo al API en la próxima carga, antes de Angular.
    this.persistApiUrl();

    this.loading.set(true);

    try {
      const settings = await this.getSystemSettingsUseCase.execute();

      if (settings) {
        this.settings.set(settings);

        // Sincronizar el prefijo de storage con el tradename
        this.storagePrefixService.setTradeName(settings.systemSettingTradeName);

        // Remover cualquier manifest estático ANTES de aplicar el branding
        this.removeStaticManifest();

        await this.applyBranding(settings);
        this.setupInstallPromptListener();
      } else {
        this.logger.warn('No se obtuvieron configuraciones del sistema');
      }
    } catch (error) {
      this.logger.error('Error al cargar branding:', error);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Remueve manifests anteriores excepto el estático actual.
   * El manifest estático (manifest.webmanifest) ya tiene el branding correcto
   * gracias al script de post-build. Solo se eliminan manifests dinámicos obsoletos
   * (data: URLs de sesiones anteriores) para evitar duplicados.
   */
  private removeStaticManifest(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const allManifests = document.querySelectorAll("link[rel='manifest']");
    allManifests.forEach((link) => {
      const href = (link as HTMLLinkElement).href;
      // Solo remover manifests dinámicos (data: URLs), no el estático del servidor
      if (href.startsWith('data:')) {
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
    window.addEventListener(
      'beforeinstallprompt',
      (_e: Event) => {
        // Forzar actualización del manifest antes de mostrar el prompt de instalación
        const currentSettings = this.settings();
        if (currentSettings !== null) {
          void this.updateManifest(currentSettings).then(() => {
            // Pequeño delay para asegurar que el manifest se haya actualizado
            return new Promise<void>((resolve) => setTimeout(resolve, 100));
          });
        }
      },
      { once: true },
    );
  }

  /**
   * Fuerza la actualización del manifest (útil para debugging o actualizaciones manuales)
   */
  async forceManifestUpdate(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const currentSettings = this.settings();
    if (currentSettings !== null) {
      await this.updateManifest(currentSettings);
    }
  }

  /**
   * Aplica las configuraciones de branding a la aplicación
   */
  private async applyBranding(settings: ISystemSettings): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Actualizar título de la aplicación PRIMERO (antes del manifest)
    this.updateTitle(settings.systemSettingTradeName);

    // Actualizar meta tags PRIMERO (antes del manifest)
    this.updateMetaTags(settings);

    // Actualizar favicon e iconos de Apple (async por generación de fondo blanco en iOS)
    await this.updateFavicon(this.getPWAApplicationIconUrl(settings));

    // Actualizar colores del tema
    this.updateThemeColors(settings.systemSettingSidebarColor);

    // Actualizar manifest de PWA (importante para la instalación)
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
    return new Promise((resolve) => {
      if (!url) {
        resolve();
        return;
      }

      const img = new Image();
      img.onload = (): void => resolve();
      img.onerror = (): void => {
        this.logger.warn('No se pudo cargar el icono');
        resolve(); // Resolver de todas formas para no bloquear
      };
      img.src = this.addCacheBusting(url);
    });
  }

  /**
   * Actualiza el favicon de la aplicación y los iconos de Apple.
   * En iOS genera el apple-touch-icon con fondo blanco para evitar
   * que las áreas transparentes se muestren en negro.
   */
  private async updateFavicon(faviconUrl: string): Promise<void> {
    if (!faviconUrl) return;

    const faviconUrlWithCache = this.addCacheBusting(faviconUrl);

    // Actualizar favicon principal
    const existingLink = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
    if (existingLink) {
      existingLink.remove();
    }
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = faviconUrlWithCache;
    link.type = 'image/png';
    document.getElementsByTagName('head')[0].appendChild(link);

    // Generar icono con fondo blanco para iOS (evita el fondo negro en transparencias)
    const appleIconUrl = await this.generateIconWithWhiteBackground(faviconUrl);

    // Actualizar apple-touch-icon
    const appleIcon = document.querySelector(
      "link[rel='apple-touch-icon']",
    ) as HTMLLinkElement | null;
    if (appleIcon) {
      appleIcon.remove();
    }
    const newAppleIcon = document.createElement('link');
    newAppleIcon.rel = 'apple-touch-icon';
    newAppleIcon.href = appleIconUrl;
    document.getElementsByTagName('head')[0].appendChild(newAppleIcon);

    // Actualizar apple-touch-icon con tamaños específicos
    const sizes = ['180x180', '192x192', '512x512'];
    sizes.forEach((size) => {
      const existingIcon = document.querySelector(
        `link[rel='apple-touch-icon'][sizes='${size}']`,
      ) as HTMLLinkElement | null;
      if (existingIcon) {
        existingIcon.remove();
      }
      const sizedIcon = document.createElement('link');
      sizedIcon.rel = 'apple-touch-icon';
      sizedIcon.setAttribute('sizes', size);
      sizedIcon.href = appleIconUrl;
      document.getElementsByTagName('head')[0].appendChild(sizedIcon);
    });
  }

  /**
   * Genera una versión del icono con fondo blanco usando canvas.
   * Necesario para iOS que renderiza áreas transparentes como negro.
   * Si no se puede procesar (CORS, etc.), retorna la URL original.
   */
  private async generateIconWithWhiteBackground(originalUrl: string): Promise<string> {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        img.onload = (): void => resolve();
        img.onerror = (): void => reject(new Error('No se pudo cargar el icono'));
        img.src = this.addCacheBusting(originalUrl);
      });

      const size = 512;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return this.addCacheBusting(originalUrl);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);

      return canvas.toDataURL('image/png');
    } catch {
      return this.addCacheBusting(originalUrl);
    }
  }

  /**
   * Obtiene la URL del icono de la aplicación PWA
   */
  getPWAApplicationIconUrl(settings: ISystemSettings): string {
    if (
      settings.systemSettingEmployeeAplicationIcon &&
      settings.systemSettingEmployeeAplicationIcon.trim() !== ''
    ) {
      return settings.systemSettingEmployeeAplicationIcon;
    }
    if (settings.systemSettingFavicon && settings.systemSettingFavicon.trim() !== '') {
      return settings.systemSettingFavicon;
    }

    return '/assets/gsti/icon.png';
  }

  /**
   * Actualiza el manifest de la PWA dinámicamente
   * Esto es crucial para que el favicon se use cuando se instala la PWA
   *
   * Nota: Algunos navegadores pueden cachear el manifest, por lo que es importante
   * actualizarlo antes de que el usuario intente instalar la PWA
   */
  private async updateManifest(settings: ISystemSettings): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const faviconUrl = this.getPWAApplicationIconUrl(settings);
    const logoUrl =
      settings.systemSettingLogo.trim() !== ''
        ? settings.systemSettingLogo
        : '/assets/gsti/adaptive-icon.png';
    // Asegurar que el tradeName viene del servicio, sin fallback por defecto
    const tradeName =
      settings.systemSettingTradeName.trim() !== ''
        ? settings.systemSettingTradeName.trim()
        : 'GSTI PWA';
    const sidebarColor =
      settings.systemSettingSidebarColor.trim() !== ''
        ? settings.systemSettingSidebarColor
        : '093057';

    // Incrementar versión del manifest para forzar actualización
    this.manifestVersion++;

    // Pre-cargar iconos antes de crear el manifest para asegurar que estén disponibles
    await Promise.all([this.preloadIcon(faviconUrl), this.preloadIcon(logoUrl)]);

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
      display_override: ['window-controls-overlay', 'standalone'],
      orientation: 'portrait',
      scope: '/',
      start_url: '/',
      icons: [
        {
          src: faviconUrlWithCache,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: faviconUrlWithCache,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: logoUrlWithCache,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
        {
          src: logoUrlWithCache,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
      categories: ['business', 'productivity'],
      lang: 'es',
      prefer_related_applications: false,
      launch_handler: {
        client_mode: ['navigate-existing', 'auto'],
      },
    };

    // Actualizar el <link rel="manifest"> con el manifest dinámico como data URL.
    // Esto hace que Chrome re-evalúe el manifest inmediatamente en la sesión actual.
    // IMPORTANTE: primero insertar el nuevo manifest, luego remover los anteriores
    // para evitar que Chrome quede sin manifest durante el reemplazo.
    const manifestDataUrl = `data:application/manifest+json,${encodeURIComponent(JSON.stringify(manifest))}`;

    const newManifestLink = document.createElement('link');
    newManifestLink.rel = 'manifest';
    newManifestLink.href = manifestDataUrl;
    document.getElementsByTagName('head')[0].appendChild(newManifestLink);

    // Ahora remover los manifests anteriores (estáticos y data: URLs viejos)
    const existingManifests = document.querySelectorAll("link[rel='manifest']");
    existingManifests.forEach((link) => {
      if (link === newManifestLink) return;
      const oldHref = (link as HTMLLinkElement).href;
      link.remove();
      if (oldHref?.startsWith('blob:')) {
        URL.revokeObjectURL(oldHref);
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    window.dispatchEvent(
      new CustomEvent('manifest-updated', {
        detail: { version: this.manifestVersion },
      }),
    );
  }

  /**
   * Persiste la URL de la API en localStorage.
   * El script inline de index.html la usa para hacer fetch directo
   * al endpoint de system-settings antes de que Angular cargue.
   */
  private persistApiUrl(): void {
    try {
      localStorage.setItem('pwa_api_url', environment.API_URL);
    } catch {
      // Ignorar errores de localStorage
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
  private updateMetaTags(settings: ISystemSettings): void {
    // Actualizar description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.getElementsByTagName('head')[0].appendChild(metaDescription);
    }
    metaDescription.setAttribute(
      'content',
      `Aplicación PWA para empleados de ${settings.systemSettingTradeName}`,
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
    const color = this.settings()?.systemSettingSidebarColor;
    return color ?? '#093057';
  }

  /**
   * Obtiene la URL del logo actual
   */
  getLogoUrl(): string {
    const logo = this.settings()?.systemSettingLogo;
    return logo ?? '/assets/gsti/adaptive-icon.png';
  }

  /**
   * Obtiene el nombre comercial actual
   */
  getTradeName(): string {
    const tradeName = this.settings()?.systemSettingTradeName;
    return tradeName ?? 'GSTI';
  }

  /**
   * Obtiene la URL del banner actual para usar como fondo
   */
  getBannerUrl(): string {
    const banner = this.settings()?.systemSettingBanner;
    return banner ?? '';
  }

  /**
   * Obtiene la URL del favicon actual
   */
  getFaviconUrl(): string {
    const favicon = this.settings()?.systemSettingFavicon;
    return favicon ?? '/assets/gsti/favicon.ico';
  }
}
