/**
 * Respuesta de la API para coordenadas de las zonas permitidas para el empleado
 */
export interface IZoneCoordinatesApiResponse {
  status: number;
  type: string;
  title: string;
  message: string;
  data: {
    coordinates: number[][][];
  };
}
