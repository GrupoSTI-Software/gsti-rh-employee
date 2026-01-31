import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { IExceptionPort } from '../domain/entities/exception-port.interface';
import { IExceptionType } from '../domain/entities/exception-type.interface';
import { IExceptionTypesApiResponse } from '../domain/entities/exception-types-api-response.interface';
import {
  IExceptionRequest,
  IExceptionRequestResponse,
} from '../domain/entities/exception-request.interface';
import {
  IExceptionRequestDetail,
  IExceptionRequestsApiResponse,
} from '../domain/entities/exception-request-detail.interface';
import { environment } from '@env/environment';
import { LoggerService } from '@core/services/logger.service';

/**
 * Adaptador HTTP para excepciones de turno
 * Implementa el puerto ExceptionPort usando HTTP
 * Nota: El token de autenticación se agrega automáticamente mediante el interceptor
 */
@Injectable({
  providedIn: 'root',
})
export class HttpExceptionAdapter implements IExceptionPort {
  private readonly http = inject(HttpClient);
  private readonly logger = inject(LoggerService);
  private readonly apiUrl = environment.API_URL;

  /**
   * Obtiene los tipos de excepción activos
   */
  async getExceptionTypes(
    search = '',
    onlyActive = true,
    page = 1,
    limit = 100,
  ): Promise<IExceptionType[]> {
    try {
      const url = `${this.apiUrl}/exception-types?search=${search}&onlyActive=${onlyActive}&page=${page}&limit=${limit}`;

      const response = await firstValueFrom<IExceptionTypesApiResponse>(
        this.http.get<IExceptionTypesApiResponse>(url),
      );

      return response.data?.exceptionTypes?.data ?? [];
    } catch (error: unknown) {
      this.logger.error('Error al obtener tipos de excepción:', error);
      return [];
    }
  }

  /**
   * Crea una solicitud de excepción de turno
   */
  async createExceptionRequest(request: IExceptionRequest): Promise<IExceptionRequestResponse> {
    try {
      const url = `${this.apiUrl}/exception-requests`;

      const response = await firstValueFrom<IExceptionRequestResponse>(
        this.http.post<IExceptionRequestResponse>(url, request),
      );

      return response;
    } catch (error: unknown) {
      this.logger.error('Error al crear solicitud de excepción:', error);
      throw error;
    }
  }

  /**
   * Obtiene las solicitudes de excepción del empleado
   */
  async getExceptionRequests(
    employeeId: number,
    searchText = '',
    departmentId?: number,
    positionId?: number,
    status?: string,
    page = 1,
    limit = 30,
  ): Promise<IExceptionRequestDetail[]> {
    try {
      let url = `${this.apiUrl}/exception-requests/all?employeeName=${employeeId}&page=${page}&limit=${limit}`;

      if (searchText) {
        url += `&searchText=${encodeURIComponent(searchText)}`;
      }
      if (departmentId) {
        url += `&departmentId=${departmentId}`;
      }
      if (positionId) {
        url += `&positionId=${positionId}`;
      }
      if (status) {
        url += `&status=${encodeURIComponent(status)}`;
      }

      const response = await firstValueFrom<IExceptionRequestsApiResponse>(
        this.http.get<IExceptionRequestsApiResponse>(url),
      );

      return response.data?.data ?? [];
    } catch (error: unknown) {
      this.logger.error('Error al obtener solicitudes de excepción:', error);
      return [];
    }
  }
}
