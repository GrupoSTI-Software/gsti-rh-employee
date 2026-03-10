import { inject, Injectable } from '@angular/core';
import { LoggerService } from '@core/services/logger.service';
import { IAuthorizeAnyZonePort } from '../domain/entities/authorize-any-zone-port.interface';
import { AUTHORIZE_ANY_ZONE_PORT } from '../domain/authorize-any-zone.token';

/**
 * Caso de uso para obtener si el empleado tiene permiso para registrar asistencia en cualquier zona
 */
@Injectable({
  providedIn: 'root',
})
export class GetAuthorizeAnyZoneUseCase {
  private readonly authorizeAnyZonePort = inject<IAuthorizeAnyZonePort>(AUTHORIZE_ANY_ZONE_PORT);
  private readonly logger = inject(LoggerService);

  /**
   * Ejecuta el caso de uso para obtener si el empleado tiene permiso para registrar asistencia en cualquier zona
   * @param employeeId - ID del empleado
   * @returns Promise con si el empleado tiene permiso para registrar asistencia en cualquier zona
   */
  async execute(employeeId: number): Promise<boolean | null> {
    try {
      return await this.authorizeAnyZonePort.getAuthorizeAnyZone(employeeId);
    } catch (error) {
      this.logger.error(
        'Error al obtener si el empleado tiene permiso para registrar asistencia en cualquier zona:',
        error,
      );
      return null;
    }
  }
}
