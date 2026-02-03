/**
 * Información de una festividad
 */
export interface IHoliday {
  holidayId: number;
  holidayName: string;
  holidayDate: string;
  holidayBusinessUnits: string;
  holidayIcon: string;
  holidayCreatedAt: string;
  holidayUpdatedAt: string;
  deletedAt: string | null;
  holidayFrequency: number;
  holidayIsOfficialRestDay: number;
  holidayIconId: number;
}
