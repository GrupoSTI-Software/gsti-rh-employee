import { Component, inject, computed, signal, PLATFORM_ID, input, DestroyRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { PwaDetectionService } from '@core/services/pwa-detection.service';
import { BrandingService } from '@core/services/branding.service';
import { ThemeService } from '@core/services/theme.service';
import { LanguageSelectorComponent } from '@shared/components/language-selector/language-selector.component';
import { PwaInstallPromptService } from '@core/services/pwa-install-prompt.service';
import packageJson from '../../../../../package.json';
/**
 * Tipo de visualización del componente PWA
 */
export type PwaDisplayMode = 'full' | 'banner';

@Component({
  selector: 'app-pwa-required',
  standalone: true,
  imports: [CommonModule, TranslatePipe, LanguageSelectorComponent],
  templateUrl: './pwa-required.component.html',
  styleUrl: './pwa-required.component.scss',
})
export class PwaRequiredComponent {
  private readonly router = inject(Router);
  private readonly pwaService = inject(PwaDetectionService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  readonly branding = inject(BrandingService);
  readonly theme = inject(ThemeService);
  readonly pwaInstallPrompt = inject(PwaInstallPromptService);

  readonly version = packageJson.version;

  readonly mode = input<PwaDisplayMode>('full');
  private deferredPrompt = signal<Event | null>(null);
  readonly showPwaInfoModal = signal<boolean>(false);

  readonly logoUrl = computed(() => {
    const settings = this.branding.settings();
    if (!settings) return '/assets/gsti/icon.png';
    return this.branding.getLogoUrl();
  });

  readonly showLogo = computed(() => !this.branding.loading() && !!this.branding.settings());
  readonly isBannerMode = computed(() => this.mode() === 'banner');

  private standaloneHandler: ((e: MediaQueryListEvent) => void) | null = null;
  private standaloneQuery: MediaQueryList | null = null;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.setupInstallPrompt();
      this.setupStandaloneAutoRedirect();
    }
  }

  /**
   * Configura el evento de instalación de PWA
   */
  private setupInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt.set(e);
    });
  }

  /**
   * Escucha cambios en display-mode para redirigir automáticamente
   * al usuario cuando la PWA se abre en modo standalone.
   * Esto cubre el caso en Android donde el display-mode se propaga
   * después de que la página ya cargó y el guard redirigió aquí.
   */
  private setupStandaloneAutoRedirect(): void {
    this.standaloneQuery = window.matchMedia('(display-mode: standalone)');

    if (this.standaloneQuery.matches) {
      this.redirectToApp();
      return;
    }

    this.standaloneHandler = (e: MediaQueryListEvent): void => {
      if (e.matches) {
        this.redirectToApp();
      }
    };

    this.standaloneQuery.addEventListener('change', this.standaloneHandler);

    this.destroyRef.onDestroy(() => {
      if (this.standaloneQuery && this.standaloneHandler) {
        this.standaloneQuery.removeEventListener('change', this.standaloneHandler);
      }
    });
  }

  /**
   * Redirige al login cuando se confirma modo standalone
   */
  private redirectToApp(): void {
    void this.router.navigate(['/login']);
  }

  /**
   * Verifica si el dispositivo es Android
   */
  isAndroid(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }
    return /Android/i.test(navigator.userAgent);
  }

  /**
   * Verifica si el dispositivo es iOS
   */
  isIOS(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  /**
   * Verifica si el dispositivo es desktop/computadora
   */
  isDesktop(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }
    return !this.isAndroid() && !this.isIOS();
  }

  /**
   * Instala la PWA en el dispositivo
   */
  async installPwa(): Promise<void> {
    if (this.isBannerMode()) {
      await this.pwaInstallPrompt.installPwa();
      return;
    }

    const promptEvent = this.deferredPrompt();
    if (!promptEvent) {
      return;
    }

    (promptEvent as BeforeInstallPromptEvent).prompt();

    const choiceResult = await (promptEvent as BeforeInstallPromptEvent).userChoice;

    if (choiceResult.outcome === 'accepted') {
      this.deferredPrompt.set(null);
    }
  }

  /**
   * Descarta el banner de instalación
   */
  dismissBanner(): void {
    this.pwaInstallPrompt.dismissInstallBanner();
  }

  /**
   * Abre la app instalada
   */
  openApp(): void {
    this.pwaInstallPrompt.openInstalledApp();
  }

  /**
   * Descarta el banner de abrir app
   */
  dismissOpenAppBanner(): void {
    this.pwaInstallPrompt.dismissOpenAppBanner();
  }

  checkAgain(): void {
    if (this.pwaService.isRunningAsPwa()) {
      void this.router.navigate(['/login']);
    }
  }

  getPwaInfo(): ReturnType<typeof this.pwaService.getPwaInfo> {
    return this.pwaService.getPwaInfo();
  }

  toggleTheme(): void {
    this.theme.toggleTheme();
  }

  /**
   * Abre el modal con información sobre PWA
   */
  openPwaInfoModal(): void {
    this.showPwaInfoModal.set(true);
  }

  /**
   * Cierra el modal con información sobre PWA
   */
  closePwaInfoModal(): void {
    this.showPwaInfoModal.set(false);
  }
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => void;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
