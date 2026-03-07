import { Injectable, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PwaDetectionService } from './pwa-detection.service';
import { LoggerService } from './logger.service';
import { SecureStorageService } from './secure-storage.service';

/**
 * Servicio para gestionar el prompt de instalación de la PWA
 * Muestra un banner o prompt para instalar la aplicación cuando se accede desde el navegador
 */
@Injectable({
  providedIn: 'root',
})
export class PwaInstallPromptService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly pwaDetectionService = inject(PwaDetectionService);
  private readonly logger = inject(LoggerService);
  private readonly storage = inject(SecureStorageService);

  readonly deferredPrompt = signal<BeforeInstallPromptEvent | null>(null);
  readonly showInstallBanner = signal<boolean>(false);
  readonly showOpenAppBanner = signal<boolean>(false);
  readonly isInstalling = signal<boolean>(false);

  private readonly INSTALL_PROMPT_DISMISSED_KEY = 'pwa_install_prompt_dismissed';
  private readonly INSTALL_PROMPT_DISMISSED_COUNT_KEY = 'pwa_install_prompt_dismissed_count';
  private readonly PWA_INSTALLED_KEY = 'pwa_installed';
  private readonly OPEN_APP_DISMISSED_KEY = 'pwa_open_app_dismissed';
  private readonly MAX_DISMISSALS = 3;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.setupInstallPrompt();
      this.checkAndShowBanners();
    }
  }

  /**
   * Verifica qué banner mostrar: instalación o abrir app
   */
  private checkAndShowBanners(): void {
    if (this.pwaDetectionService.isRunningAsPwa()) {
      return;
    }

    if (this.isPwaInstalled()) {
      this.checkAndShowOpenAppBanner();
    } else {
      this.checkAndShowInstallBanner();
    }
  }

  /**
   * Verifica si la PWA fue instalada previamente
   */
  private isPwaInstalled(): boolean {
    return this.storage.getItem(this.PWA_INSTALLED_KEY) === 'true';
  }

  /**
   * Marca la PWA como instalada
   */
  private markPwaAsInstalled(): void {
    this.storage.setItem(this.PWA_INSTALLED_KEY, 'true');
  }

  /**
   * Verifica si debe mostrar el banner para abrir la app instalada
   */
  private checkAndShowOpenAppBanner(): void {
    const dismissed = this.storage.getItem(this.OPEN_APP_DISMISSED_KEY);
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const now = new Date();
      const daysSinceDismissed = Math.floor(
        (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysSinceDismissed < 1) {
        return;
      }
    }

    setTimeout(() => {
      this.showOpenAppBanner.set(true);
    }, 2000);
  }

  /**
   * Configura el listener para el evento beforeinstallprompt
   */
  private setupInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt.set(e as BeforeInstallPromptEvent);
      this.checkAndShowInstallBanner();
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt.set(null);
      this.showInstallBanner.set(false);
      this.markPwaAsInstalled();
      this.clearDismissalHistory();
      this.logger.info('PWA instalada exitosamente');
    });
  }

  /**
   * Verifica si debe mostrar el banner de instalación
   */
  private checkAndShowInstallBanner(): void {
    if (this.pwaDetectionService.isRunningAsPwa()) {
      return;
    }

    if (!this.deferredPrompt()) {
      return;
    }

    const dismissedCount = this.getDismissalCount();
    if (dismissedCount >= this.MAX_DISMISSALS) {
      return;
    }

    const lastDismissed = this.storage.getItem(this.INSTALL_PROMPT_DISMISSED_KEY);
    if (lastDismissed) {
      const dismissedDate = new Date(lastDismissed);
      const now = new Date();
      const daysSinceDismissed = Math.floor(
        (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysSinceDismissed < 7) {
        return;
      }
    }

    setTimeout(() => {
      this.showInstallBanner.set(true);
    }, 3000);
  }

  /**
   * Instala la PWA mostrando el prompt nativo
   */
  async installPwa(): Promise<void> {
    const promptEvent = this.deferredPrompt();
    if (!promptEvent) {
      this.logger.warn('No hay prompt de instalación disponible');
      return;
    }

    this.isInstalling.set(true);

    try {
      promptEvent.prompt();
      const choiceResult = await promptEvent.userChoice;

      if (choiceResult.outcome === 'accepted') {
        this.logger.info('Usuario aceptó instalar la PWA');
        this.deferredPrompt.set(null);
        this.showInstallBanner.set(false);
        this.markPwaAsInstalled();
        this.clearDismissalHistory();
      } else {
        this.logger.info('Usuario rechazó instalar la PWA');
        this.dismissInstallBanner();
      }
    } catch (error) {
      this.logger.error('Error al mostrar prompt de instalación:', error);
    } finally {
      this.isInstalling.set(false);
    }
  }

  /**
   * Descarta el banner de instalación
   */
  dismissInstallBanner(): void {
    this.showInstallBanner.set(false);
    this.storage.setItem(this.INSTALL_PROMPT_DISMISSED_KEY, new Date().toISOString());

    const currentCount = this.getDismissalCount();
    this.storage.setItem(this.INSTALL_PROMPT_DISMISSED_COUNT_KEY, (currentCount + 1).toString());
  }

  /**
   * Obtiene el número de veces que se ha descartado el prompt
   */
  private getDismissalCount(): number {
    const count = this.storage.getItem(this.INSTALL_PROMPT_DISMISSED_COUNT_KEY);
    return count ? parseInt(count, 10) : 0;
  }

  /**
   * Limpia el historial de descartes (cuando se instala la PWA)
   */
  private clearDismissalHistory(): void {
    this.storage.removeItem(this.INSTALL_PROMPT_DISMISSED_KEY);
    this.storage.removeItem(this.INSTALL_PROMPT_DISMISSED_COUNT_KEY);
  }

  /**
   * Muestra manualmente el banner de instalación
   */
  showInstallBannerManually(): void {
    if (this.deferredPrompt() && !this.pwaDetectionService.isRunningAsPwa()) {
      this.showInstallBanner.set(true);
    }
  }

  /**
   * Intenta abrir la PWA instalada
   * Nota: No hay una API estándar para abrir la PWA desde el navegador.
   * Esta función muestra un mensaje instructivo al usuario sobre cómo abrir la app.
   * En Android con Chrome, el navegador puede mostrar automáticamente un banner
   * para abrir en la app instalada gracias a launch_handler en el manifest.
   */
  openInstalledApp(): void {
    this.showOpenAppBanner.set(false);

    if (isPlatformBrowser(this.platformId)) {
      const isAndroid = /Android/i.test(navigator.userAgent);
      const isChrome = /Chrome/i.test(navigator.userAgent);

      if (isAndroid && isChrome) {
        alert(
          'Por favor, busca el banner en la parte superior de la pantalla que dice "Abrir en la app" o busca el ícono de la app en tu pantalla de inicio.',
        );
      } else {
        alert(
          'Por favor, busca el ícono de la aplicación en tu pantalla de inicio o en el menú de aplicaciones para abrirla.',
        );
      }
    }
  }

  /**
   * Descarta el banner de abrir app
   */
  dismissOpenAppBanner(): void {
    this.showOpenAppBanner.set(false);
    this.storage.setItem(this.OPEN_APP_DISMISSED_KEY, new Date().toISOString());
  }
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => void;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
