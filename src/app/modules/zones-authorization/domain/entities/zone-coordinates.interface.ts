/**
 * Modelo de datos para las coordenadas de las zonas permitidas para el empleado
 */
export interface IZoneCoordinates {
  zoneId: number | null;
  zoneName: string;
  zoneThumbnail: string | null;
  zoneAddress: string;
  zonePolygon: string;
  zoneCreatedAt?: string;
  zoneUpdatedAt?: string;
  deletedAt?: string | null;
}
