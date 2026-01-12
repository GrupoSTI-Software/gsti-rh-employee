/**
 * Información del dispositivo para autenticación
 */
export interface IDeviceInfo {
  deviceBrand: string | null;
  deviceModel: string;
  deviceOs: string;
  deviceType: string | null;
  deviceToken: string;
}
