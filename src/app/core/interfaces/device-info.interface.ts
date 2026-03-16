/**
 * Información del dispositivo y plataforma del usuario
 */
export interface IDeviceInfo {
  /** Tipo de dispositivo: móvil, tablet o escritorio */
  deviceType: 'mobile' | 'tablet' | 'desktop';
  /** Sistema operativo detectado */
  os: string;
  /** Versión del sistema operativo (si está disponible) */
  osVersion: string;
  /** Navegador detectado */
  browser: string;
  /** Si la app está corriendo como PWA instalada */
  isPwa: boolean;
  /** User agent completo */
  userAgent: string;
}
