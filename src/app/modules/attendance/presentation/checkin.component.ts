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
import { IAuthPort } from '@modules/auth/domain/auth.port';
import { IAttendance, IException, IAssistance } from '../domain/attendance.port';
import { trigger, transition, style, animate } from '@angular/animations';
import { CheckInIconComponent } from '@shared/components/icons/check-in-icon/check-in-icon.component';
import { CheckOutIconComponent } from '@shared/components/icons/check-out-icon/check-out-icon.component';
import { EatInIconComponent } from '@shared/components/icons/eat-in-icon/eat-in-icon.component';
import { EatOutIconComponent } from '@shared/components/icons/eat-out-icon/eat-out-icon.component';
import { LoggerService } from '@core/services/logger.service';
import { GetEmployeeBiometricFaceIdUseCase } from '../application/get-employee-biometric-face-id.use-case';
import { SecureStorageService } from '@core/services/secure-storage.service';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - face-api.js no tiene tipos TypeScript oficiales
import * as faceapi from 'face-api.js';

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
  private readonly getEmployeeBiometricFaceIdUseCase = inject(GetEmployeeBiometricFaceIdUseCase);
  private readonly storeAssistUseCase = inject(StoreAssistUseCase);
  private readonly authPort = inject<IAuthPort>(AUTH_PORT);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly translateService = inject(TranslateService);
  private readonly logger = inject(LoggerService);
  private readonly secureStorage = inject(SecureStorageService);
  private timeInterval?: ReturnType<typeof setInterval>;

  // Clave para almacenar la foto del rostro del empleado en base64
  private readonly EMPLOYEE_BIOMETRIC_FACE_ID_PHOTO_KEY = 'employee_biometric_face_id_photo_base64';

  // Estado de carga de modelos de face-api.js
  private faceApiModelsLoaded = false;
  // Los modelos se sirven desde la carpeta public/assets/face-api-models => /assets/face-api-models
  private readonly FACE_API_MODELS_URL = '/assets/face-api-models';
  private readonly FACE_MATCH_THRESHOLD = 0.6; // Umbral de similitud (0-1, mayor = más estricto)
  private readonly LIVENESS_MOVEMENT_THRESHOLD = 0.02; // Umbral mínimo de movimiento entre frames (0-1)
  private readonly LIVENESS_FRAMES_TO_CHECK = 3; // Número de frames a analizar para detectar movimiento

  readonly attendance = signal<IAttendance | null>(null);
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
    return (
      (att?.checkInTime === null ||
        att?.checkEatInTime === null ||
        att?.checkOutTime === null ||
        att?.checkEatOutTime === null) &&
      !this.loading()
    );
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
                      this.logger.warn(
                        'Permiso de ubicación denegado. Se solicitará cuando hagas clic.',
                      );
                    } else {
                      this.logger.warn('Error al obtener ubicación:', error);
                    }
                    // No rechazamos aquí, solo registramos el error
                    resolve();
                  },
                  { timeout: 5000, enableHighAccuracy: false },
                );
              });
            } else if (geoPermission.state === 'denied') {
              this.logger.warn(
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
      this.logger.warn('Error al solicitar permiso de ubicación:', error);
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
        this.logger.warn(
          'Permiso de cámara denegado o requiere interacción del usuario. Se solicitará cuando hagas clic.',
        );
      } else if (err.name === 'NotFoundError') {
        this.logger.warn('Cámara no encontrada');
      } else {
        this.logger.warn('Error al solicitar permiso de cámara:', error);
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
            this.logger.warn('Permiso de ubicación denegado');
            reject(new Error('Permiso de ubicación denegado'));
          } else {
            this.logger.warn('Error al obtener ubicación:', error);
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
      this.logger.error('Error al cargar la asistencia:', err);
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
    const employeeBiometricFaceId = await this.getEmployeeBiometricFaceIdUseCase.execute(
      user.employeeId,
    );
    if (!employeeBiometricFaceId) {
      this.error.set('No se encontró la fotografía del rostro del empleado');
      return;
    }
    const employeeBiometricFaceIdPhotoUrl = employeeBiometricFaceId.employeeBiometricFaceIdPhotoUrl;

    // Guardar la foto en base64 de forma segura
    if (employeeBiometricFaceIdPhotoUrl) {
      try {
        await this.savePhotoAsBase64(employeeBiometricFaceIdPhotoUrl);
      } catch (error) {
        this.logger.warn('Error al guardar la foto en base64:', error);
        // Continuar con el proceso aunque falle el guardado
      }
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      // Verificar y solicitar permisos antes de continuar
      await this.ensurePermissions();

      // Cargar modelos de face-api.js si no están cargados
      try {
        await this.loadFaceApiModels();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Error desconocido al cargar modelos';
        if (errorMessage.includes('reconocimiento facial')) {
          this.error.set(
            'Error al cargar los modelos de reconocimiento facial. Por favor, verifica que los modelos estén descargados correctamente.',
          );
        } else {
          this.error.set(`Error: ${errorMessage}`);
        }
        this.loading.set(false);
        return;
      }

      // Obtener la foto guardada del empleado
      const storedPhotoBase64 = this.getStoredPhotoBase64();
      if (!storedPhotoBase64) {
        this.error.set('No se encontró la fotografía del empleado guardada');
        this.loading.set(false);
        return;
      }

      // Abrir cámara y capturar foto con verificación de liveness
      let capturedPhotoBase64: string;
      try {
        capturedPhotoBase64 = await this.capturePhotoWithLiveness();
      } catch (livenessError) {
        const livenessErrorMessage =
          livenessError instanceof Error ? livenessError.message : 'Error desconocido';
        this.logger.error('Error en verificación de liveness:', livenessError);

        // Si el error es de liveness (movimiento insuficiente), mostrar mensaje específico
        if (
          livenessErrorMessage.includes('movimiento') ||
          livenessErrorMessage.includes('liveness') ||
          livenessErrorMessage.includes('persona real')
        ) {
          this.error.set(livenessErrorMessage);
        } else if (
          livenessErrorMessage.includes('cámara') ||
          livenessErrorMessage.includes('camera')
        ) {
          this.error.set('Se necesita permiso de cámara para registrar asistencia');
        } else if (livenessErrorMessage.includes('Captura cancelada')) {
          this.error.set('Captura cancelada por el usuario');
        } else {
          this.error.set(`Error al capturar la fotografía: ${livenessErrorMessage}`);
        }
        this.loading.set(false);
        return;
      }

      // Comparar las fotografías usando face-api.js
      const isMatch = await this.compareFaces(storedPhotoBase64, capturedPhotoBase64);
      if (!isMatch) {
        this.error.set('La fotografía capturada no coincide con la del empleado registrado');
        this.loading.set(false);
        return;
      }

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
      this.logger.error('Error en handleRegisterCheckIn:', err);

      if (errorMessage.includes('ubicación') || errorMessage.includes('ubicacion')) {
        this.error.set('Se necesita permiso de ubicación para registrar asistencia');
      } else if (errorMessage.includes('cámara') || errorMessage.includes('camera')) {
        this.error.set('Se necesita permiso de cámara para registrar asistencia');
      } else if (errorMessage.includes('movimiento') || errorMessage.includes('liveness')) {
        // Error de liveness ya fue manejado arriba, pero por si acaso
        this.error.set(errorMessage);
      } else {
        this.error.set(`Error al registrar check-in: ${errorMessage || 'Error desconocido'}`);
      }
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
          this.logger.warn(
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
      this.logger.error('Error en handleCheckIn:', err);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Captura una foto usando la cámara del dispositivo con verificación de liveness
   * Analiza múltiples frames para detectar movimiento y verificar que es una persona real
   * @returns Promesa con la imagen capturada en formato base64
   * @throws Error si no se detecta liveness (movimiento)
   */
  private async capturePhotoWithLiveness(): Promise<string> {
    if (!isPlatformBrowser(this.platformId)) {
      throw new Error('La captura de foto solo está disponible en el navegador');
    }

    try {
      if (typeof navigator.mediaDevices?.getUserMedia === 'undefined') {
        throw new Error('La cámara no está disponible en este navegador');
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

      // Esperar a que el video esté listo
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = (): void => {
          resolve();
        };
      });

      // Crear mensaje de instrucción para el usuario
      const instructionMessage = document.createElement('div');
      instructionMessage.textContent =
        'Por favor, mueve ligeramente la cabeza o parpadea mientras verificamos que eres una persona real...';
      instructionMessage.style.position = 'fixed';
      instructionMessage.style.top = '50%';
      instructionMessage.style.left = '50%';
      instructionMessage.style.transform = 'translate(-50%, -50%)';
      instructionMessage.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      instructionMessage.style.color = 'white';
      instructionMessage.style.padding = '20px 30px';
      instructionMessage.style.borderRadius = '12px';
      instructionMessage.style.fontSize = '16px';
      instructionMessage.style.textAlign = 'center';
      instructionMessage.style.zIndex = '10001';
      instructionMessage.style.maxWidth = '80%';
      instructionMessage.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.5)';
      document.body.appendChild(instructionMessage);

      // Esperar un momento antes de comenzar la captura para que el usuario vea el mensaje
      await new Promise<void>((resolve) => setTimeout(resolve, 1000));

      // Capturar múltiples frames para análisis de liveness
      const frames: string[] = [];
      const frameInterval = 500; // 500ms entre frames (más tiempo para movimiento natural)
      const numberOfFrames = 4; // Capturar 4 frames (más frames = mejor detección)

      for (let i = 0; i < numberOfFrames; i++) {
        await new Promise<void>((resolve) => setTimeout(resolve, frameInterval));
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          const base64 = canvas.toDataURL('image/jpeg', 0.9);
          frames.push(base64);
        }
      }

      // Actualizar mensaje mientras se verifica
      instructionMessage.textContent = 'Verificando movimiento...';

      // Verificar liveness analizando movimiento entre frames
      const isLive = await this.detectLivenessFromFrames(frames);

      // Remover mensaje de instrucción
      document.body.removeChild(instructionMessage);

      if (!isLive) {
        stream.getTracks().forEach((track) => track.stop());
        document.body.removeChild(video);
        throw new Error(
          'No se detectó movimiento suficiente. Por favor, mueve ligeramente la cabeza o parpadea para verificar que eres una persona real.',
        );
      }

      // Crear un botón para capturar la foto final
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
      return new Promise<string>((resolve, reject) => {
        const cleanup = (): void => {
          stream.getTracks().forEach((track) => track.stop());
          document.body.removeChild(video);
          document.body.removeChild(captureButton);
          document.body.removeChild(cancelButton);
        };

        captureButton.onclick = (): void => {
          // Crear canvas para capturar la foto final
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0);
            // Convertir canvas a base64
            const base64 = canvas.toDataURL('image/jpeg', 0.9);
            cleanup();
            resolve(base64);
          } else {
            cleanup();
            reject(new Error('No se pudo obtener el contexto del canvas'));
          }
        };

        cancelButton.onclick = (): void => {
          cleanup();
          reject(new Error('Captura cancelada'));
        };
      });
    } catch (error: unknown) {
      const err = error as { name?: string; message?: string };
      if (err.name === 'NotAllowedError') {
        this.logger.warn('Permiso de cámara denegado');
        throw new Error('Se necesita permiso de cámara para registrar asistencia');
      } else if (err.name === 'NotFoundError') {
        this.logger.warn('Cámara no encontrada');
        throw new Error('No se encontró ninguna cámara');
      } else if (err.message?.includes('movimiento')) {
        // Re-lanzar el error de liveness con el mensaje original
        throw error;
      } else {
        this.logger.error('Error al acceder a la cámara:', error);
        throw error;
      }
    }
  }

  /**
   * Captura una foto usando la cámara del dispositivo
   * @returns Promesa con la imagen capturada en formato base64
   */
  private async capturePhoto(): Promise<string> {
    if (!isPlatformBrowser(this.platformId)) {
      throw new Error('La captura de foto solo está disponible en el navegador');
    }

    try {
      if (typeof navigator.mediaDevices?.getUserMedia === 'undefined') {
        throw new Error('La cámara no está disponible en este navegador');
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
      return new Promise<string>((resolve, reject) => {
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
            // Convertir canvas a base64
            const base64 = canvas.toDataURL('image/jpeg', 0.9);
            cleanup();
            resolve(base64);
          } else {
            cleanup();
            reject(new Error('No se pudo obtener el contexto del canvas'));
          }
        };

        cancelButton.onclick = (): void => {
          cleanup();
          reject(new Error('Captura cancelada'));
        };
      });
    } catch (error: unknown) {
      const err = error as { name?: string };
      if (err.name === 'NotAllowedError') {
        this.logger.warn('Permiso de cámara denegado');
        throw new Error('Se necesita permiso de cámara para registrar asistencia');
      } else if (err.name === 'NotFoundError') {
        this.logger.warn('Cámara no encontrada');
        throw new Error('No se encontró ninguna cámara');
      } else {
        this.logger.error('Error al acceder a la cámara:', error);
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
      this.logger.error('Error en handleCheckOut:', err);
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
  getExceptions(): IException[] {
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
  getRecords(): IAssistance[] {
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

  /**
   * Convierte una URL de imagen a base64 y la guarda de forma segura
   * @param imageUrl - URL de la imagen a convertir
   * @returns Promesa que se resuelve cuando la imagen se ha guardado
   */
  private async savePhotoAsBase64(imageUrl: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      // Convertir la URL a base64
      const base64Image = await this.urlToBase64(imageUrl);

      // Guardar en almacenamiento seguro
      this.secureStorage.setEncryptedItem(this.EMPLOYEE_BIOMETRIC_FACE_ID_PHOTO_KEY, base64Image);
    } catch (error) {
      this.logger.error('Error al convertir y guardar la imagen en base64:', error);
      throw error;
    }
  }

  /**
   * Convierte una URL de imagen a base64 usando fetch
   * Intenta cargar la imagen directamente sin proxy para evitar restricciones de dominio
   * @param url - URL de la imagen
   * @returns Promesa con la imagen en formato base64
   */
  private async urlToBase64(url: string): Promise<string> {
    if (!isPlatformBrowser(this.platformId)) {
      throw new Error('No disponible en este entorno');
    }

    try {
      // Intentar cargar la imagen directamente usando fetch
      const response = await fetch(url, {
        mode: 'cors',
        credentials: 'omit',
      });

      if (!response.ok) {
        throw new Error(`Error al cargar la imagen: ${response.status} ${response.statusText}`);
      }

      // Convertir la respuesta a blob
      const blob = await response.blob();

      // Convertir blob a base64
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = (): void => {
          const base64String = reader.result as string;
          resolve(base64String);
        };
        reader.onerror = (): void => {
          reject(new Error('Error al convertir la imagen a base64'));
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      this.logger.error('Error al cargar imagen con fetch, intentando método alternativo:', error);
      // Si falla con fetch (por ejemplo, por CORS), intentar con Image + canvas
      return this.urlToBase64WithImage(url);
    }
  }

  /**
   * Método alternativo: Convierte una URL de imagen a base64 usando Image y canvas
   * Se usa como fallback si fetch falla por problemas de CORS
   * @param url - URL de la imagen
   * @returns Promesa con la imagen en formato base64
   */
  private urlToBase64WithImage(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = (): void => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('No se pudo obtener el contexto del canvas'));
            return;
          }

          ctx.drawImage(img, 0, 0);
          const base64 = canvas.toDataURL('image/jpeg', 0.9);
          resolve(base64);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = (): void => {
        reject(new Error('Error al cargar la imagen con el método alternativo'));
      };

      img.src = url;
    });
  }

  /**
   * Obtiene la foto del rostro del empleado guardada en base64
   * @returns La imagen en formato base64 o null si no existe
   */
  getStoredPhotoBase64(): string | null {
    return this.secureStorage.getEncryptedItem(this.EMPLOYEE_BIOMETRIC_FACE_ID_PHOTO_KEY);
  }

  /**
   * Elimina la foto del rostro del empleado guardada
   */
  removeStoredPhoto(): void {
    this.secureStorage.removeEncryptedItem(this.EMPLOYEE_BIOMETRIC_FACE_ID_PHOTO_KEY);
  }

  /**
   * Carga los modelos de face-api.js necesarios para el reconocimiento facial
   * Los modelos deben estar en la carpeta public/assets/face-api-models/
   */
  private async loadFaceApiModels(): Promise<void> {
    if (this.faceApiModelsLoaded) {
      return;
    }

    if (!isPlatformBrowser(this.platformId)) {
      throw new Error('Los modelos de face-api.js solo están disponibles en el navegador');
    }

    try {
      // Cargar los modelos uno por uno para identificar cuál falla
      this.logger.info(`Cargando modelos de face-api.js desde: ${this.FACE_API_MODELS_URL}`);

      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(this.FACE_API_MODELS_URL);
        this.logger.info('Modelo tinyFaceDetector cargado correctamente');
      } catch (error) {
        this.logger.error('Error al cargar tinyFaceDetector:', error);
        throw new Error(
          `Error al cargar el modelo tinyFaceDetector. Verifica que los archivos estén en ${this.FACE_API_MODELS_URL}`,
        );
      }

      try {
        await faceapi.nets.faceLandmark68Net.loadFromUri(this.FACE_API_MODELS_URL);
        this.logger.info('Modelo faceLandmark68Net cargado correctamente');
      } catch (error) {
        this.logger.error('Error al cargar faceLandmark68Net:', error);
        throw new Error(
          `Error al cargar el modelo faceLandmark68Net. Verifica que los archivos estén en ${this.FACE_API_MODELS_URL}`,
        );
      }

      try {
        await faceapi.nets.faceRecognitionNet.loadFromUri(this.FACE_API_MODELS_URL);
        this.logger.info('Modelo faceRecognitionNet cargado correctamente');
      } catch (error) {
        this.logger.error('Error al cargar faceRecognitionNet:', error);
        throw new Error(
          `Error al cargar el modelo faceRecognitionNet. Verifica que los archivos estén en ${this.FACE_API_MODELS_URL}`,
        );
      }

      this.faceApiModelsLoaded = true;
      this.logger.info('Todos los modelos de face-api.js cargados correctamente');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido al cargar los modelos';
      this.logger.error('Error al cargar los modelos de face-api.js:', error);
      throw new Error(
        `Error al cargar los modelos de reconocimiento facial: ${errorMessage}. Asegúrate de que los modelos estén descargados en ${this.FACE_API_MODELS_URL}`,
      );
    }
  }

  /**
   * Compara dos imágenes para verificar si contienen el mismo rostro
   * @param storedPhotoBase64 - Foto guardada del empleado en base64
   * @param capturedPhotoBase64 - Foto capturada en base64
   * @returns true si las fotos coinciden, false en caso contrario
   */
  private async compareFaces(
    storedPhotoBase64: string,
    capturedPhotoBase64: string,
  ): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) {
      throw new Error('La comparación facial solo está disponible en el navegador');
    }

    try {
      // Crear elementos de imagen para ambas fotos
      const storedImg = await this.base64ToImage(storedPhotoBase64);
      const capturedImg = await this.base64ToImage(capturedPhotoBase64);

      // Detectar y obtener descriptores faciales de ambas imágenes
      const storedDescriptor = await this.getFaceDescriptor(storedImg);
      const capturedDescriptor = await this.getFaceDescriptor(capturedImg);

      // Si no se detectó un rostro en alguna de las imágenes, retornar false
      if (!storedDescriptor || !capturedDescriptor) {
        this.logger.warn('No se detectó un rostro en una o ambas imágenes');
        return false;
      }

      // Calcular la distancia euclidiana entre los descriptores
      const distance = faceapi.euclideanDistance(storedDescriptor, capturedDescriptor);

      // Comparar con el umbral (distancia menor = más similar)
      // Convertir distancia a similitud (0-1, donde 1 es idéntico)
      const similarity = 1 - Math.min(distance, 1);
      const isMatch = similarity >= this.FACE_MATCH_THRESHOLD;

      this.logger.info(
        `Comparación facial: distancia=${distance.toFixed(3)}, similitud=${similarity.toFixed(3)}, coincide=${isMatch}`,
      );

      return isMatch;
    } catch (error) {
      this.logger.error('Error al comparar las fotografías:', error);
      throw new Error('Error al comparar las fotografías faciales');
    }
  }

  /**
   * Convierte una imagen en base64 a un elemento HTMLImageElement
   * @param base64 - Imagen en formato base64
   * @returns Promesa con el elemento de imagen
   */
  private base64ToImage(base64: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = (): void => {
        resolve(img);
      };
      img.onerror = (): void => {
        reject(new Error('Error al cargar la imagen desde base64'));
      };
      img.src = base64;
    });
  }

  /**
   * Obtiene el descriptor facial de una imagen usando face-api.js
   * @param img - Elemento de imagen HTML
   * @returns Promesa con el descriptor facial o null si no se detecta un rostro
   */
  private async getFaceDescriptor(img: HTMLImageElement): Promise<Float32Array | null> {
    try {
      // Detectar el rostro con landmarks
      const detection = await faceapi
        .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        return null;
      }

      return detection.descriptor;
    } catch (error) {
      this.logger.error('Error al obtener el descriptor facial:', error);
      return null;
    }
  }

  /**
   * Detecta liveness analizando movimiento entre múltiples frames del video
   * Esta es la forma más efectiva de detectar si es una persona real vs una foto/pantalla
   *
   * @param frames - Array de frames capturados en base64
   * @returns true si se detecta movimiento suficiente (persona real), false si parece ser estático (foto/pantalla)
   */
  private async detectLivenessFromFrames(frames: string[]): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) {
      return true; // En SSR, asumir que es válido
    }

    if (frames.length < 2) {
      this.logger.warn('No hay suficientes frames para analizar liveness');
      return false;
    }

    try {
      // Convertir todos los frames a imágenes
      const images = await Promise.all(frames.map((frame) => this.base64ToImage(frame)));

      // Verificar que todos los frames tengan un rostro detectado
      const faceDetections = await Promise.all(
        images.map((img) =>
          faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks(),
        ),
      );

      // Si algún frame no tiene rostro, rechazar
      if (faceDetections.some((detection) => !detection)) {
        this.logger.warn('No se detectó rostro en todos los frames');
        return false;
      }

      // Analizar movimiento comparando la posición del rostro entre frames
      const facePositions: { x: number; y: number; width: number; height: number }[] = [];
      for (const detection of faceDetections) {
        if (detection) {
          const box = detection.detection.box;
          facePositions.push({
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
          });
        }
      }

      // Calcular variación en la posición del rostro entre frames
      const movements: number[] = [];
      const movementDirections: { dx: number; dy: number }[] = [];

      for (let i = 1; i < facePositions.length; i++) {
        const prev = facePositions[i - 1];
        const curr = facePositions[i];

        // Calcular distancia euclidiana entre centros del rostro
        const centerX1 = prev.x + prev.width / 2;
        const centerY1 = prev.y + prev.height / 2;
        const centerX2 = curr.x + curr.width / 2;
        const centerY2 = curr.y + curr.height / 2;

        const dx = centerX2 - centerX1;
        const dy = centerY2 - centerY1;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Normalizar por el tamaño promedio del rostro
        const avgFaceSize = (prev.width + curr.width) / 2;
        const normalizedMovement = distance / avgFaceSize;
        movements.push(normalizedMovement);
        movementDirections.push({ dx, dy });
      }

      const averageMovement = movements.reduce((a, b) => a + b, 0) / movements.length;

      // Analizar consistencia del movimiento (movimiento real tiene dirección, ruido es aleatorio)
      let consistentDirection = 0;
      if (movementDirections.length >= 2) {
        // Calcular si los movimientos tienen dirección similar
        for (let i = 1; i < movementDirections.length; i++) {
          const prev = movementDirections[i - 1];
          const curr = movementDirections[i];

          // Calcular producto punto normalizado (coseno del ángulo)
          const prevMagnitude = Math.sqrt(prev.dx * prev.dx + prev.dy * prev.dy);
          const currMagnitude = Math.sqrt(curr.dx * curr.dx + curr.dy * curr.dy);

          if (prevMagnitude > 0 && currMagnitude > 0) {
            const dotProduct =
              (prev.dx * curr.dx + prev.dy * curr.dy) / (prevMagnitude * currMagnitude);
            // Si el coseno es > 0.5, los movimientos van en dirección similar
            if (dotProduct > 0.5) {
              consistentDirection++;
            }
          }
        }
      }

      const consistencyRatio =
        movementDirections.length > 1 ? consistentDirection / (movementDirections.length - 1) : 0;

      // Analizar variación en landmarks (expresiones faciales, parpadeos)
      let landmarkVariation = 0;
      if (faceDetections.every((d) => d && d.landmarks)) {
        for (let i = 1; i < faceDetections.length; i++) {
          const prev = faceDetections[i - 1];
          const curr = faceDetections[i];

          if (prev && curr && prev.landmarks && curr.landmarks) {
            const prevPositions = prev.landmarks.positions;
            const currPositions = curr.landmarks.positions;

            if (prevPositions.length === currPositions.length) {
              let totalLandmarkDistance = 0;
              for (let j = 0; j < prevPositions.length; j++) {
                const dx = currPositions[j].x - prevPositions[j].x;
                const dy = currPositions[j].y - prevPositions[j].y;
                totalLandmarkDistance += Math.sqrt(dx * dx + dy * dy);
              }
              const avgLandmarkDistance = totalLandmarkDistance / prevPositions.length;
              // Normalizar por el tamaño del rostro
              const box = prev.detection.box;
              const faceSize = Math.sqrt(box.width * box.height);
              landmarkVariation += avgLandmarkDistance / faceSize;
            }
          }
        }
        landmarkVariation = landmarkVariation / (faceDetections.length - 1);
      }

      // También analizar variación en el tamaño del rostro (zoom in/out, acercarse/alejarse)
      let sizeVariation = 0;
      for (let i = 1; i < facePositions.length; i++) {
        const prev = facePositions[i - 1];
        const curr = facePositions[i];
        const prevArea = prev.width * prev.height;
        const currArea = curr.width * curr.height;
        const areaDiff = Math.abs(currArea - prevArea) / prevArea;
        sizeVariation += areaDiff;
      }

      const averageSizeVariation = sizeVariation / (facePositions.length - 1);

      // Análisis adicional: Detectar si el movimiento es demasiado uniforme (foto movida)
      // vs movimiento orgánico (persona real)
      let movementVariance = 0;
      if (movements.length > 1) {
        const mean = movements.reduce((a, b) => a + b, 0) / movements.length;
        const variance =
          movements.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / movements.length;
        movementVariance = Math.sqrt(variance); // Desviación estándar
      }

      // Análisis de suavidad del movimiento
      // Movimientos de foto son más rígidos y uniformes, movimientos naturales son más variables
      const movementCoefficient =
        movements.length > 0 && averageMovement > 0 ? movementVariance / averageMovement : 0;

      // Verificar que la variación de landmarks no sea demasiado alta
      // Fotos movidas pueden tener variación muy alta en landmarks (> 20%)
      // Personas reales tienen variación más moderada (0.5% - 18%)
      const hasNaturalLandmarkVariation = landmarkVariation > 0.005 && landmarkVariation < 0.18;

      // Verificar que el movimiento no sea excesivo (fotos movidas suelen tener movimientos muy grandes > 20%)
      // Movimiento natural de cabeza/parpadeos es moderado (2-18%)
      const hasReasonableMovement = averageMovement > 0.02 && averageMovement < 0.18;

      // Verificar que la variación de tamaño no sea excesiva (fotos movidas tienen variación muy alta > 25%)
      const hasReasonableSizeVariation = averageSizeVariation < 0.25;

      // El coeficiente de variación es clave: valores altos (> 0.3) indican movimiento orgánico
      // Si el coeficiente es alto, podemos ser más permisivos con otros factores
      const hasHighOrganicMovement = movementCoefficient > 0.3;

      // Criterios de liveness balanceados:
      // Si el movimiento es muy orgánico (coeficiente alto), podemos ser más permisivos
      // Si el movimiento es menos orgánico, necesitamos que todos los criterios se cumplan estrictamente
      let hasSignificantMovement: boolean;
      let hasNaturalMovement: boolean;

      if (hasHighOrganicMovement) {
        // Movimiento muy orgánico: ser más permisivo pero aún rechazar extremos
        // Rechazar movimientos extremadamente grandes (> 25%)
        hasSignificantMovement =
          (hasReasonableMovement || averageSizeVariation < 0.3) && averageMovement < 0.25;
        // Menos estricto con consistencia, rechazar consistencia perfecta
        hasNaturalMovement =
          (hasNaturalLandmarkVariation || landmarkVariation < 0.25) &&
          consistencyRatio >= 0.15 &&
          consistencyRatio < 0.95;
      } else {
        // Movimiento menos orgánico: ser más estricto
        hasSignificantMovement = hasReasonableMovement && hasReasonableSizeVariation;
        hasNaturalMovement =
          hasNaturalLandmarkVariation &&
          movementCoefficient > 0.15 && // Requerir al menos algo de variación
          consistencyRatio >= 0.2 &&
          consistencyRatio < 0.9;
      }

      const hasMovement = hasSignificantMovement && hasNaturalMovement;

      this.logger.info(
        `Liveness check: averageMovement=${averageMovement.toFixed(4)}, averageSizeVariation=${averageSizeVariation.toFixed(4)}, consistencyRatio=${consistencyRatio.toFixed(4)}, landmarkVariation=${landmarkVariation.toFixed(4)}, movementCoefficient=${movementCoefficient.toFixed(4)}, isLive=${hasMovement}`,
      );

      if (!hasMovement) {
        this.logger.warn(
          `Liveness falló: movimiento insuficiente, inconsistente o no natural. hasSignificantMovement=${hasSignificantMovement}, hasNaturalMovement=${hasNaturalMovement}, movementCoefficient=${movementCoefficient.toFixed(4)}. Esto sugiere que podría ser una foto estática o movida artificialmente.`,
        );
      }

      return hasMovement;
    } catch (error) {
      this.logger.error('Error en detección de liveness desde frames:', error);
      // En caso de error, ser permisivo para no bloquear usuarios legítimos
      return true;
    }
  }
}
