import { IYearWorked } from './year-worked.interface';

/**
 * Puerto para gestión de vacaciones
 */
export interface IVacationPort {
  /**
   * Obtiene los años trabajados y vacaciones del empleado
   * @param employeeId - ID del empleado
   * @param year - Año opcional para filtrar
   * @returns Lista de años trabajados con sus vacaciones
   */
  getYearsWorked(employeeId: number, year?: number): Promise<IYearWorked[]>;

  /**
   * Firma las excepciones de turno (vacaciones)
   * @param signature - Blob de la imagen de la firma
   * @param vacationSettingId - ID de la configuración de vacaciones
   * @param shiftExceptionIds - Array de IDs de excepciones de turno a firmar
   * @returns Promise que se resuelve cuando la firma se envía correctamente
   */
  signShiftExceptions(
    signature: Blob,
    vacationSettingId: number,
    shiftExceptionIds: number[],
  ): Promise<boolean>;
}
