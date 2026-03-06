import { Component, signal, inject, OnInit, AfterViewInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ThemeService } from '@core/services/theme.service';
import { BrandingService } from '@core/services/branding.service';
import { SecureStorageService } from '@core/services/secure-storage.service';
import { PullToRefreshDirective } from '@shared/directives/pull-to-refresh.directive';
import { NoConnectionOverlayComponent } from '@shared/components/no-connection-overlay/no-connection-overlay.component';

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
  imports: [RouterOutlet, PullToRefreshDirective, NoConnectionOverlayComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit, AfterViewInit {
  protected readonly title = signal('gsti-pwa-empleado');
  private readonly translate = inject(TranslateService);
  private readonly theme = inject(ThemeService);
  private readonly branding = inject(BrandingService);
  private readonly secureStorage = inject(SecureStorageService);

  constructor() {
    // Inicializar tema
    this.theme.theme();

    // Cargar branding lo más temprano posible (antes de ngOnInit)
    // Esto asegura que el favicon y manifest se actualicen antes de que el usuario instale la PWA
    void this.branding.loadBranding();
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
