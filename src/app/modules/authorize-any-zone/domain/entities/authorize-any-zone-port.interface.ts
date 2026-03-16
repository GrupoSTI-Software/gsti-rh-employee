/**
 * Puerto para obtener si el empleado tiene permiso para registrar asistencia en cualquier zona
 * Define la interfaz que debe implementar cualquier adaptador
 */
export interface IAuthorizeAnyZonePort {
  /**
   * Obtiene si el empleado tiene permiso para registrar asistencia en cualquier zona
   * @param employeeId - ID del empleado
   * @returns Promise con si el empleado tiene permiso para registrar asistencia en cualquier zona
   */
  getAuthorizeAnyZone(employeeId: number): Promise<boolean | null>;
}
