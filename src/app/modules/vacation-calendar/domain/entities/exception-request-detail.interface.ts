import { IExceptionType } from './exception-type.interface';

/**
 * Empleado en la solicitud de excepción
 */
export interface IExceptionRequestEmployee {
  employeeId: number;
  employeeCode: string;
  employeeFirstName: string;
  employeeLastName: string;
  employeeSecondLastName: string;
  employeePayrollCode: string;
  employeeHireDate: string;
  employeePhoto: string | null;
  employeeWorkSchedule: string | null;
  employeeTypeOfContract: string | null;
  person: {
    personId: number;
    personFirstname: string;
    personLastname: string;
    personSecondLastname: string;
    personEmail: string;
    personPhone: string | null;
  };
  department: {
    departmentId: number;
    departmentName: string;
    departmentCode: string;
  };
  position: {
    positionId: number;
    positionName: string;
    positionCode: string;
  };
}

/**
 * Usuario en la solicitud de excepción
 */
export interface IExceptionRequestUser {
  userId: number;
  userEmail: string;
  person: {
    personId: number;
    personFirstname: string;
    personLastname: string;
    personSecondLastname: string;
  };
}

/**
 * Detalle completo de solicitud de excepción
 */
export interface IExceptionRequestDetail {
  exceptionRequestId: number;
  employeeId: number;
  exceptionTypeId: number;
  exceptionRequestStatus: 'requested' | 'pending' | 'accepted' | 'refused';
  exceptionRequestDescription: string | null;
  exceptionRequestCheckInTime: string | null;
  exceptionRequestCheckOutTime: string | null;
  userId: number;
  exceptionRequestCreatedAt: string;
  exceptionRequestUpdatedAt: string;
  deletedAt: string | null;
  requestedDate: string;
  exceptionRequestRhRead: number;
  exceptionRequestGerencialRead: number;
  exceptionType: IExceptionType;
  employee: IExceptionRequestEmployee;
  user: IExceptionRequestUser;
}

/**
 * Metadatos de paginación para excepciones
 */
export interface IExceptionRequestsMeta {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
  first_page: number;
}

/**
 * Respuesta de la API de excepciones pendientes
 */
export interface IExceptionRequestsApiResponse {
  type: string;
  title: string;
  message: string;
  data: {
    meta: IExceptionRequestsMeta;
    data: IExceptionRequestDetail[];
  };
}
