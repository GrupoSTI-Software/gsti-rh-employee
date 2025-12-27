import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Interceptor para agregar automáticamente el token de autenticación
 * a todas las peticiones HTTP que lo requieran.
 */
export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);

  // Solo agregar token en el navegador
  if (!isPlatformBrowser(platformId)) {
    return next(req);
  }

  // Obtener el token del localStorage
  const token = localStorage.getItem('auth_token');

  // Clonar la petición y agregar headers
  let clonedReq = req.clone({
    setHeaders: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  });

  // Agregar token de autorización si existe
  if (token) {
    clonedReq = clonedReq.clone({
      setHeaders: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  return next(clonedReq);
};

