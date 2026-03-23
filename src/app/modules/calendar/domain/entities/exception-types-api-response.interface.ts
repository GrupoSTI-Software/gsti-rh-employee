import { IExceptionType } from './exception-type.interface';

/**
 * Metadatos de paginación
 */
export interface IPaginationMeta {
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
 * Respuesta de la API de tipos de excepción
 */
export interface IExceptionTypesApiResponse {
  type: string;
  title: string;
  message: string;
  data: {
    exceptionTypes: {
      meta: IPaginationMeta;
      data: IExceptionType[];
    };
  };
}
