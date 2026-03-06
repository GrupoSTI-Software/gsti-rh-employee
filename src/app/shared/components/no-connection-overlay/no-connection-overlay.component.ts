import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  NgZone,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Componente de overlay que se muestra cuando no hay conexión a internet.
 * Gestiona sus propios listeners de red para garantizar la detección de cambios
 * con ChangeDetectionStrategy.OnPush.
 */
@Component({
  selector: 'app-no-connection-overlay',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './no-connection-overlay.component.html',
  styleUrl: './no-connection-overlay.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoConnectionOverlayComponent implements OnInit, OnDestroy {
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly isRetrying = signal<boolean>(false);
  protected readonly showOverlay = signal<boolean>(false);

  private readonly onlineHandler = (): void => {
    this.ngZone.run(() => {
      this.showOverlay.set(false);
      this.cdr.markForCheck();
    });
  };

  private readonly offlineHandler = (): void => {
    this.ngZone.run(() => {
      this.showOverlay.set(true);
      this.cdr.markForCheck();
    });
  };

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Establecer estado inicial
    if (!navigator.onLine) {
      this.showOverlay.set(true);
    }

    window.addEventListener('online', this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    window.removeEventListener('online', this.onlineHandler);
    window.removeEventListener('offline', this.offlineHandler);
  }

  /**
   * Verifica la conexión haciendo una petición HTTP real al servidor
   */
  protected async retry(): Promise<void> {
    this.isRetrying.set(true);
    this.cdr.markForCheck();

    try {
      const response = await fetch(`/assets/i18n/es.json?t=${Date.now()}`, {
        method: 'HEAD',
        cache: 'no-cache',
      });

      this.ngZone.run(() => {
        if (response.ok) {
          this.showOverlay.set(false);
        }
        this.isRetrying.set(false);
        this.cdr.markForCheck();
      });
    } catch {
      this.ngZone.run(() => {
        this.showOverlay.set(true);
        this.isRetrying.set(false);
        this.cdr.markForCheck();
      });
    }
  }
}
