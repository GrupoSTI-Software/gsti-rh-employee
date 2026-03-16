import { inject, Injectable } from '@angular/core';
import { LoggerService } from '@core/services/logger.service';
import { IZoneCoordinatesPort } from '../domain/zone-coordinates.port';
import { ZONE_COORDINATES_PORT } from '../domain/zone-coordinates.token';

/**
 * Caso de uso para obtener las coordenadas de las zonas permitidas para el empleado
 */
@Injectable({
  providedIn: 'root',
})
export class GetZoneCoordinatesUseCase {
  private readonly zoneCoordinatesPort = inject<IZoneCoordinatesPort>(ZONE_COORDINATES_PORT);
  private readonly logger = inject(LoggerService);

  /**
   * Ejecuta el caso de uso para obtener las coordenadas de las zonas permitidas para el empleado
   * @param employeeId - ID del empleado
   * @returns Promise con las coordenadas de las zonas permitidas para el empleado
   */
  async execute(employeeId: number): Promise<number[][][] | null> {
    try {
      return await this.zoneCoordinatesPort.getZoneCoordinates(employeeId);
    } catch (error) {
      this.logger.error(
        'Error al obtener las coordenadas de las zonas permitidas para el empleado:',
        error,
      );
      return null;
    }
  }
}
