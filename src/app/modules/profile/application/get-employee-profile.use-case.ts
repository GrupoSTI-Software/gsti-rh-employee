import { inject, Injectable } from '@angular/core';
import { PROFILE_PORT } from '../domain/profile.token';
import { IProfilePort, IEmployeeProfile } from '../domain/profile.port';
import { LoggerService } from '@core/services/logger.service';

/**
 * Caso de uso para obtener el perfil completo del empleado
 */
@Injectable({
  providedIn: 'root',
})
export class GetEmployeeProfileUseCase {
  private readonly profilePort = inject<IProfilePort>(PROFILE_PORT);
  private readonly logger = inject(LoggerService);

  /**
   * Ejecuta el caso de uso para obtener el perfil del empleado
   *
   * @param employeeId - Identificador único del empleado
   * @returns Promesa con el perfil del empleado o null si ocurre un error
   */
  async execute(employeeId: number): Promise<IEmployeeProfile | null> {
    try {
      return await this.profilePort.getEmployeeProfile(employeeId);
    } catch (error) {
      this.logger.error('Error al obtener perfil del empleado:', error);
      return null;
    }
  }
}
