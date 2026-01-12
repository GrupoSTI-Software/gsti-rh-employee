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
 */
export const authGuard: CanActivateFn = async (route, state) => {
  const authPort = inject<IAuthPort>(AUTH_PORT);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // En SSR, siempre permitir el acceso y dejar que el cliente verifique
  // Esto evita redirecciones incorrectas durante el renderizado del servidor
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  // Verificar primero si hay token antes de intentar inicializar
  const hasToken = authPort.isAuthenticated();

  if (!hasToken) {
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
  // Si hay token, permitir acceso (incluso si la inicialización falló por error de red)
  if (authPort.isAuthenticated()) {
    return true;
  }

  // Redirigir al login con la URL de retorno
  void router.navigate(['/login'], {
    queryParams: { returnUrl: state.url },
  });
  return false;
};
