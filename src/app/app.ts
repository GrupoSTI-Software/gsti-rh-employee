import { Component, signal, inject, OnInit, AfterViewInit, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ThemeService } from '@core/services/theme.service';
import { BrandingService } from '@core/services/branding.service';
import { SecureStorageService } from '@core/services/secure-storage.service';
import { PullToRefreshDirective } from '@shared/directives/pull-to-refresh.directive';
import { NoConnectionOverlayComponent } from '@shared/components/no-connection-overlay/no-connection-overlay.component';
import { PwaRequiredComponent } from '@shared/components/pwa-required/pwa-required.component';
import { PwaInstallPromptService } from '@core/services/pwa-install-prompt.service';
import { PwaUpdateOverlayComponent } from '@shared/components/pwa-update-overlay/pwa-update-overlay.component';
import { PwaUpdateService } from '@core/services/pwa-update.service';
import { PwaDetectionService } from '@core/services/pwa-detection.service';
import { LoggerService } from '@core/services/logger.service';
import { environment } from '@env/environment';

/**
 * Clave para almacenar el idioma de la aplicación
 */
const LANGUAGE_STORAGE_KEY = 'app-language';

/**
 * Declaración de la función global del splash screen en el objeto window
 */
declare global {
  interface Window {
    hideSplashScreen?: () => void;
  }
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    PullToRefreshDirective,
    NoConnectionOverlayComponent,
    PwaRequiredComponent,
    PwaUpdateOverlayComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit, AfterViewInit {
  protected readonly title = signal('gsti-pwa-empleado');
  private readonly translate = inject(TranslateService);
  private readonly theme = inject(ThemeService);
  private readonly branding = inject(BrandingService);
  private readonly secureStorage = inject(SecureStorageService);
  private readonly pwaInstallPrompt = inject(PwaInstallPromptService);
  private readonly pwaDetection = inject(PwaDetectionService);
  private readonly logger = inject(LoggerService);
  // Inicializa el servicio de actualizaciones al arrancar la app
  private readonly _pwaUpdate = inject(PwaUpdateService);

  /**
   * Signal que indica si la PWA está corriendo en modo standalone
   */
  private readonly isPwaRunning = signal(false);

  /**
   * Signal que indica si la PWA fue instalada alguna vez (aunque no esté corriendo ahora)
   */
  private readonly wasPwaInstalled = signal(false);

  /**
   * Determina si debe mostrar el componente PWA Required.
   * Se muestra en producción cuando no está corriendo en modo PWA.
   */
  protected readonly shouldShowPwaRequired = computed(() => {
    return environment.PRODUCTION && !this.isPwaRunning();
  });

  /**
   * Determina el modo de visualización del componente PWA Required:
   * - 'banner': Si la PWA está instalada pero se abre desde el navegador (mostrar banner para abrir)
   * - 'full': Si la PWA no está instalada (mostrar instrucciones completas de instalación)
   */
  protected readonly pwaRequiredMode = computed<'full' | 'banner'>(() => {
    return this.wasPwaInstalled() ? 'banner' : 'full';
  });

  constructor() {
    // Inicializar tema
    this.theme.theme();

    // Cargar branding lo más temprano posible (antes de ngOnInit)
    // Esto asegura que el favicon y manifest se actualicen antes de que el usuario instale la PWA
    void this.branding.loadBranding();

    // Inicializar estado de PWA y verificar si debe mostrar prompt de apertura
    void this.initializePwaState();
  }

  /**
   * Inicializa el estado de la PWA y verifica si debe mostrar el prompt de apertura
   */
  private async initializePwaState(): Promise<void> {
    const isPwa = await this.pwaDetection.isRunningAsPwaAsync();
    this.isPwaRunning.set(isPwa);

    // Verificar si la PWA fue instalada alguna vez (aunque no esté corriendo ahora)
    const hasPersistedState = this.secureStorage.getItem('pwa_standalone_confirmed') === 'true';
    const markedAsInstalled = this.secureStorage.getItem('pwa_installed') === 'true';
    this.wasPwaInstalled.set(hasPersistedState || markedAsInstalled);

    // Si está en producción, no está en modo PWA, pero la PWA está instalada,
    // el banner de "Abrir app" se mostrará automáticamente
    if (environment.PRODUCTION && !isPwa && this.wasPwaInstalled()) {
      this.attemptToOpenInstalledPwa();
    }
  }

  /**
   * Intenta abrir la PWA instalada cuando se detecta que el usuario
   * está en el navegador pero tiene la PWA instalada
   */
  private attemptToOpenInstalledPwa(): void {
    // En Android Chrome, mostrar mensaje para que el usuario abra desde el ícono
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isAndroid) {
      // Android: El navegador puede mostrar un banner automático para abrir en la app
      // Si no aparece, el usuario verá el banner de "Abrir app" en la UI
      this.logger.info('PWA instalada detectada en Android, mostrando banner de apertura');
    } else if (isIOS) {
      // iOS: No hay forma programática de abrir la PWA, mostrar banner
      this.logger.info('PWA instalada detectada en iOS, mostrando banner de apertura');
    }
  }

  ngOnInit(): void {
    // Agregar idiomas disponibles
    this.translate.addLangs(['es', 'en']);
    this.translate.setDefaultLang('es');

    // Obtener idioma guardado o usar el por defecto
    if (typeof window !== 'undefined') {
      const savedLang = this.secureStorage.getItem(LANGUAGE_STORAGE_KEY);
      const langToUse = savedLang === 'en' || savedLang === 'es' ? savedLang : 'es';
      this.translate.use(langToUse);

      // Deshabilitar gestos de navegación del navegador (swipe back/forward)
      this.disableNavigationGestures();
    } else {
      this.translate.use('es');
    }
  }

  /**
   * Deshabilita los gestos de navegación del navegador (deslizar para ir atrás/adelante)
   * en dispositivos móviles para evitar comportamientos no deseados en la PWA.
   */
  private disableNavigationGestures(): void {
    let touchStartX = 0;
    let touchStartY = 0;

    // Prevenir gestos de navegación en los bordes de la pantalla
    window.addEventListener(
      'touchstart',
      (e: TouchEvent) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      },
      { passive: false },
    );

    window.addEventListener(
      'touchmove',
      (e: TouchEvent) => {
        const touchEndX = e.touches[0].clientX;
        const touchEndY = e.touches[0].clientY;
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;

        // Si el gesto es principalmente horizontal y comienza cerca del borde
        if (
          Math.abs(deltaX) > Math.abs(deltaY) &&
          (touchStartX < 50 || touchStartX > window.innerWidth - 50)
        ) {
          e.preventDefault();
        }
      },
      { passive: false },
    );

    // Prevenir navegación con gestos del historial
    window.addEventListener('popstate', (e: PopStateEvent) => {
      // Permitir la navegación interna de Angular pero prevenir gestos del navegador
      if (e.state === null) {
        history.pushState(null, '', window.location.href);
      }
    });

    // Establecer estado inicial para prevenir navegación hacia atrás en el primer load
    history.pushState(null, '', window.location.href);
  }

  ngAfterViewInit(): void {
    // Ocultar el splash screen una vez que Angular terminó de renderizar la vista
    setTimeout(() => this.hideSplashScreen(), 300);
  }

  /**
   * Oculta el splash screen inicial de carga
   */
  private hideSplashScreen(): void {
    if (typeof window !== 'undefined' && window.hideSplashScreen) {
      window.hideSplashScreen();
    }
  }
}
