/**
 * Modelo de datos para las tolerancias de asistencia
 */
export interface ITolerance {
  toleranceId: number;
  toleranceName: string;
  toleranceMinutes: number;
  systemSettingId: number;
  toleranceCreatedAt: string;
  toleranceUpdatedAt: string;
  toleranceDeletedAt: string | null;
}
