import { IYearWorked } from './year-worked.interface';

/**
 * Respuesta de la API para obtener años trabajados
 */
export interface IYearsWorkedApiResponse {
  type: string;
  title: string;
  message: string;
  data: {
    yearsWorked: IYearWorked[];
  };
}
