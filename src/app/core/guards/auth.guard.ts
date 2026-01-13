import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AUTH_PORT } from '@modules/auth/domain/auth.token';
import { IAuthPort } from '@modules/auth/domain/auth.port';
import { HttpErrorResponse } from '@angular/common/http';

/**
 * Guard que protege rutas que requieren autenticación
 * Si el usuario no está autenticado, será redirigido al login
 *
 * Nota de seguridad: En SSR, redirigimos al login por defecto para no exponer
 * contenido que requiere autenticación en el HTML inicial renderizado
 */
export const authGuard: CanActivateFn = async (route, state) => {
  const authPort = inject<IAuthPort>(AUTH_PORT);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // En SSR, redirigir al login para no exponer contenido protegido
  // El cliente manejará la autenticación correctamente después de la hidratación
  if (!isPlatformBrowser(platformId)) {
    // Retornar false sin redirigir - Angular SSR manejará esto apropiadamente
    // El contenido protegido no se renderizará en el servidor
    return false;
  }

  // Verificar primero si hay token válido antes de intentar inicializar
  const hasValidToken = authPort.isAuthenticated();

  if (!hasValidToken) {
    void router.navigate(['/login'], {
      queryParams: { returnUrl: state.url },
    });
    return false;
  }

  // Asegurarse de que el usuario esté inicializado
  try {
    await authPort.initializeUserFromToken();
  } catch (error: unknown) {
    // Si el error es 401/403, el token fue limpiado en initializeUserFromToken
    // Verificar nuevamente si hay token
    if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
      if (!authPort.isAuthenticated()) {
        void router.navigate(['/login'], {
          queryParams: { returnUrl: state.url },
        });
        return false;
      }
    }
    // Si es otro tipo de error (red, timeout), continuar con el token existente
    // El usuario puede seguir usando la app si el token es válido
  }

  // Verificar nuevamente después de la inicialización
  // Si hay token válido, permitir acceso (incluso si la inicialización falló por error de red)
  if (authPort.isAuthenticated()) {
    return true;
  }

  // Redirigir al login con la URL de retorno
  void router.navigate(['/login'], {
    queryParams: { returnUrl: state.url },
  });
  return false;
};
