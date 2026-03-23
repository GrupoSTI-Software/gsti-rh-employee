import { inject, Injectable } from '@angular/core';
import { CALENDAR_PORT } from '../domain/calendar.token';
import { ICalendarPort, IHoliday } from '../domain/vacation.port';

/**
 * Caso de uso para obtener festividades
 */
@Injectable({
  providedIn: 'root',
})
export class GetHolidaysUseCase {
  private readonly calendarPort = inject<ICalendarPort>(CALENDAR_PORT);

  /**
   * Ejecuta el caso de uso para obtener festividades
   * @param firstDate - Fecha inicial en formato YYYY-MM-DD
   * @param lastDate - Fecha final en formato YYYY-MM-DD
   * @param page - Número de página (opcional, por defecto 1)
   * @param limit - Límite de resultados por página (opcional, por defecto 20)
   * @returns Promesa con la lista de festividades
   */
  async execute(firstDate: string, lastDate: string, page = 1, limit = 20): Promise<IHoliday[]> {
    return this.calendarPort.getHolidays(firstDate, lastDate, page, limit);
  }
}
