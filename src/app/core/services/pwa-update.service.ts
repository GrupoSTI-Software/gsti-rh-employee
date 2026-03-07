import { ApplicationRef, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, first } from 'rxjs/operators';
import { interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Intervalo de verificación de actualizaciones en milisegundos (cada 30 minutos)
 */
const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;

/**
 * Servicio que gestiona la detección y aplicación de actualizaciones de la PWA.
 * Utiliza el Service Worker de Angular para detectar nuevas versiones disponibles
 * y expone una señal para que los componentes muestren un aviso al usuario.
 */
@Injectable({ providedIn: 'root' })
export class PwaUpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly appRef = inject(ApplicationRef);
  private readonly platformId = inject(PLATFORM_ID);

  /** Indica si hay una nueva versión disponible para instalar */
  readonly updateAvailable = signal<boolean>(false);

  constructor() {
    if (!isPlatformBrowser(this.platformId) || !this.swUpdate.isEnabled) {
      return;
    }

    this.listenForUpdates();
    this.schedulePeriodicCheck();
  }

  /**
   * Escucha los eventos del Service Worker para detectar cuando hay una nueva versión lista.
   * Solo activa la señal cuando la versión está completamente descargada y lista para activar.
   */
  private listenForUpdates(): void {
    this.swUpdate.versionUpdates
      .pipe(
        filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.updateAvailable.set(true);
      });
  }

  /**
   * Programa verificaciones periódicas de actualizaciones una vez que la app está estable.
   * Espera a que Angular esté estable antes de iniciar el intervalo para no interferir
   * con la carga inicial.
   */
  private schedulePeriodicCheck(): void {
    this.appRef.isStable
      .pipe(
        first((isStable) => isStable),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        interval(UPDATE_CHECK_INTERVAL_MS)
          .pipe(takeUntilDestroyed())
          .subscribe(() => {
            this.swUpdate.checkForUpdate().catch((error) => {
              console.error('Error al verificar actualizaciones del SW:', error);
            });
          });
      });
  }

  /**
   * Activa la nueva versión del Service Worker y recarga la aplicación.
   * Debe llamarse cuando el usuario acepta la actualización.
   */
  applyUpdate(): void {
    this.swUpdate
      .activateUpdate()
      .then(() => {
        window.location.reload();
      })
      .catch((error) => {
        console.error('Error al activar la actualización del SW:', error);
        window.location.reload();
      });
  }

  /**
   * Descarta el aviso de actualización sin aplicarla.
   * La actualización se aplicará en la próxima recarga manual del usuario.
   */
  dismissUpdate(): void {
    this.updateAvailable.set(false);
  }
}
