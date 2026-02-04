import { IHoliday } from './holiday.interface';

/**
 * Puerto para obtener festividades del calendario
 */
export interface ICalendarPort {
  /**
   * Obtiene las festividades en un rango de fechas
   * @param firstDate - Fecha inicial en formato YYYY-MM-DD
   * @param lastDate - Fecha final en formato YYYY-MM-DD
   * @param page - Número de página (opcional, por defecto 1)
   * @param limit - Límite de resultados por página (opcional, por defecto 20)
   * @returns Promesa con la lista de festividades
   */
  getHolidays(
    firstDate: string,
    lastDate: string,
    page?: number,
    limit?: number,
  ): Promise<IHoliday[]>;
}
