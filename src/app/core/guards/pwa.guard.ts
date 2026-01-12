import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PwaDetectionService } from '@core/services/pwa-detection.service';
import { environment } from '@env/environment';
/**
 * Guard que protege rutas para que solo sean accesibles desde una PWA instalada
 * Si el usuario intenta acceder desde un navegador normal, será redirigido
 */
export const pwaGuard: CanActivateFn = (route, state) => {
  const pwaService = inject(PwaDetectionService);
  const router = inject(Router);

  // En desarrollo, permitir acceso directo desde el navegador web
  if (!environment.production) {
    return true;
  }

  // En producción, solo permitir si está instalada como PWA
  if (pwaService.isRunningAsPwa()) {
    return true;
  }

  // Si no está en modo PWA en producción, redirigir a página de información
  void router.navigate(['/pwa-required'], {
    queryParams: { returnUrl: state.url },
  });
  return false;
};

/**
 * Guard inverso: permite acceso solo si NO está en modo PWA
 * Útil para páginas de información o instalación
 */
export const nonPwaGuard: CanActivateFn = (_route, _state) => {
  const pwaService = inject(PwaDetectionService);
  const router = inject(Router);
  if (!pwaService.isRunningAsPwa()) {
    return true;
  }

  // Si está en modo PWA, redirigir al login o dashboard
  void router.navigate(['/login']);
  return false;
};
