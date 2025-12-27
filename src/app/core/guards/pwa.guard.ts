import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PwaDetectionService } from '@core/services/pwa-detection.service';

/**
 * Guard que protege rutas para que solo sean accesibles desde una PWA instalada
 * Si el usuario intenta acceder desde un navegador normal, será redirigido
 */
export const pwaGuard: CanActivateFn = (route, state) => {
  const pwaService = inject(PwaDetectionService);
  const router = inject(Router);

  if (pwaService.isRunningAsPwa()) {
    return true;
  }

  // Si no está en modo PWA, redirigir a una página de error o información
  // Puedes cambiar esto según tus necesidades
  router.navigate(['/pwa-required'], {
    queryParams: { returnUrl: state.url }
  });
  return false;
};

/**
 * Guard inverso: permite acceso solo si NO está en modo PWA
 * Útil para páginas de información o instalación
 */
export const nonPwaGuard: CanActivateFn = (route, state) => {
  const pwaService = inject(PwaDetectionService);
  const router = inject(Router);

  if (!pwaService.isRunningAsPwa()) {
    return true;
  }

  // Si está en modo PWA, redirigir al login o dashboard
  router.navigate(['/login']);
  return false;
};

