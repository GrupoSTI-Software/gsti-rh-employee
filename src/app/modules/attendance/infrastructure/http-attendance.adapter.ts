import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  AttendancePort,
  Attendance,
  AttendanceApiResponse
} from '../domain/attendance.port';
import { environment } from '@env/environment';

/**
 * Adaptador HTTP para asistencia
 * Implementa el puerto AttendancePort usando HTTP
 * Nota: El token de autenticación se agrega automáticamente mediante el interceptor
 */
@Injectable({
  providedIn: 'root'
})
export class HttpAttendanceAdapter implements AttendancePort {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Obtiene las asistencias del empleado
   */
  async getAttendance(
    dateStart: string,
    dateEnd: string,
    employeeId: number
  ): Promise<Attendance | null> {
    try {
      const response = await firstValueFrom<AttendanceApiResponse>(
        this.http.get<AttendanceApiResponse>(
          `${this.apiUrl}/v1/assists?date=${dateStart}&date-end=${dateEnd}&employeeId=${employeeId}`
        )
      );

      // Formatear tiempos
      const formatTime = (dateString: string | null): string | null => {
        if (!dateString) return null;
        try {
          const date = new Date(dateString);
          return date.toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit'
          });
        } catch {
          return null;
        }
      };

      const hasException =
        response.isRestDay ||
        response.isWorkDisabilityDate ||
        response.isVacationDate ||
        response.isHoliday;

      return {
        checkInTime: formatTime(response.checkIn?.assistPunchTimeUtc || null),
        checkOutTime: formatTime(response.checkOut?.assistPunchTimeUtc || null),
        checkEatInTime: formatTime(
          response.checkEatIn?.assistPunchTimeUtc || null
        ),
        checkEatOutTime: formatTime(
          response.checkEatOut?.assistPunchTimeUtc || null
        ),
        checkInStatus:
          response.checkInStatus === 'fault' && hasException
            ? ''
            : response.checkInStatus || null,
        checkOutStatus:
          response.checkOutStatus === 'fault' && hasException
            ? ''
            : response.checkOutStatus || null,
        checkEatInStatus: response.checkEatInStatus || null,
        checkEatOutStatus: response.checkEatOutStatus || null,
        shiftInfo: response.shiftInfo || null,
        isRestDay: response.isRestDay,
        isWorkDisabilityDate: response.isWorkDisabilityDate,
        isVacationDate: response.isVacationDate,
        isHoliday: response.isHoliday,
        assistFlatList: response.assitFlatList || [],
        exceptions: response.exceptions || []
      };
    } catch (error: unknown) {
      console.error('Error al obtener asistencia:', error);
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
    precision: number
  ): Promise<boolean> {
    try {
      const payload = {
        employeeId,
        assistLatitude: latitude,
        assistLongitude: longitude,
        assistPrecision: precision
      };

      await firstValueFrom(
        this.http.post(`${this.apiUrl}/v1/assists`, payload)
      );

      return true;
    } catch (error: unknown) {
      console.error('Error al registrar asistencia:', error);
      return false;
    }
  }
}

