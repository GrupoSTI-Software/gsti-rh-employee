/**
 * Solicitud de excepción de turno
 */
export interface IExceptionRequest {
  employeeId: number;
  exceptionTypeId: number;
  exceptionRequestStatus: 'requested' | 'pending' | 'accepted' | 'refused';
  exceptionRequestDescription: string;
  requestedDate: string;
  exceptionRequestCheckInTime?: string | null;
  exceptionRequestCheckOutTime?: string | null;
  daysToApply?: number;
}

/**
 * Respuesta de creación de solicitud de excepción
 */
export interface IExceptionRequestResponse {
  status: string;
  message: string;
  data: {
    employeeId: number;
    exceptionTypeId: number;
    exceptionRequestStatus: string;
    exceptionRequestDescription: string;
  };
}
