import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { IAttendancePort, IAttendance, IAttendanceApiResponse } from '../domain/attendance.port';
import { IWorkHoliday } from '../domain/entities/work-holiday.interface';
import { environment } from '@env/environment';
import { LoggerService } from '@core/services/logger.service';
import { ApiErrorTranslatorService } from '@core/services/api-error-translator.service';

/**
 * Adaptador HTTP para asistencia
 * Implementa el puerto AttendancePort usando HTTP
 * Nota: El token de autenticación se agrega automáticamente mediante el interceptor
 */
@Injectable({
  providedIn: 'root',
})
export class HttpAttendanceAdapter implements IAttendancePort {
  private readonly http = inject(HttpClient);
  private readonly logger = inject(LoggerService);
  private readonly apiErrorTranslator = inject(ApiErrorTranslatorService);
  private readonly apiUrl = environment.API_URL;

  /**
   * Obtiene las asistencias del empleado
   */
  async getAttendance(
    dateStart: string,
    dateEnd: string,
    employeeId: number,
  ): Promise<IAttendance | null> {
    try {
      const response = await firstValueFrom<IAttendanceApiResponse>(
        this.http.get<IAttendanceApiResponse>(
          `${this.apiUrl}/v1/assists?date=${dateStart}&date-end=${dateEnd}&employeeId=${employeeId}`,
        ),
      );

      // Obtener el día específico que estamos buscando
      const calendarDay = response.data?.employeeCalendar?.find((day) => day.day === dateStart);

      if (!calendarDay?.assist) {
        return null;
      }

      const assist = calendarDay.assist;

      // Formatear tiempos desde checkInDateTime, checkOutDateTime, etc.
      const formatTime = (dateString: string | null): string | null => {
        if (dateString === null || dateString.length === 0) return null;
        try {
          const date = new Date(dateString);
          return date.toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          });
        } catch {
          return null;
        }
      };

      // Formatear tiempos desde los objetos checkIn, checkOut, etc. si existen
      const formatTimeFromObject = (
        obj: { assistPunchTimeUtc: string | null } | null,
      ): string | null => {
        if (obj?.assistPunchTimeUtc === null || obj?.assistPunchTimeUtc === undefined) return null;
        return formatTime(obj.assistPunchTimeUtc);
      };

      // Obtener información del turno
      const shiftInfo = assist.dateShift
        ? `${assist.dateShift.shiftTimeStart} - ${assist.dateShift.shiftName}`
        : null;

      // Calcular hora de fin del turno basado en las horas activas
      const calculateShiftEnd = (timeStart: string, activeHours: string): string | null => {
        if (
          timeStart === null ||
          timeStart.length === 0 ||
          activeHours === null ||
          activeHours.length === 0
        )
          return null;
        try {
          const [hours, minutes] = timeStart.split(':').map(Number);
          const activeHoursNum = parseFloat(activeHours);
          const startDate = new Date();
          startDate.setHours(hours, minutes || 0, 0, 0);
          startDate.setHours(startDate.getHours() + Math.floor(activeHoursNum));
          startDate.setMinutes(startDate.getMinutes() + Math.round((activeHoursNum % 1) * 60));
          return startDate.toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          });
        } catch {
          return null;
        }
      };

      const shiftTimeStart = assist.dateShift?.shiftTimeStart ?? null;
      const shiftTimeEnd = assist.dateShift
        ? calculateShiftEnd(assist.dateShift.shiftTimeStart, assist.dateShift.shiftActiveHours)
        : null;
      const shiftName = assist.dateShift?.shiftName ?? null;

      const hasException =
        assist.isRestDay ||
        assist.isWorkDisabilityDate ||
        assist.isVacationDate ||
        assist.isHoliday;

      const checkResponse = {
        // Solo usar los valores de checkIn, checkOut, checkEatIn, checkEatOut si no son null
        // No usar checkInDateTime o checkOutDateTime como respaldo
        checkInTime: formatTimeFromObject(assist.checkIn),
        checkOutTime: formatTimeFromObject(assist.checkOut),
        checkEatInTime: formatTimeFromObject(assist.checkEatIn),
        checkEatOutTime: formatTimeFromObject(assist.checkEatOut),
        checkInStatus:
          assist.checkInStatus === 'fault' && hasException ? '' : (assist.checkInStatus ?? null),
        checkOutStatus:
          assist.checkOutStatus === 'fault' && hasException ? '' : (assist.checkOutStatus ?? null),
        checkEatInStatus: null, // No viene en la nueva estructura
        checkEatOutStatus: null, // No viene en la nueva estructura
        shiftInfo: shiftInfo,
        shiftTimeStart: shiftTimeStart,
        shiftTimeEnd: shiftTimeEnd,
        shiftName: shiftName,
        isRestDay: assist.isRestDay,
        isWorkDisabilityDate: assist.isWorkDisabilityDate,
        isVacationDate: assist.isVacationDate,
        isHoliday: assist.isHoliday,
        holiday: assist.holiday as IWorkHoliday | null,
        assistFlatList: assist.assitFlatList ?? [],
        exceptions: (assist.exceptions ?? []).map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (exc: any) => ({
            shiftExceptionId: exc.shiftExceptionId,
            employeeId: exc.employeeId,
            exceptionTypeId: exc.exceptionTypeId,
            shiftExceptionsDate: exc.shiftExceptionsDate,
            shiftExceptionsDescription: exc.shiftExceptionsDescription,
            shiftExceptionCheckInTime: exc.shiftExceptionCheckInTime,
            shiftExceptionCheckOutTime: exc.shiftExceptionCheckOutTime,
            shiftExceptionEnjoymentOfSalary: exc.shiftExceptionEnjoymentOfSalary === true ? 1 : 0,
            shiftExceptionTimeByTime: exc.shiftExceptionTimeByTime === true ? '1' : null,
            workDisabilityPeriodId: exc.workDisabilityPeriodId,
            shiftExceptionsCreatedAt: exc.shiftExceptionsCreatedAt,
            shiftExceptionsUpdatedAt: exc.shiftExceptionsUpdatedAt,
            deletedAt: exc.deletedAt,
            vacationSettingId: exc.vacationSettingId,
            exceptionType: exc.exceptionType,
          }),
        ),
      };

      return checkResponse;
    } catch (error: unknown) {
      this.logger.error('Error al obtener asistencia:', error);

      // Traducir el mensaje de error si es posible
      if (error instanceof HttpErrorResponse) {
        const errorBody = error.error as { message?: string } | null;
        if (errorBody?.message !== undefined) {
          this.logger.error(
            'Mensaje del API:',
            this.apiErrorTranslator.translateError(errorBody.message),
          );
        }
      }

      return null;
    }
  }

  /**
   * Registra una asistencia
   */
  async storeAssist(
    employeeId: number,
    latitude: number,
    longitude: number,
    precision: number,
    type: string,
  ): Promise<boolean> {
    try {
      const payload = {
        employeeId,
        assistLatitude: latitude,
        assistLongitude: longitude,
        assistPrecision: precision,
        assistType: type,
      };

      await firstValueFrom(this.http.post(`${this.apiUrl}/v1/assists`, payload));

      return true;
    } catch (error: unknown) {
      this.logger.error('Error al registrar asistencia:', error);

      // Traducir el mensaje de error si es posible
      if (error instanceof HttpErrorResponse) {
        const errorBody = error.error as { message?: string } | null;
        if (errorBody?.message !== undefined) {
          this.logger.error(
            'Mensaje del API:',
            this.apiErrorTranslator.translateError(errorBody.message),
          );
        }
      }

      return false;
    }
  }
}
