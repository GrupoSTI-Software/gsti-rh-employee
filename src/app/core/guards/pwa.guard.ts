import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { PwaDetectionService } from '@core/services/pwa-detection.service';
import { environment } from '@env/environment';

/**
 * Guard que protege rutas para que solo sean accesibles desde una PWA instalada.
 * Usa verificación asíncrona en Android para cubrir el retraso de display-mode.
 */
export const pwaGuard: CanActivateFn = async (_route, state) => {
  const pwaService = inject(PwaDetectionService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (!environment.PRODUCTION) {
    return true;
  }

  if (!isPlatformBrowser(platformId)) {
    return false;
  }

  // Verificación asíncrona: en Android espera brevemente si la detección inicial falla
  const isPwa = await pwaService.isRunningAsPwaAsync();
  if (isPwa) {
    return true;
  }

  void router.navigate(['/pwa-required'], {
    queryParams: { returnUrl: state.url },
  });
  return false;
};

/**
 * Guard inverso: permite acceso solo si NO está en modo PWA.
 * Útil para la página de información o instalación.
 */
export const nonPwaGuard: CanActivateFn = async () => {
  const pwaService = inject(PwaDetectionService);
  const router = inject(Router);

  const isPwa = await pwaService.isRunningAsPwaAsync();
  if (!isPwa) {
    return true;
  }

  void router.navigate(['/login']);
  return false;
};
