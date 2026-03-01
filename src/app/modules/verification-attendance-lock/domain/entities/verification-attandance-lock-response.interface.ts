/**
 * Respuesta de la API para verificar el bloqueo de asistencia
 */
export interface IVerificationAttendanceLockApiResponse {
  status: number;
  type: string;
  title: string;
  message: string;
  data: {
    locked: boolean;
    type: string;
  };
}
