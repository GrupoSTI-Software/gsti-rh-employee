/**
 * Resumen de un periodo de vacaciones para mostrar en la UI
 */
export interface IPeriodSummary {
  year: number;
  yearsPassed: number;
  periodStart: Date;
  periodEnd: Date;
  periodLabel: string;
  daysCorresponding: number;
  daysUsed: number;
  daysAvailable: number;
  previousPeriodDaysAvailable: number | null;
}
