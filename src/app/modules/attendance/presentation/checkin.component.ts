import { Component, inject, signal, OnInit, OnDestroy, computed, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { GetAttendanceUseCase } from '../application/get-attendance.use-case';
import { StoreAssistUseCase } from '../application/store-assist.use-case';
import { AUTH_PORT } from '@modules/auth/domain/auth.token';
import { AuthPort } from '@modules/auth/domain/auth.port';
import { Attendance } from '../domain/attendance.port';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-checkin',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './checkin.component.html',
  styleUrl: './checkin.component.scss',
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('500ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('400ms ease-out', style({ opacity: 1 }))
      ])
    ])
  ]
})
export class CheckinComponent implements OnInit, OnDestroy {
  private readonly getAttendanceUseCase = inject(GetAttendanceUseCase);
  private readonly storeAssistUseCase = inject(StoreAssistUseCase);
  private readonly authPort = inject<AuthPort>(AUTH_PORT);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private timeInterval?: any;

  readonly attendance = signal<Attendance | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly currentDate = signal<Date>(new Date());
  readonly selectedDate = signal<Date>(new Date());

  readonly currentTime = signal<string>('');

  readonly formattedDate = computed(() => {
    return this.selectedDate().toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  });

  private updateCurrentTime(): void {
    const now = new Date();
    const timeString = now.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    this.currentTime.set(timeString);
  }

  readonly canCheckIn = computed(() => {
    const att = this.attendance();
    return !att?.checkInTime && !this.loading();
  });

  readonly canCheckOut = computed(() => {
    const att = this.attendance();
    return att?.checkInTime && !att?.checkOutTime && !this.loading();
  });

  ngOnInit(): void {
    // Inicializar la hora inmediatamente
    this.updateCurrentTime();

    // Actualizar hora cada segundo
    this.timeInterval = setInterval(() => {
      this.updateCurrentTime();
    }, 1000);

    // Solicitar permisos necesarios
    this.requestPermissions();

    this.loadAttendance();
  }

  /**
   * Solicita los permisos necesarios para el checkin (cámara y ubicación)
   */
  private async requestPermissions(): Promise<void> {
    // Solo solicitar permisos en el navegador, no en SSR
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Solicitar permiso de ubicación
    try {
      if (navigator.geolocation) {
        if (navigator.permissions && navigator.permissions.query) {
          const geoPermission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
          if (geoPermission.state === 'prompt') {
            // Intentar obtener ubicación para activar el prompt
            navigator.geolocation.getCurrentPosition(
              () => console.log('Permiso de ubicación concedido'),
              () => console.warn('Permiso de ubicación denegado'),
              { timeout: 1000 }
            );
          }
        } else {
          // Si no está disponible permissions API, intentar directamente
          navigator.geolocation.getCurrentPosition(
            () => console.log('Permiso de ubicación concedido'),
            () => console.warn('Permiso de ubicación denegado'),
            { timeout: 1000 }
          );
        }
      }
    } catch (error) {
      console.warn('Error al solicitar permiso de ubicación:', error);
    }

    // Solicitar permiso de cámara
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        // Cerrar el stream inmediatamente, solo necesitamos el permiso
        stream.getTracks().forEach(track => track.stop());
        console.log('Permiso de cámara concedido');
      }
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        console.warn('Permiso de cámara denegado');
      } else if (error.name === 'NotFoundError') {
        console.warn('Cámara no encontrada');
      } else {
        console.warn('Error al solicitar permiso de cámara:', error);
      }
    }
  }

  ngOnDestroy(): void {
    // Limpiar el intervalo cuando el componente se destruya
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
  }

  async loadAttendance(): Promise<void> {
    const user = this.authPort.getCurrentUser();
    if (!user?.employeeId) {
      this.error.set('No se encontró el ID del empleado');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      const date = this.selectedDate();
      const dateStart = date.toISOString().split('T')[0];
      const dateEnd = dateStart;

      const attendance = await this.getAttendanceUseCase.execute(
        dateStart,
        dateEnd,
        user.employeeId
      );

      this.attendance.set(attendance);
    } catch (err) {
      this.error.set('Error al cargar la asistencia');
      console.error(err);
    } finally {
      this.loading.set(false);
    }
  }

  async handleCheckIn(): Promise<void> {
    if (!this.canCheckIn()) return;

    const user = this.authPort.getCurrentUser();
    if (!user?.employeeId) {
      this.error.set('No se encontró el ID del empleado');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      // Obtener ubicación
      const location = await this.getCurrentLocation();

      const success = await this.storeAssistUseCase.execute(
        user.employeeId,
        location.coords.latitude,
        location.coords.longitude,
        location.coords.accuracy || 0
      );

      if (success) {
        // Recargar asistencia
        await this.loadAttendance();
      } else {
        this.error.set('Error al registrar el check-in');
      }
    } catch (err) {
      this.error.set('Error al obtener la ubicación o registrar check-in');
      console.error(err);
    } finally {
      this.loading.set(false);
    }
  }

  async handleCheckOut(): Promise<void> {
    if (!this.canCheckOut()) return;

    const user = this.authPort.getCurrentUser();
    if (!user?.employeeId) {
      this.error.set('No se encontró el ID del empleado');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      // Obtener ubicación
      const location = await this.getCurrentLocation();

      const success = await this.storeAssistUseCase.execute(
        user.employeeId,
        location.coords.latitude,
        location.coords.longitude,
        location.coords.accuracy || 0
      );

      if (success) {
        // Recargar asistencia
        await this.loadAttendance();
      } else {
        this.error.set('Error al registrar el check-out');
      }
    } catch (err) {
      this.error.set('Error al obtener la ubicación o registrar check-out');
      console.error(err);
    } finally {
      this.loading.set(false);
    }
  }

  private getCurrentLocation(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalización no disponible'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }

  previousDay(): void {
    const date = new Date(this.selectedDate());
    date.setDate(date.getDate() - 1);
    this.selectedDate.set(date);
    this.loadAttendance();
  }

  nextDay(): void {
    const date = new Date(this.selectedDate());
    date.setDate(date.getDate() + 1);
    this.selectedDate.set(date);
    this.loadAttendance();
  }
}

