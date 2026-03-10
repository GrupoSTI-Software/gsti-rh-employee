/**
 * Puerto para obtener coordenadas de las zonas permitidas para el empleado
 * Define la interfaz que debe implementar cualquier adaptador
 */
export interface IZoneCoordinatesPort {
  /**
   * Obtiene las coordenadas de las zonas permitidas para el empleado
   * @param employeeId - ID del empleado
   * @returns Promise con las coordenadas de las zonas permitidas para el empleado
   */
  getZoneCoordinates(employeeId: number): Promise<number[][][] | null>;
}
