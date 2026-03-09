import { IExceptionType } from './exception-type.interface';
import { IExceptionRequest, IExceptionRequestResponse } from './exception-request.interface';
import { IExceptionRequestDetail } from './exception-request-detail.interface';

/**
 * Puerto para gestión de excepciones de turno
 */
export interface IExceptionPort {
  /**
   * Obtiene los tipos de excepción activos
   * @param search - Término de búsqueda opcional
   * @param onlyActive - Solo tipos activos
   * @param page - Página
   * @param limit - Límite de resultados
   * @returns Lista de tipos de excepción
   */
  getExceptionTypes(
    search?: string,
    onlyActive?: boolean,
    page?: number,
    limit?: number,
  ): Promise<IExceptionType[]>;

  /**
   * Crea una solicitud de excepción de turno
   * @param request - Datos de la solicitud
   * @returns Respuesta de la creación
   */
  createExceptionRequest(request: IExceptionRequest): Promise<IExceptionRequestResponse>;

  /**
   * Obtiene las solicitudes de excepción del empleado
   * @param employeeId - ID del empleado
   * @param searchText - Texto de búsqueda opcional
   * @param departmentId - ID del departamento opcional
   * @param positionId - ID del puesto opcional
   * @param status - Estado de la solicitud opcional
   * @param page - Página
   * @param limit - Límite de resultados
   * @returns Lista de solicitudes de excepción
   */
  getExceptionRequests(
    employeeId: number,
    searchText?: string,
    departmentId?: number,
    positionId?: number,
    status?: string,
    page?: number,
    limit?: number,
  ): Promise<IExceptionRequestDetail[]>;
}
