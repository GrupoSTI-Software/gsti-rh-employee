import { IHoliday } from './holiday.interface';

/**
 * Metadatos de paginación
 */
export interface IHolidaysMeta {
  total: number;
  perPage: number;
  currentPage: number;
  lastPage: number;
  firstPage: number;
  firstPageUrl: string;
  lastPageUrl: string;
  nextPageUrl: string | null;
  previousPageUrl: string | null;
}

/**
 * Respuesta de la API para obtener festividades
 */
export interface IHolidaysApiResponse {
  status: number;
  type: string;
  title: string;
  message: string;
  holidays: {
    meta: IHolidaysMeta;
    data: IHoliday[];
  };
}
