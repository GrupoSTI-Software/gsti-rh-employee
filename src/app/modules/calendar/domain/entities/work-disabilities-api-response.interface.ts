import { IWorkDisability } from './work-disability.interface';

/**
 * Respuesta de la API de incapacidades laborales
 */
export interface IWorkDisabilitiesApiResponse {
  type: string;
  title: string;
  message: string;
  data: {
    workDisabilities: IWorkDisability[];
  };
}
