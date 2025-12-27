import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AUTH_PORT } from '@modules/auth/domain/auth.token';
import { AuthPort } from '@modules/auth/domain/auth.port';
import { HttpAuthAdapter } from '@modules/auth/infrastructure/http-auth.adapter';

/**
 * Guard que protege rutas que requieren autenticación
 * Si el usuario no está autenticado, será redirigido al login
 */
export const authGuard: CanActivateFn = async (route, state) => {
  const authPort = inject<AuthPort>(AUTH_PORT);
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
    router.navigate(['/login'], {
      queryParams: { returnUrl: state.url }
    });
    return false;
  }

  // Si es HttpAuthAdapter, asegurarse de que el usuario esté inicializado
  if (authPort instanceof HttpAuthAdapter) {
    try {
      await authPort.initializeUserFromToken();
    } catch (error: any) {
      // Si el error es 401/403, el token fue limpiado en initializeUserFromToken
      // Verificar nuevamente si hay token
      if (error?.status === 401 || error?.status === 403) {
        if (!authPort.isAuthenticated()) {
          router.navigate(['/login'], {
            queryParams: { returnUrl: state.url }
          });
          return false;
        }
      }
      // Si es otro tipo de error (red, timeout), continuar con el token existente
      // El usuario puede seguir usando la app si el token es válido
    }
  }

  // Verificar nuevamente después de la inicialización
  // Si hay token, permitir acceso (incluso si la inicialización falló por error de red)
  if (authPort.isAuthenticated()) {
    return true;
  }

  // Redirigir al login con la URL de retorno
  router.navigate(['/login'], {
    queryParams: { returnUrl: state.url }
  });
  return false;
};

