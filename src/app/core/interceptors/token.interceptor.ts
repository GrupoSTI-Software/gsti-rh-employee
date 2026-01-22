import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SecureStorageService } from '@core/services/secure-storage.service';
import { JwtService } from '@core/services/jwt.service';

/**
 * Constante para el nombre de la cookie del token de autenticación
 */
const AUTH_TOKEN_COOKIE = 'auth_token';

/**
 * Interceptor para agregar automáticamente el token de autenticación
 * a todas las peticiones HTTP que lo requieran.
 * Usa cookies seguras con prefijo como fuente principal.
 */
export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  const secureStorage = inject(SecureStorageService);
  const jwtService = inject(JwtService);

  // Solo agregar token en el navegador
  if (!isPlatformBrowser(platformId)) {
    return next(req);
  }

  // Obtener el token de la cookie segura con prefijo
  const token = secureStorage.getCookie(AUTH_TOKEN_COOKIE);

  // Detectar si el body es FormData
  const isFormData = req.body instanceof FormData;

  // Preparar headers base
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  // Solo agregar Content-Type si NO es FormData
  // FormData necesita que el navegador establezca el Content-Type automáticamente
  // con el boundary correcto para multipart/form-data
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  // Clonar la petición y agregar headers
  let clonedReq = req.clone({
    setHeaders: headers,
  });

  // Agregar token de autorización si existe y es válido
  if (
    token &&
    token.length > 0 &&
    jwtService.isValidFormat(token) &&
    !jwtService.isExpired(token)
  ) {
    clonedReq = clonedReq.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(clonedReq);
};
