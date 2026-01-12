/**
 * Registro individual de asistencia
 */
export interface IAssistance {
  assistId: number;
  employeeId: number;
  assistLatitude: number | null;
  assistLongitude: number | null;
  assistPunchTime: string;
  assistTerminalAlias?: string | null;
  assistAreaAlias?: string | null;
}
