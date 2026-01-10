import { Component, inject, signal, OnInit, OnDestroy, computed, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { TranslateService } from '@ngx-translate/core';
import { Dialog } from 'primeng/dialog';
import { GetAttendanceUseCase } from '../application/get-attendance.use-case';
import { StoreAssistUseCase } from '../application/store-assist.use-case';
import { AUTH_PORT } from '@modules/auth/domain/auth.token';
import { AuthPort } from '@modules/auth/domain/auth.port';
import { Attendance, Exception, Assistance } from '../domain/attendance.port';
import { trigger, transition, style, animate } from '@angular/animations';
import { CheckInIconComponent } from '@shared/components/icons/check-in-icon/check-in-icon.component';
import { CheckOutIconComponent } from '@shared/components/icons/check-out-icon/check-out-icon.component';
import { EatInIconComponent } from '@shared/components/icons/eat-in-icon/eat-in-icon.component';
import { EatOutIconComponent } from '@shared/components/icons/eat-out-icon/eat-out-icon.component';

@Component({
  selector: 'app-checkin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    Dialog,
    CheckInIconComponent,
    CheckOutIconComponent,
    EatInIconComponent,
    EatOutIconComponent,
  ],
  templateUrl: './checkin.component.html',
  styleUrl: './checkin.component.scss',
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('500ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('400ms ease-out', style({ opacity: 1 })),
      ]),
    ]),
  ],
})
export class CheckinComponent implements OnInit, OnDestroy {
  private readonly getAttendanceUseCase = inject(GetAttendanceUseCase);
  private readonly storeAssistUseCase = inject(StoreAssistUseCase);
  private readonly authPort = inject<AuthPort>(AUTH_PORT);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly translateService = inject(TranslateService);
  private timeInterval?: ReturnType<typeof setInterval>;

  readonly attendance = signal<Attendance | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly currentDate = signal<Date>(new Date());
  readonly selectedDate = signal<Date>(new Date());

  readonly currentTime = signal<string>('');

  // Datepicker
  showDatePicker = false;
  datePickerValue = '';
  maxDate = new Date(); // No permitir fechas futuras

  // Excepciones popup
  showExceptionsDialog = false;

  // Registros popup
  showRecordsDialog = false;

  readonly formattedDate = computed(() => {
    const currentLang = this.translateService.currentLang || 'es';
    const locale = currentLang === 'en' ? 'en-US' : 'es-MX';

    return this.selectedDate().toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  });

  private updateCurrentTime(): void {
    const now = new Date();
    const currentLang = this.translateService.currentLang || 'es';
    const locale = currentLang === 'en' ? 'en-US' : 'es-MX';
    const timeString = now.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    this.currentTime.set(timeString);
  }

  readonly canCheckIn = computed(() => {
    const att = this.attendance();
    return att?.checkInTime === null && !this.loading();
  });

  readonly canCheckOut = computed(() => {
    const att = this.attendance();
    return att?.checkInTime !== null && att?.checkOutTime === null && !this.loading();
  });

  /**
   * Verifica si se puede navegar hacia adelante (no permitir fechas futuras)
   */
  readonly canNavigateForward = computed(() => {
    const selected = this.selectedDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(selected);
    selectedDate.setHours(0, 0, 0, 0);
    return selectedDate < today;
  });

  ngOnInit(): void {
    // Inicializar la hora inmediatamente
    this.updateCurrentTime();

    // Actualizar hora cada segundo
    this.timeInterval = setInterval(() => {
      this.updateCurrentTime();
    }, 1000);

    // Solicitar permisos necesarios
    void this.requestPermissions();

    void this.loadAttendance();
  }

  /**
   * Solicita los permisos necesarios para el checkin (cámara y ubicación)
   * Nota: En localhost HTTP, algunos navegadores pueden requerir interacción del usuario
   */
  private async requestPermissions(): Promise<void> {
    // Solicitar permiso de ubicación (solo en HTTPS o producción)
    try {
      if (typeof navigator.geolocation !== 'undefined') {
        // Verificar si el permiso ya está concedido o denegado
        if (typeof navigator.permissions?.query !== 'undefined') {
          try {
            const geoPermission = await navigator.permissions.query({
              name: 'geolocation' as PermissionName,
            });

            if (geoPermission.state === 'prompt' || geoPermission.state === 'granted') {
              // Intentar obtener ubicación para activar el prompt o verificar que funciona
              await new Promise<void>((resolve) => {
                navigator.geolocation.getCurrentPosition(
                  () => {
                    resolve();
                  },
                  (error) => {
                    if (error.code === error.PERMISSION_DENIED) {
                      console.warn(
                        'Permiso de ubicación denegado. Se solicitará cuando hagas clic.',
                      );
                    } else {
                      console.warn('Error al obtener ubicación:', error);
                    }
                    // No rechazamos aquí, solo registramos el error
                    resolve();
                  },
                  { timeout: 5000, enableHighAccuracy: false },
                );
              });
            } else if (geoPermission.state === 'denied') {
              console.warn(
                'Permiso de ubicación previamente denegado. Ve a la configuración del navegador para permitirlo.',
              );
            }
          } catch (_permError) {
            // Si la API de permisos no está disponible, intentar directamente
            await this.requestGeolocationPermission().catch(() => {
              // Ignorar errores aquí, se solicitará cuando el usuario interactúe
            });
          }
        } else {
          // Si no está disponible permissions API, intentar directamente
          await this.requestGeolocationPermission().catch(() => {
            // Ignorar errores aquí, se solicitará cuando el usuario interactúe
          });
        }
      }
    } catch (error) {
      console.warn('Error al solicitar permiso de ubicación:', error);
    }

    // Solicitar permiso de cámara (solo en HTTPS o producción)
    try {
      if (typeof navigator.mediaDevices?.getUserMedia !== 'undefined') {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
          },
        });
        // Cerrar el stream inmediatamente, solo necesitamos el permiso
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch (error: unknown) {
      const err = error as { name?: string };
      if (err.name === 'NotAllowedError') {
        console.warn(
          'Permiso de cámara denegado o requiere interacción del usuario. Se solicitará cuando hagas clic.',
        );
      } else if (err.name === 'NotFoundError') {
        console.warn('Cámara no encontrada');
      } else {
        console.warn('Error al solicitar permiso de cámara:', error);
      }
      // En localhost HTTP, esto es normal, los permisos se solicitarán al hacer clic
    }
  }

  /**
   * Solicita permiso de geolocalización directamente
   */
  private async requestGeolocationPermission(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        () => {
          resolve();
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            console.warn('Permiso de ubicación denegado');
            reject(new Error('Permiso de ubicación denegado'));
          } else {
            console.warn('Error al obtener ubicación:', error);
            reject(error);
          }
        },
        { timeout: 5000, enableHighAccuracy: false },
      );
    });
  }

  ngOnDestroy(): void {
    // Limpiar el intervalo cuando el componente se destruya
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
  }

  async loadAttendance(): Promise<void> {
    const user = this.authPort.getCurrentUser();
    if (typeof user?.employeeId !== 'number') {
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
        user.employeeId,
      );

      this.attendance.set(attendance);
    } catch (err) {
      this.error.set('Error al cargar la asistencia');
      console.error(err);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Maneja el registro de check-in con cámara
   */
  async handleRegisterCheckIn(): Promise<void> {
    if (!this.canCheckIn()) return;

    const user = this.authPort.getCurrentUser();
    if (typeof user?.employeeId !== 'number') {
      this.error.set('No se encontró el ID del empleado');
      return;
    }

    // Solo ejecutar en el navegador
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      // Verificar y solicitar permisos antes de continuar
      await this.ensurePermissions();

      // Abrir cámara y capturar foto
      await this.capturePhoto();

      // Obtener ubicación
      const location = await this.getCurrentLocation();

      const success = await this.storeAssistUseCase.execute(
        user.employeeId,
        location.coords.latitude,
        location.coords.longitude,
        location.coords.accuracy ?? 0,
      );

      if (success) {
        // Recargar asistencia
        await this.loadAttendance();
      } else {
        this.error.set('Error al registrar el check-in');
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      const errorMessage = error.message ?? '';
      if (errorMessage.includes('ubicación')) {
        this.error.set('Se necesita permiso de ubicación para registrar asistencia');
      } else if (errorMessage.includes('cámara')) {
        this.error.set('Se necesita permiso de cámara para registrar asistencia');
      } else {
        this.error.set('Error al obtener la ubicación o registrar check-in');
      }
      console.error(err);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Asegura que los permisos necesarios estén concedidos
   * En localhost HTTP, los permisos se solicitan cuando el usuario hace clic
   */
  private async ensurePermissions(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Verificar si estamos en localhost HTTP
    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.protocol === 'http:';

    // Verificar estado del permiso de geolocalización antes de intentar
    let geoPermissionDenied = false;
    if (typeof navigator.permissions?.query !== 'undefined') {
      try {
        const geoPermission = await navigator.permissions.query({
          name: 'geolocation' as PermissionName,
        });
        if (geoPermission.state === 'denied') {
          geoPermissionDenied = true;
          console.warn(
            'Permiso de ubicación está denegado. El usuario debe habilitarlo en la configuración del navegador.',
          );
        }
      } catch (_e) {
        // Si no está disponible la API de permisos, continuamos
      }
    }

    // Verificar permiso de cámara
    try {
      if (typeof navigator.mediaDevices?.getUserMedia !== 'undefined') {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
          },
        });
        stream.getTracks().forEach((track) => track.stop());
      } else {
        throw new Error('Cámara no disponible');
      }
    } catch (error: unknown) {
      const err = error as { name?: string };
      if (err.name === 'NotAllowedError') {
        let message = 'Se necesita permiso de cámara para registrar asistencia.';
        if (isLocalhost) {
          message += ' Por favor, permite el acceso a la cámara cuando se solicite.';
        } else {
          message += ' Ve a la configuración del navegador para permitirlo.';
        }
        throw new Error(message);
      } else if (err.name === 'NotFoundError') {
        throw new Error('No se encontró ninguna cámara disponible');
      }
      throw new Error('Error al acceder a la cámara');
    }

    // Verificar permiso de geolocalización
    try {
      await new Promise<void>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          () => {
            resolve();
          },
          (error) => {
            if (error.code === error.PERMISSION_DENIED) {
              let message = 'Se necesita permiso de ubicación para registrar asistencia.';
              if (geoPermissionDenied) {
                message +=
                  ' El permiso está denegado. Ve a la configuración del navegador (ícono de candado en la barra de direcciones) para permitirlo.';
              } else if (isLocalhost) {
                message += ' Por favor, permite el acceso a la ubicación cuando se solicite.';
              } else {
                message += ' Ve a la configuración del navegador para permitirlo.';
              }
              reject(new Error(message));
            } else if (error.code === error.POSITION_UNAVAILABLE) {
              reject(new Error('No se pudo obtener la ubicación. Verifica tu conexión GPS.'));
            } else if (error.code === error.TIMEOUT) {
              reject(new Error('Tiempo de espera agotado al obtener la ubicación'));
            } else {
              reject(error);
            }
          },
          {
            timeout: 10000,
            enableHighAccuracy: false,
            maximumAge: 0,
          },
        );
      });
    } catch (error: unknown) {
      const err = error as { message?: string };
      const errorMessage = err.message ?? '';
      if (errorMessage.includes('ubicación')) {
        throw error;
      }
      throw new Error('Se necesita permiso de ubicación para registrar asistencia');
    }
  }

  async handleCheckIn(): Promise<void> {
    if (!this.canCheckIn()) return;

    const user = this.authPort.getCurrentUser();
    if (typeof user?.employeeId !== 'number') {
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
        location.coords.accuracy ?? 0,
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

  /**
   * Captura una foto usando la cámara del dispositivo
   */
  private async capturePhoto(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      if (typeof navigator.mediaDevices?.getUserMedia === 'undefined') {
        console.warn('La cámara no está disponible');
        return;
      }

      // Obtener acceso a la cámara
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user', // Cámara frontal
        },
      });

      // Crear un elemento de video temporal para mostrar la cámara
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;
      video.style.position = 'fixed';
      video.style.top = '0';
      video.style.left = '0';
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.objectFit = 'cover';
      video.style.zIndex = '9999';
      video.style.backgroundColor = '#000';
      document.body.appendChild(video);

      // Crear un botón para capturar
      const captureButton = document.createElement('button');
      captureButton.textContent = 'Capturar';
      captureButton.style.position = 'fixed';
      captureButton.style.bottom = '20px';
      captureButton.style.left = '50%';
      captureButton.style.transform = 'translateX(-50%)';
      captureButton.style.padding = '12px 24px';
      captureButton.style.backgroundColor = 'var(--primary)';
      captureButton.style.color = 'white';
      captureButton.style.border = 'none';
      captureButton.style.borderRadius = '8px';
      captureButton.style.fontSize = '16px';
      captureButton.style.fontWeight = 'bold';
      captureButton.style.zIndex = '10000';
      captureButton.style.cursor = 'pointer';
      document.body.appendChild(captureButton);

      // Crear un botón para cancelar
      const cancelButton = document.createElement('button');
      cancelButton.textContent = 'Cancelar';
      cancelButton.style.position = 'fixed';
      cancelButton.style.top = '20px';
      cancelButton.style.right = '20px';
      cancelButton.style.padding = '8px 16px';
      cancelButton.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
      cancelButton.style.color = '#000';
      cancelButton.style.border = 'none';
      cancelButton.style.borderRadius = '8px';
      cancelButton.style.fontSize = '14px';
      cancelButton.style.zIndex = '10000';
      cancelButton.style.cursor = 'pointer';
      document.body.appendChild(cancelButton);

      // Esperar a que el usuario capture o cancele
      return new Promise<void>((resolve, reject) => {
        const cleanup = (): void => {
          stream.getTracks().forEach((track) => track.stop());
          document.body.removeChild(video);
          document.body.removeChild(captureButton);
          document.body.removeChild(cancelButton);
        };

        captureButton.onclick = (): void => {
          // Crear canvas para capturar la foto
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0);
            // Aquí podrías enviar la foto al servidor si es necesario
            // Por ahora solo la capturamos
            canvas.toBlob(
              (_blob) => {
                // Aquí podrías guardar o enviar la foto
              },
              'image/jpeg',
              0.9,
            );
          }
          cleanup();
          resolve();
        };

        cancelButton.onclick = (): void => {
          cleanup();
          reject(new Error('Captura cancelada'));
        };
      });
    } catch (error: unknown) {
      const err = error as { name?: string };
      if (err.name === 'NotAllowedError') {
        console.warn('Permiso de cámara denegado');
        throw new Error('Se necesita permiso de cámara para registrar asistencia');
      } else if (err.name === 'NotFoundError') {
        console.warn('Cámara no encontrada');
        throw new Error('No se encontró ninguna cámara');
      } else {
        console.error('Error al acceder a la cámara:', error);
        throw error;
      }
    }
  }

  async handleCheckOut(): Promise<void> {
    if (!this.canCheckOut()) return;

    const user = this.authPort.getCurrentUser();
    if (typeof user?.employeeId !== 'number') {
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
        location.coords.accuracy ?? 0,
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
      if (!isPlatformBrowser(this.platformId)) {
        reject(new Error('Geolocalización no disponible en este entorno'));
        return;
      }

      if (typeof navigator.geolocation === 'undefined') {
        reject(new Error('Geolocalización no disponible en este navegador'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve(position);
        },
        (error) => {
          let errorMessage = 'Error al obtener la ubicación';

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage =
                'Permiso de ubicación denegado. Por favor, permite el acceso a la ubicación en la configuración del navegador.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Información de ubicación no disponible';
              break;
            case error.TIMEOUT:
              errorMessage = 'Tiempo de espera agotado al obtener la ubicación';
              break;
            default:
              errorMessage = 'Error desconocido al obtener la ubicación';
              break;
          }

          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        },
      );
    });
  }

  previousDay(): void {
    const date = new Date(this.selectedDate());
    date.setDate(date.getDate() - 1);
    this.selectedDate.set(date);
    void this.loadAttendance();
  }

  nextDay(): void {
    if (!this.canNavigateForward()) return;
    const date = new Date(this.selectedDate());
    date.setDate(date.getDate() + 1);
    this.selectedDate.set(date);
    void this.loadAttendance();
  }

  /**
   * Navega un mes hacia atrás
   */
  previousMonth(): void {
    const date = new Date(this.selectedDate());
    date.setMonth(date.getMonth() - 1);
    this.selectedDate.set(date);
    void this.loadAttendance();
  }

  /**
   * Navega un mes hacia adelante (solo si no es futuro)
   */
  nextMonth(): void {
    if (!this.canNavigateForward()) return;
    const date = new Date(this.selectedDate());
    date.setMonth(date.getMonth() + 1);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Si la fecha resultante es mayor o igual a hoy, usar hoy
    if (date >= today) {
      this.selectedDate.set(new Date(today));
    } else {
      this.selectedDate.set(date);
    }
    void this.loadAttendance();
  }

  /**
   * Obtiene el nombre del status para aplicar clases CSS
   * Maneja: ONTIME (verde), delay/late (amarillo), fault (rojo), null (sin color)
   */
  getStatusClass(status: string | null | undefined): string {
    if (status === null || status === undefined || status.trim() === '') return '';
    const normalizedStatus = status.toLowerCase().trim();

    // ONTIME o variaciones
    if (
      normalizedStatus === 'ontime' ||
      normalizedStatus === 'on-time' ||
      normalizedStatus === 'on time' ||
      normalizedStatus === 'on_time'
    ) {
      return 'status-ontime';
    }

    // DELAY o variaciones (amarillo)
    if (
      normalizedStatus === 'delay' ||
      normalizedStatus === 'late' ||
      normalizedStatus === 'retraso'
    ) {
      return 'status-delay';
    }

    // FAULT (rojo)
    if (normalizedStatus === 'fault' || normalizedStatus === 'falta') {
      return 'status-fault';
    }

    return '';
  }

  /**
   * Obtiene el color del icono según el status
   * ONTIME: verde, delay: amarillo, fault: rojo, null: color por defecto
   */
  getStatusColor(
    status: string | null | undefined,
    defaultColor = 'var(--text-secondary)',
  ): string {
    if (status === null || status === undefined || status.trim() === '') return defaultColor;
    const normalizedStatus = status.toLowerCase().trim();

    // ONTIME o variaciones (verde)
    if (
      normalizedStatus === 'ontime' ||
      normalizedStatus === 'on-time' ||
      normalizedStatus === 'on time' ||
      normalizedStatus === 'on_time'
    ) {
      return 'var(--success)';
    }

    // DELAY o variaciones (amarillo)
    if (
      normalizedStatus === 'delay' ||
      normalizedStatus === 'late' ||
      normalizedStatus === 'retraso'
    ) {
      return 'var(--warning)';
    }

    // FAULT (rojo)
    if (normalizedStatus === 'fault' || normalizedStatus === 'falta') {
      return 'var(--danger)';
    }

    return defaultColor;
  }

  /**
   * Abre el datepicker para seleccionar una fecha
   */
  openDatePicker(): void {
    const date = this.selectedDate();
    this.datePickerValue = date.toISOString().split('T')[0];
    this.showDatePicker = true;
  }

  /**
   * Maneja la selección de fecha del datepicker
   */
  onDateSelect(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target?.value) {
      const selectedDate = new Date(target.value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);

      // Solo permitir fechas menores a hoy
      if (selectedDate < today) {
        this.selectedDate.set(selectedDate);
        void this.loadAttendance();
      }
    }
    this.showDatePicker = false;
  }

  /**
   * Abre el diálogo de excepciones
   */
  openExceptionsDialog(): void {
    this.showExceptionsDialog = true;
  }

  /**
   * Cierra el diálogo de excepciones
   */
  closeExceptionsDialog(): void {
    this.showExceptionsDialog = false;
  }

  /**
   * Obtiene las excepciones del attendance actual
   */
  getExceptions(): Exception[] {
    return this.attendance()?.exceptions ?? [];
  }

  /**
   * Formatea la fecha de la excepción
   */
  formatExceptionDate(dateString: string): string {
    const date = new Date(dateString);
    const currentLang = this.translateService.currentLang || 'es';
    const locale = currentLang === 'en' ? 'en-US' : 'es-MX';
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Abre el diálogo de registros
   */
  openRecordsDialog(): void {
    this.showRecordsDialog = true;
  }

  /**
   * Cierra el diálogo de registros
   */
  closeRecordsDialog(): void {
    this.showRecordsDialog = false;
  }

  /**
   * Obtiene los registros de asistencia del attendance actual
   */
  getRecords(): Assistance[] {
    return this.attendance()?.assistFlatList ?? [];
  }

  /**
   * Formatea la fecha y hora del registro
   */
  formatRecordDateTime(dateString: string): string {
    const date = new Date(dateString);
    const currentLang = this.translateService.currentLang || 'es';
    const locale = currentLang === 'en' ? 'en-US' : 'es-MX';

    const dateStr = date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const timeStr = date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    return `${dateStr} ${timeStr}`;
  }

  /**
   * Formatea solo la hora del registro
   */
  formatRecordTime(dateString: string): string {
    const date = new Date(dateString);
    const currentLang = this.translateService.currentLang || 'es';
    const locale = currentLang === 'en' ? 'en-US' : 'es-MX';

    return date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }
}
