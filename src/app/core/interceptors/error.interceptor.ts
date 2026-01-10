import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { catchError, throwError } from 'rxjs';
import { AUTH_PORT } from '@modules/auth/domain/auth.token';
import { AuthPort } from '@modules/auth/domain/auth.port';

/**
 * Interceptor para manejar errores HTTP globales.
 * Redirige al login cuando se detectan errores 401 (Unauthorized) o 403 (Forbidden).
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  const authPort = inject<AuthPort>(AUTH_PORT);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Solo manejar errores en el navegador
      if (!isPlatformBrowser(platformId)) {
        return throwError(() => error);
      }

      // Manejar errores de autenticación
      // No interceptar errores de /auth/session ni /auth/login ya que se manejan en el guard/componente
      const isSessionEndpoint = req.url.includes('/auth/session');
      const isLoginEndpoint = req.url.includes('/auth/login');

      if ((error.status === 401 || error.status === 403) && !isSessionEndpoint && !isLoginEndpoint) {
        // Cerrar sesión y limpiar datos
        authPort.logout();

        // Redirigir al login solo si no estamos ya en la página de login o pwa-required
        const currentUrl = router.url;
        if (!currentUrl.includes('/login') && !currentUrl.includes('/pwa-required')) {
          router.navigate(['/login']);
        }
      }

      // Re-lanzar el error para que los componentes puedan manejarlo si es necesario
      return throwError(() => error);
    })
  );
};

