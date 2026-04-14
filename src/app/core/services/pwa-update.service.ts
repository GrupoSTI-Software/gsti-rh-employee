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
 * Script URL del Service Worker offline que compite con ngsw-worker.js.
 * Se desregistra en el arranque para evitar que revierta la versión activa.
 */
const OFFLINE_SW_SCRIPT = 'offline-sw.js';

/**
 * Prefijo de los cachés gestionados por el Service Worker offline.
 */
const OFFLINE_CACHE_PREFIX = 'gsti-';

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
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Elimina el SW offline heredado para evitar que compita con ngsw-worker.js
    // y provoque reversiones de versión al reabrir la PWA.
    this.unregisterOfflineSW();

    if (!this.swUpdate.isEnabled) {
      return;
    }

    this.listenForUpdates();
    this.schedulePeriodicCheck();
  }

  /**
   * Desregistra el Service Worker offline legacy si aún está registrado.
   * Esto evita que compita con ngsw-worker.js por el scope raíz, lo que
   * causaba que la app revirtiera a versiones antiguas al reabrir la PWA.
   */
  private unregisterOfflineSW(): void {
    if (!('serviceWorker' in navigator)) return;

    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        const scriptURL = registration.active?.scriptURL ?? '';
        if (scriptURL.includes(OFFLINE_SW_SCRIPT)) {
          registration.unregister().catch((error) => {
            console.error('Error al desregistrar el SW offline:', error);
          });
        }
      }
    });
  }

  /**
   * Elimina todos los cachés del Service Worker offline para evitar
   * que sirvan contenido obsoleto tras una actualización.
   */
  private async clearOfflineCaches(): Promise<void> {
    if (!('caches' in window)) return;
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((key) => key.startsWith(OFFLINE_CACHE_PREFIX)).map((key) => caches.delete(key)),
    );
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
   * Limpia los cachés del SW offline antes de recargar para evitar que
   * sirvan contenido de una versión anterior al reabrir la PWA.
   * Debe llamarse cuando el usuario acepta la actualización.
   */
  applyUpdate(): void {
    this.swUpdate
      .activateUpdate()
      .then(async () => {
        await this.clearOfflineCaches();
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
