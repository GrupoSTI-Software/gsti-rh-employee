/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-ignore - face-api.js no tiene tipos TypeScript oficiales
import {
  Component,
  inject,
  signal,
  OnInit,
  OnDestroy,
  computed,
  PLATFORM_ID,
  DestroyRef,
  ViewChild,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { TranslateService } from '@ngx-translate/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { GetAttendanceUseCase } from '../application/get-attendance.use-case';
import { StoreAssistUseCase } from '../application/store-assist.use-case';
import { AUTH_PORT } from '@modules/auth/domain/auth.token';
import { IAuthPort } from '@modules/auth/domain/auth.port';
import { IAttendance, IException, IAssistance } from '../domain/attendance.port';
import { trigger, transition, style, animate } from '@angular/animations';
import { LoggerService } from '@core/services/logger.service';
import { TooltipModule } from 'primeng/tooltip';
import { WeekCalendarComponent } from '@shared/components/week-calendar/week-calendar.component';
import { GetEmployeeBiometricFaceIdUseCase } from '../application/get-employee-biometric-face-id.use-case';
import { SecureStorageService } from '@core/services/secure-storage.service';
import { DatePickerDrawerComponent } from './date-picker-drawer/date-picker-drawer.component';
import { ExceptionsDrawerComponent } from './exceptions-drawer/exceptions-drawer.component';
import { RecordsDrawerComponent } from './records-drawer/records-drawer.component';
import {
  ErrorModalComponent,
  ErrorModalType,
} from '@shared/components/error-modal/error-modal.component';
import * as faceapi from 'face-api.js';
import { environment } from '../../../../environments/environment';
import { GetVerificationAttendanceLockUseCase } from '@modules/verification-attendance-lock/application/get-verification-attendance-lock-use-case';
import { GetSystemSettingsUseCase } from '@modules/system-settings/application/get-system-settings.use-case';
import { formatLocalDate } from '@shared/utils/date.utils';
import { GetAuthorizeAnyZoneUseCase } from '@modules/authorize-any-zone/application/get-authorize-any-zone.use-case';
import { GetZoneCoordinatesUseCase } from '@modules/zones-authorization/application/get-zone-coordinates.use-case';

/**
 * Interfaz personalizada para el resultado de detectSingleFace().withFaceLandmarks()
 * face-api.js no tiene tipos TypeScript oficiales
 */
interface IFaceDetectionWithLandmarks {
  detection: {
    box: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
  landmarks: {
    positions: { x: number; y: number }[];
  };
}

@Component({
  selector: 'app-checkin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    TooltipModule,
    WeekCalendarComponent,
    DatePickerDrawerComponent,
    ExceptionsDrawerComponent,
    RecordsDrawerComponent,
    ErrorModalComponent,
  ],
  templateUrl: './checkin.component.html',
  styleUrl: './checkin.component.scss',
  host: { class: 'checkin-page' },
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
        animate('250ms ease-out', style({ opacity: 1 })),
      ]),
      transition(':leave', [animate('200ms ease-in', style({ opacity: 0 }))]),
    ]),
    trigger('slideUpDrawer', [
      transition(':enter', [
        style({ transform: 'translateY(100%)' }),
        animate('350ms cubic-bezier(0.4, 0.0, 0.2, 1)', style({ transform: 'translateY(0)' })),
      ]),
      transition(':leave', [
        animate('250ms cubic-bezier(0.4, 0.0, 0.2, 1)', style({ transform: 'translateY(100%)' })),
      ]),
    ]),
    trigger('fadeOverlay', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-out', style({ opacity: 1 })),
      ]),
      transition(':leave', [animate('250ms ease-in', style({ opacity: 0 }))]),
    ]),
  ],
})
export class CheckinComponent implements OnInit, OnDestroy {
  private readonly getAttendanceUseCase = inject(GetAttendanceUseCase);
  private readonly getEmployeeBiometricFaceIdUseCase = inject(GetEmployeeBiometricFaceIdUseCase);
  private readonly storeAssistUseCase = inject(StoreAssistUseCase);
  private readonly getAuthorizeAnyZoneUseCase = inject(GetAuthorizeAnyZoneUseCase);
  private readonly getZoneCoordinatesUseCase = inject(GetZoneCoordinatesUseCase);
  private readonly authPort = inject<IAuthPort>(AUTH_PORT);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly translateService = inject(TranslateService);
  private readonly logger = inject(LoggerService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly secureStorage = inject(SecureStorageService);
  private readonly destroyRef = inject(DestroyRef);
  private timeInterval?: ReturnType<typeof setInterval>;

  // Clave para almacenar la foto del rostro del empleado en base64 (localStorage, persiste entre sesiones)
  private readonly EMPLOYEE_BIOMETRIC_FACE_ID_PHOTO_KEY = 'employee_biometric_face_id_photo_base64';
  // Clave para almacenar el updatedAt de la foto, usado para detectar cambios en el servidor
  private readonly EMPLOYEE_BIOMETRIC_FACE_ID_UPDATED_AT_KEY =
    'employee_biometric_face_id_updated_at';

  // Estado de carga de modelos de face-api.js
  private faceApiModelsLoaded = false;
  // En desarrollo: modelos desde GitHub, en producción: modelos locales
  private readonly FACE_API_MODELS_URL = environment.FACE_API_MODELS_URL;
  // Umbral de similitud facial (0-1). Valor más bajo = más permisivo. Ajustado para Android PWA.
  private readonly FACE_MATCH_THRESHOLD = 0.51;
  // Umbral de confianza del detector de rostros. Valor más bajo = detecta rostros menos centrados/alejados.
  private readonly FACE_SCORE_THRESHOLD = 0.3;
  private readonly LIVENESS_MOVEMENT_THRESHOLD = 0.015;
  private readonly LIVENESS_FRAMES_TO_CHECK = 2;
  // Anti-spoofing: EAR mínimo para considerar ojo abierto (valores < umbral = parpadeo detectado)
  private readonly EAR_BLINK_THRESHOLD = 0.21;
  // Anti-spoofing: varianza de gradiente mínima para considerar textura de piel real vs foto/pantalla
  // Valor aumentado a 260 para rechazar fotos de pantallas de alta resolución
  private readonly TEXTURE_GRADIENT_THRESHOLD = 260;

  readonly attendance = signal<IAttendance | null>(null);
  readonly loading = signal(false);
  readonly starting = signal(false);
  readonly error = signal<string | null>(null);
  readonly messageAttendanceLock = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly currentDate = signal<Date>(new Date());
  readonly selectedDate = signal<Date>(new Date());
  readonly currentTime = signal<string>('');
  private readonly currentLang = signal<string>(this.translateService.currentLang || 'es');

  private livenessVideo?: HTMLVideoElement;
  private livenessUI?: HTMLDivElement;
  private livenessStream?: MediaStream;
  private frameCaptureInterval?: ReturnType<typeof setInterval>;
  private livenessCheckInterval?: ReturnType<typeof setInterval>;
  private livenessPromiseReject?: (reason?: unknown) => void;
  private readonly getVerificationAttendanceLockUseCase = inject(
    GetVerificationAttendanceLockUseCase,
  );
  private readonly getSystemSettingsUseCase = inject(GetSystemSettingsUseCase);

  // Control de cámara y flash
  private availableCameras: MediaDeviceInfo[] = [];
  private currentCameraDeviceId: string | null = null;
  private flashEnabled = false;

  // Drawers visibility
  showDatePicker = false;
  showExceptionsDrawer = false;
  showRecordsDrawer = false;

  // Modal de error
  readonly showErrorModal = signal(false);
  readonly errorModalType = signal<ErrorModalType>('error');
  readonly errorModalTitle = signal('');
  readonly errorModalMessage = signal('');

  // Estado de permisos
  readonly cameraPermissionGranted = signal<boolean | null>(null);
  readonly locationPermissionGranted = signal<boolean | null>(null);
  readonly requestingPermissions = signal(false);

  @ViewChild(DatePickerDrawerComponent) datePickerDrawer?: DatePickerDrawerComponent;

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

  /**
   * Nombre del turno formateado para mostrar: prefijo "De"/"From", solo la parte antes del primer "-",
   * en español la palabra "to" se reemplaza por "a", y sufijo " Hrs".
   */
  readonly displayShiftName = computed(() => {
    const shiftTimeStart = this.attendance()?.shiftTimeStart?.trim();
    const shiftTimeEnd = this.attendance()?.shiftTimeEnd?.trim();

    if (!shiftTimeStart || !shiftTimeEnd) return '';

    const formatTime = (time: string): string => {
      return time.length === 8 ? time.substring(0, 5) : time;
    };

    const formattedStart = formatTime(shiftTimeStart);
    const formattedEnd = formatTime(shiftTimeEnd);

    const lang = this.translateService.currentLang || 'es';
    const separator = lang === 'es' ? 'a' : 'to';
    const prefix = lang === 'es' ? 'De ' : 'From ';

    return `${prefix}${formattedStart} ${separator} ${formattedEnd} Hrs`;
  });

  /**
   * Indica si existen excepciones en la asistencia actual
   */
  readonly hasExceptions = computed(() => {
    const exceptions = this.attendance()?.exceptions ?? [];
    return exceptions.length > 0;
  });

  /**
   * Nombre del feriado truncado a 20 caracteres con "..." si es demasiado largo.
   */
  readonly displayHolidayName = computed(() => {
    const holidayName = this.attendance()?.holiday?.holidayName ?? '';
    const maxLength = 20;
    if (holidayName.length > maxLength) {
      return holidayName.substring(0, maxLength) + '...';
    }
    return holidayName;
  });

  /**
   * Actualiza la hora actual mostrada en el componente.
   * Se ejecuta cada segundo para mantener el reloj sincronizado.
   */
  private updateCurrentTime(): void {
    const now = new Date();
    const currentLang = this.translateService.currentLang || 'es';
    const locale = currentLang === 'en' ? 'en-US' : 'es-MX';
    const timeString = now.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    this.currentTime.set(timeString);
  }

  readonly canCheckIn = computed(() => {
    return !this.loading() && !this.starting();
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

  /**
   * Indica si la fecha seleccionada es el día de hoy (mismo día calendario).
   * Se usa para ocultar timer y botones de checks cuando se consulta otro día.
   */
  readonly isSelectedDateToday = computed(() => {
    const selected = this.selectedDate();
    const today = new Date();
    return (
      selected.getFullYear() === today.getFullYear() &&
      selected.getMonth() === today.getMonth() &&
      selected.getDate() === today.getDate()
    );
  });

  /**
   * Obtiene el HTML sanitizado del icono del día festivo trabajado
   */
  readonly holidayIconHtml = computed((): SafeHtml | null => {
    const icon = this.attendance()?.holiday?.holidayIcon;
    if (!icon) {
      return null;
    }
    return this.sanitizer.bypassSecurityTrustHtml(icon);
  });

  /**
   * Información sobre el tipo de día especial (vacaciones, incapacidad, etc.)
   */
  readonly specialDayInfo = computed(
    (): {
      type: 'vacation' | 'rest-day' | 'work-disability' | 'absence-from-work' | 'new-entry' | null;
      svgIcon: string;
      translationKey: string;
    } | null => {
      const att = this.attendance();
      if (!att) return null;

      if (att.isVacationDate) {
        return {
          type: 'vacation',
          svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#88a4bf" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17.553 16.75a7.5 7.5 0 0 0 -10.606 0" />
          <path d="M18 3.804a6 6 0 0 0 -8.196 2.196l10.392 6a6 6 0 0 0 -2.196 -8.196z" />
          <path d="M16.732 10c1.658 -2.87 2.225 -5.644 1.268 -6.196c-.957 -.552 -3.075 1.326 -4.732 4.196" />
          <path d="M15 9l-3 5.196" />
          <path d="M3 19.25a2.4 2.4 0 0 1 1 -.25a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1a2.4 2.4 0 0 0 2 -1a2.4 2.4 0 0 1 2 -1a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1a2.4 2.4 0 0 0 2 -1a2.4 2.4 0 0 1 2 -1a2.4 2.4 0 0 1 1 .25" />
        </svg>`,
          translationKey: 'vacations.vacationDay',
        };
      }

      if (att.isRestDay) {
        return {
          type: 'rest-day',
          svgIcon: `<svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#88a4bf"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M16 5l3 3l-2 1l4 4l-3 1l4 4h-9" />
            <path d="M15 21l0 -3" />
            <path d="M8 13l-2 -2" />
            <path d="M8 12l2 -2" />
            <path d="M8 21v-13" />
            <path d="M5.824 16a3 3 0 0 1 -2.743 -3.69a3 3 0 0 1 .304 -4.833a3 3 0 0 1 4.615 -3.707a3 3 0 0 1 4.614 3.707a3 3 0 0 1 .305 4.833a3 3 0 0 1 -2.919 3.695h-4z" />
          </svg>`,
          translationKey: 'attendance.restDay',
        };
      }

      if (att.isWorkDisabilityDate) {
        return {
          type: 'work-disability',
          svgIcon: `<svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#88a4bf"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M11 5m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
            <path d="M11 7l0 8l4 0l4 5" />
            <path d="M11 11l5 0" />
            <path d="M7 11.5a5 5 0 1 0 6 7.5" />
          </svg>`,
          translationKey: 'attendance.workDisability',
        };
      }

      const exceptions = att.exceptions ?? [];
      if (exceptions.length > 0) {
        const exception = exceptions[0];
        const slug = exception.exceptionType?.exceptionTypeSlug?.toLowerCase() ?? '';

        if (slug.includes('absence-from-work') || slug.includes('ausencia')) {
          return {
            type: 'absence-from-work',
            svgIcon: `<svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#88a4bf"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M9 5h9a2 2 0 0 1 2 2v9m-.184 3.839a2 2 0 0 1 -1.816 1.161h-12a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 1.158 -1.815" />
              <path d="M16 3v4" />
              <path d="M8 3v1" />
              <path d="M4 11h7m4 0h5" />
              <path d="M3 3l18 18" />
            </svg>`,
            translationKey: 'attendance.absenceFromWork',
          };
        }

        if (slug.includes('nuevo-ingreso') || slug.includes('new-entry')) {
          return {
            type: 'new-entry',
            svgIcon: `<svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#88a4bf"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" />
              <path d="M6 21v-2a4 4 0 0 1 4 -4h.5" />
              <path d="M17.8 20.817l-2.172 1.138a.392 .392 0 0 1 -.568 -.41l.415 -2.411l-1.757 -1.707a.389 .389 0 0 1 .217 -.665l2.428 -.352l1.086 -2.193a.392 .392 0 0 1 .702 0l1.086 2.193l2.428 .352a.39 .39 0 0 1 .217 .665l-1.757 1.707l.414 2.41a.39 .39 0 0 1 -.567 .411l-2.172 -1.138z" />
            </svg>`,
            translationKey: 'attendance.newEntry',
          };
        }
      }

      return null;
    },
  );

  /**
   * Obtiene el HTML sanitizado del icono del día especial
   */
  readonly specialDayIconHtml = computed((): SafeHtml | null => {
    const specialDay = this.specialDayInfo();
    if (!specialDay?.svgIcon) {
      return null;
    }
    return this.sanitizer.bypassSecurityTrustHtml(specialDay.svgIcon);
  });

  /**
   * Indica si se debe mostrar el turno normal o un día especial
   */
  readonly shouldShowShift = computed((): boolean => {
    return this.specialDayInfo() === null;
  });

  /**
   * Indica si se deben mostrar los botones de check-in/check-out
   * No se muestran para días especiales excepto para nuevo ingreso
   */
  readonly canShowCheckButtons = computed((): boolean => {
    const specialDay = this.specialDayInfo();
    if (!specialDay) return true;
    return specialDay.type === 'new-entry';
  });

  /**
   * Indica si hay permisos faltantes (cámara o ubicación denegados)
   */
  readonly hasPermissionIssues = computed((): boolean => {
    return this.cameraPermissionGranted() === false || this.locationPermissionGranted() === false;
  });

  /**
   * Mensaje descriptivo de los permisos faltantes
   */
  readonly permissionIssuesMessage = computed((): string => {
    const missing: string[] = [];
    if (this.cameraPermissionGranted() === false) missing.push('Cámara');
    if (this.locationPermissionGranted() === false) missing.push('Ubicación');
    return missing.length > 0 ? `Permisos requeridos: ${missing.join(' y ')}` : '';
  });

  ngOnInit(): void {
    // Inicializar la hora inmediatamente
    this.updateCurrentTime();

    // Actualizar hora cada segundo
    this.timeInterval = setInterval(() => {
      this.updateCurrentTime();
    }, 1000);

    // Suscribirse a cambios de idioma
    this.translateService.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => this.currentLang.set(event.lang));

    // Solicitar permisos necesarios
    void this.requestPermissions();

    void this.loadAttendance();
  }

  /**
   * Solicita los permisos de cámara y ubicación al entrar a la pantalla.
   * Si alguno está denegado, muestra un modal con instrucciones específicas para Android PWA.
   * Se ejecuta en cada visita a la pantalla para detectar permisos revocados.
   */
  private async requestPermissions(): Promise<void> {
    let cameraDenied = false;
    let locationDenied = false;

    // ── Verificar y solicitar permiso de cámara ────────────────────────────
    try {
      if (typeof navigator.mediaDevices?.getUserMedia !== 'undefined') {
        // Intentar abrir la cámara para forzar el diálogo de permisos si aún no se ha dado
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
        });
        stream.getTracks().forEach((track) => track.stop());
        this.cameraPermissionGranted.set(true);
      }
    } catch (error: unknown) {
      const err = error as { name?: string };
      if (err.name === 'NotAllowedError') {
        cameraDenied = true;
        this.cameraPermissionGranted.set(false);
        this.logger.warn('Permiso de cámara denegado al entrar a la pantalla');
      } else if (err.name === 'NotFoundError') {
        this.cameraPermissionGranted.set(false);
        this.logger.warn('Cámara no encontrada en el dispositivo');
      } else {
        this.cameraPermissionGranted.set(null);
        this.logger.warn('Error al solicitar permiso de cámara:', error);
      }
    }

    // ── Verificar y solicitar permiso de ubicación ────────────────────────
    try {
      if (typeof navigator.geolocation !== 'undefined') {
        if (typeof navigator.permissions?.query !== 'undefined') {
          try {
            const geoPermission = await navigator.permissions.query({
              name: 'geolocation' as PermissionName,
            });

            if (geoPermission.state === 'denied') {
              locationDenied = true;
              this.locationPermissionGranted.set(false);
              this.logger.warn('Permiso de ubicación denegado al entrar a la pantalla');
            } else if (geoPermission.state === 'prompt' || geoPermission.state === 'granted') {
              await new Promise<void>((resolve) => {
                navigator.geolocation.getCurrentPosition(
                  () => {
                    this.locationPermissionGranted.set(true);
                    resolve();
                  },
                  (geoError) => {
                    if (geoError.code === geoError.PERMISSION_DENIED) {
                      locationDenied = true;
                      this.locationPermissionGranted.set(false);
                      this.logger.warn('Permiso de ubicación denegado en la solicitud directa');
                    } else {
                      this.locationPermissionGranted.set(null);
                    }
                    resolve();
                  },
                  { timeout: 5000, enableHighAccuracy: false },
                );
              });
            }
          } catch (_permError) {
            try {
              await this.requestGeolocationPermission();
            } catch {
              // Permiso no disponible aún; se solicitará al intentar registrar asistencia
            }
          }
        } else {
          try {
            await this.requestGeolocationPermission();
          } catch {
            // Permiso no disponible aún; se solicitará al intentar registrar asistencia
          }
        }
      }
    } catch (error) {
      this.logger.warn('Error al verificar permiso de ubicación:', error);
    }

    // ── Mostrar modal de guía si hay permisos denegados ───────────────────
    // Se muestra al entrar a la pantalla para que el usuario corrija el problema
    // antes de intentar registrar asistencia, con instrucciones específicas para Android.
    if (cameraDenied || locationDenied) {
      const permisosFaltantes = [
        ...(cameraDenied ? ['Cámara'] : []),
        ...(locationDenied ? ['Ubicación'] : []),
      ].join(' y ');

      const instrucciones = this.buildPermissionInstructions(cameraDenied, locationDenied);

      this.showErrorModalWithMessage(
        'warning',
        `Permisos requeridos: ${permisosFaltantes}`,
        instrucciones,
      );
    }
  }

  /**
   * Genera las instrucciones para otorgar permisos en Android PWA instalada.
   *
   * @param camera - true si el permiso de cámara está denegado
   * @param location - true si el permiso de ubicación está denegado
   * @returns Texto con instrucciones paso a paso para el usuario
   */
  private buildPermissionInstructions(camera: boolean, location: boolean): string {
    const permisos = [...(camera ? ['cámara'] : []), ...(location ? ['ubicación'] : [])].join(
      ' y ',
    );

    return (
      `Para registrar tu asistencia necesitas permitir el acceso a ${permisos}.\n\n` +
      `¿Cómo habilitarlo en Android?\n` +
      `1. Ve a Ajustes de tu teléfono\n` +
      `2. Busca "Aplicaciones" o "Apps"\n` +
      `3. Encuentra esta aplicación en la lista\n` +
      `4. Toca en "Permisos"\n` +
      `5. Activa los permisos de ${permisos}\n` +
      `6. Regresa a la app y vuelve a intentarlo`
    );
  }

  /**
   * Solicita permisos de cámara y ubicación manualmente cuando el usuario toca el botón.
   * Actualiza los signals de estado de permisos y muestra feedback visual.
   * Si los permisos están denegados, muestra instrucciones para habilitarlos desde Ajustes.
   */
  async requestPermissionsManually(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.requestingPermissions.set(true);
    let cameraSuccess = false;
    let locationSuccess = false;

    // ── Solicitar permiso de cámara ────────────────────────────────────────
    try {
      if (typeof navigator.mediaDevices?.getUserMedia !== 'undefined') {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
        });
        stream.getTracks().forEach((track) => track.stop());
        this.cameraPermissionGranted.set(true);
        cameraSuccess = true;
      }
    } catch (error: unknown) {
      const err = error as { name?: string };
      if (err.name === 'NotAllowedError') {
        this.cameraPermissionGranted.set(false);
        this.logger.warn('Permiso de cámara denegado por el usuario');
      } else if (err.name === 'NotFoundError') {
        this.cameraPermissionGranted.set(false);
        this.logger.warn('Cámara no encontrada');
      } else {
        this.cameraPermissionGranted.set(null);
        this.logger.warn('Error al solicitar permiso de cámara:', error);
      }
    }

    // ── Solicitar permiso de ubicación ─────────────────────────────────────
    try {
      await new Promise<void>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          () => {
            this.locationPermissionGranted.set(true);
            locationSuccess = true;
            resolve();
          },
          (error) => {
            if (error.code === error.PERMISSION_DENIED) {
              this.locationPermissionGranted.set(false);
              this.logger.warn('Permiso de ubicación denegado por el usuario');
            } else {
              this.locationPermissionGranted.set(null);
              this.logger.warn('Error al obtener ubicación:', error);
            }
            reject(error);
          },
          { timeout: 5000, enableHighAccuracy: false },
        );
      });
    } catch {
      // Error ya registrado en el callback
    }

    this.requestingPermissions.set(false);

    // ── Mostrar feedback al usuario ────────────────────────────────────────
    if (cameraSuccess && locationSuccess) {
      this.showErrorModalWithMessage(
        'success',
        'Permisos otorgados',
        'Los permisos de cámara y ubicación se han otorgado correctamente. Ya puedes registrar tu asistencia.',
      );
    } else if (!cameraSuccess && !locationSuccess) {
      const instrucciones = this.buildPermissionInstructions(true, true);
      this.showErrorModalWithMessage('warning', 'Permisos denegados', instrucciones);
    } else if (!cameraSuccess) {
      const instrucciones = this.buildPermissionInstructions(true, false);
      this.showErrorModalWithMessage('warning', 'Permiso de cámara denegado', instrucciones);
    } else if (!locationSuccess) {
      const instrucciones = this.buildPermissionInstructions(false, true);
      this.showErrorModalWithMessage('warning', 'Permiso de ubicación denegado', instrucciones);
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

  /**
   * Limpia los recursos cuando el componente se destruye.
   * Detiene el intervalo del reloj para evitar fugas de memoria.
   */
  ngOnDestroy(): void {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
  }

  /**
   * Carga los datos de asistencia del empleado para la fecha seleccionada.
   * Consulta el backend y actualiza el estado del componente con la información obtenida.
   *
   * @throws Error si no se encuentra el ID del empleado en la sesión
   */
  async loadAttendance(): Promise<void> {
    const user = this.authPort.getCurrentUser();
    if (typeof user?.employeeId !== 'number') {
      this.showErrorModalWithMessage(
        'error',
        this.translateService.instant('attendance.faceRecognition.authenticationError'),
        this.translateService.instant('attendance.faceRecognition.noEmployeeId'),
      );
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      const date = this.selectedDate();
      const dateStart = formatLocalDate(date);
      const dateEnd = dateStart;

      const attendance = await this.getAttendanceUseCase.execute(
        dateStart,
        dateEnd,
        user.employeeId,
      );
      this.attendance.set(attendance);
    } catch (err) {
      this.error.set(this.translateService.instant('attendance.error'));
      this.logger.error('Error al cargar la asistencia:', err);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Verifica si el empleado está registrando asistencia con retardo.
   * Compara la hora actual con la hora de inicio del turno más la tolerancia configurada.
   *
   * Proceso:
   * 1. Obtiene la configuración de tolerancia de retardo del sistema
   * 2. Calcula el límite máximo permitido (hora inicio + minutos tolerancia)
   * 3. Compara con la hora actual
   *
   * @returns true si el empleado ha excedido la tolerancia de retardo, false en caso contrario
   */
  private async verifyIsTardiness(): Promise<boolean> {
    const settings = await this.getSystemSettingsUseCase.execute();
    const tolerances = settings?.systemSettingTolerances;

    if (!tolerances || tolerances.length === 0) {
      return false;
    }

    const tolerance = tolerances.find((t) => t.toleranceName === 'TardinessTolerance');
    if (!tolerance) {
      return false;
    }

    const shiftTimeStartRaw = this.attendance()?.shiftTimeStart;
    if (!shiftTimeStartRaw) {
      return false;
    }

    // shiftTimeStart viene en formato "HH:mm", se construye un Date con la fecha de hoy
    const [hours, minutes] = shiftTimeStartRaw.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
      return false;
    }

    const shiftStart = new Date();
    shiftStart.setHours(hours, minutes, 0, 0);

    // Límite máximo permitido = hora de inicio del turno + minutos de tolerancia
    const deadlineMs = shiftStart.getTime() + tolerance.toleranceMinutes * 60 * 1000;
    const now = Date.now();

    return now > deadlineMs;
  }

  /**
   * Maneja el registro de check-in con verificación biométrica facial.
   *
   * Flujo completo:
   * 1. Verifica bloqueos de asistencia (ausencias, retardos)
   * 2. Valida permisos de cámara y ubicación
   * 3. Carga modelos de reconocimiento facial (face-api.js)
   * 4. Captura foto con verificación de liveness (persona real)
   * 5. Compara rostro capturado con foto almacenada
   * 6. Obtiene ubicación GPS
   * 7. Registra la asistencia en el servidor
   *
   * @param type - Tipo de registro ('check' para check-in/check-out)
   * @throws Error si falla alguna validación o proceso
   */
  async handleRegisterCheckIn(type: string): Promise<void> {
    this.loading.set(true);
    this.messageAttendanceLock.set(null);

    const isFirstCheckIn = this.attendance()?.checkInTime === null;

    if (isFirstCheckIn) {
      const verificationAttendanceLock =
        await this.getVerificationAttendanceLockUseCase.execute('absences');
      if (verificationAttendanceLock?.status === 200) {
        if (verificationAttendanceLock?.data?.locked) {
          this.messageAttendanceLock.set(verificationAttendanceLock?.message);
          this.loading.set(false);
          return;
        }
      } else {
        this.error.set(
          verificationAttendanceLock?.message ?? 'Error al verificar el bloqueo de asistencia',
        );
        this.loading.set(false);
        return;
      }
      const isTardiness = await this.verifyIsTardiness();
      if (isTardiness) {
        const verificationAttendanceLock =
          await this.getVerificationAttendanceLockUseCase.execute('tardiness');
        if (verificationAttendanceLock?.status === 200) {
          if (verificationAttendanceLock?.data?.locked) {
            this.messageAttendanceLock.set(verificationAttendanceLock?.message);
            this.loading.set(false);
          }
        } else {
          this.error.set(
            verificationAttendanceLock?.message ?? 'Error al verificar el bloqueo de asistencia',
          );
          this.loading.set(false);
          return;
        }
      }
    }
    this.loading.set(false);
    this.success.set(null);
    this.error.set(null);
    if (!this.canCheckIn()) return;

    const user = this.authPort.getCurrentUser();
    if (typeof user?.employeeId !== 'number') {
      this.showErrorModalWithMessage(
        'error',
        this.translateService.instant('attendance.faceRecognition.authenticationError'),
        this.translateService.instant('attendance.faceRecognition.noEmployeeId'),
      );
      return;
    }

    // Solo ejecutar en el navegador
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.starting.set(true);
    const canCheckInZone = await this.canCheckInZone();
    if (!canCheckInZone) {
      this.starting.set(false);
      return;
    }
    const employeeBiometricFaceId = await this.getEmployeeBiometricFaceIdUseCase.execute(
      user.employeeId,
    );
    if (!employeeBiometricFaceId) {
      this.showErrorModalWithMessage(
        'error',
        this.translateService.instant('attendance.faceRecognition.incompleteSetup'),
        this.translateService.instant('attendance.faceRecognition.noFacePhoto'),
      );
      this.starting.set(false);
      return;
    }
    const employeeBiometricFaceIdPhotoUrl = employeeBiometricFaceId.employeeBiometricFaceIdPhotoUrl;
    const serverUpdatedAt = employeeBiometricFaceId.employeeBiometricFaceIdUpdatedAt;

    // Sistema de caché inteligente: solo descarga la foto si no existe localmente
    // o si el servidor indica que cambió (comparando updatedAt).
    // Esto optimiza el rendimiento y reduce el consumo de datos.
    const cachedUpdatedAt = this.secureStorage.getItem(
      this.EMPLOYEE_BIOMETRIC_FACE_ID_UPDATED_AT_KEY,
    );
    const alreadyStored = this.getStoredPhotoBase64();
    const photoIsStale = !alreadyStored || cachedUpdatedAt !== serverUpdatedAt;

    if (employeeBiometricFaceIdPhotoUrl && photoIsStale) {
      try {
        await this.savePhotoAsBase64(employeeBiometricFaceIdPhotoUrl);
        this.secureStorage.setItem(this.EMPLOYEE_BIOMETRIC_FACE_ID_UPDATED_AT_KEY, serverUpdatedAt);
        this.logger.info(
          `Foto biométrica ${alreadyStored ? 'actualizada' : 'descargada'} (updatedAt: ${serverUpdatedAt})`,
        );
      } catch (error) {
        this.starting.set(false);
        this.logger.warn('Error al guardar la foto en base64:', error);
        // Continuar con el proceso aunque falle el guardado
      }
    } else {
      this.logger.info(
        `Foto biométrica en caché vigente (updatedAt: ${cachedUpdatedAt}), omitiendo descarga`,
      );
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
          error instanceof Error
            ? error.message
            : this.translateService.instant('attendance.faceRecognition.modelsLoadError');
        if (
          errorMessage.includes('reconocimiento facial') ||
          errorMessage.includes('facial recognition')
        ) {
          this.showErrorModalWithMessage(
            'error',
            this.translateService.instant('attendance.faceRecognition.modelsLoadError'),
            this.translateService.instant('attendance.faceRecognition.modelsLoadErrorMessage'),
          );
        } else {
          this.showErrorModalWithMessage(
            'error',
            this.translateService.instant('attendance.faceRecognition.unexpectedError'),
            errorMessage,
          );
        }
        this.loading.set(false);
        return;
      }

      // Captura foto con verificación de liveness (anti-spoofing).
      // El sistema detecta si es una persona real mediante análisis de movimiento,
      // parpadeo (EAR), textura de piel y micro-expresiones faciales.
      let capturedPhotoBase64: string;
      try {
        capturedPhotoBase64 = await this.capturePhotoWithLiveness();
      } catch (livenessError) {
        const livenessErrorMessage =
          livenessError instanceof Error ? livenessError.message : 'Error desconocido';

        this.loading.set(false);

        // La captura manual ya mostró su propio modal y cerró la cámara; no duplicar
        if (livenessErrorMessage === 'MANUAL_CAPTURE_FAILED') {
          return;
        }

        this.logger.error('Error en verificación de liveness:', livenessError);

        // Si el error es de liveness (movimiento insuficiente), mostrar mensaje específico
        if (
          livenessErrorMessage.includes('movimiento') ||
          livenessErrorMessage.includes('liveness') ||
          livenessErrorMessage.includes('persona real') ||
          livenessErrorMessage.includes('movement') ||
          livenessErrorMessage.includes('real person')
        ) {
          this.showErrorModalWithMessage(
            'warning',
            this.translateService.instant('attendance.faceRecognition.livenessVerification'),
            livenessErrorMessage,
          );
        } else if (
          livenessErrorMessage.includes('cámara') ||
          livenessErrorMessage.includes('camera')
        ) {
          this.showErrorModalWithMessage(
            'error',
            this.translateService.instant('attendance.faceRecognition.cameraPermissionRequired'),
            this.translateService.instant('attendance.faceRecognition.cameraPermissionMessage'),
          );
        } else if (
          livenessErrorMessage.includes('Captura cancelada') ||
          livenessErrorMessage.includes('Capture cancelled')
        ) {
          this.showErrorModalWithMessage(
            'info',
            this.translateService.instant('attendance.faceRecognition.captureCancelled'),
            this.translateService.instant('attendance.faceRecognition.captureCancelledMessage'),
          );
        } else {
          this.showErrorModalWithMessage(
            'error',
            this.translateService.instant('attendance.faceRecognition.captureError'),
            livenessErrorMessage,
          );
        }
        return;
      }
      const storedPhotoBase64 = this.getStoredPhotoBase64();
      if (!storedPhotoBase64) {
        this.loading.set(false);
        this.showErrorModalWithMessage(
          'error',
          this.translateService.instant('attendance.faceRecognition.dataNotFound'),
          this.translateService.instant('attendance.faceRecognition.noStoredPhoto'),
        );
        return;
      }

      // Comparación biométrica: calcula la similitud entre el rostro capturado
      // y el rostro almacenado usando descriptores faciales (embeddings de 128 dimensiones).
      // Umbral de similitud configurado en FACE_MATCH_THRESHOLD (0.51 = 51% de similitud mínima).
      const isMatch = await this.compareFaces(storedPhotoBase64, capturedPhotoBase64);
      if (!isMatch) {
        this.loading.set(false);
        this.showErrorModalWithMessage(
          'error',
          this.translateService.instant('attendance.faceRecognition.verificationFailed'),
          this.translateService.instant('attendance.faceRecognition.verificationFailedMessage'),
        );
        return;
      }

      // Obtener ubicación GPS para validar que el empleado esté en zona autorizada
      const location = await this.getCurrentLocation();

      const success = await this.storeAssistUseCase.execute(
        user.employeeId,
        location.coords.latitude,
        location.coords.longitude,
        location.coords.accuracy ?? 0,
        type,
      );
      if (success) {
        // Recargar asistencia
        await this.loadAttendance();
        this.showErrorModalWithMessage(
          'success',
          this.translateService.instant('attendance.faceRecognition.attendanceRegistered'),
          this.translateService.instant('attendance.faceRecognition.attendanceRegisteredMessage'),
        );
      } else {
        this.showErrorModalWithMessage(
          'error',
          this.translateService.instant('attendance.faceRecognition.registerError'),
          this.translateService.instant('attendance.faceRecognition.registerErrorMessage'),
        );
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      const errorMessage = error.message ?? '';
      this.logger.error('Error en handleRegisterCheckIn:', err);

      if (
        errorMessage.includes('ubicación') ||
        errorMessage.includes('ubicacion') ||
        errorMessage.includes('location')
      ) {
        this.showErrorModalWithMessage(
          'error',
          this.translateService.instant('attendance.faceRecognition.locationPermissionRequired'),
          this.translateService.instant('attendance.faceRecognition.locationPermissionMessage'),
        );
      } else if (errorMessage.includes('cámara') || errorMessage.includes('camera')) {
        this.showErrorModalWithMessage(
          'error',
          this.translateService.instant('attendance.faceRecognition.cameraPermissionRequired'),
          this.translateService.instant('attendance.faceRecognition.cameraPermissionMessage'),
        );
      } else if (
        errorMessage.includes('movimiento') ||
        errorMessage.includes('liveness') ||
        errorMessage.includes('movement')
      ) {
        this.showErrorModalWithMessage(
          'warning',
          this.translateService.instant('attendance.faceRecognition.livenessVerification'),
          errorMessage,
        );
      } else {
        this.showErrorModalWithMessage(
          'error',
          this.translateService.instant('attendance.faceRecognition.registerErrorGeneric'),
          errorMessage ||
            this.translateService.instant('attendance.faceRecognition.registerErrorGenericMessage'),
        );
      }
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Verifica y solicita los permisos necesarios para el registro de asistencia.
   * Requiere acceso a cámara (reconocimiento facial) y ubicación (validación de zona).
   *
   * Nota: En localhost HTTP, algunos navegadores requieren interacción del usuario
   * antes de otorgar permisos. En producción (HTTPS), los permisos se pueden solicitar
   * automáticamente.
   *
   * @throws Error si algún permiso es denegado o no está disponible
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
          message +=
            '\n\nEn Android: ve a Ajustes del teléfono → Aplicaciones → ' +
            'esta app → Permisos → activa Cámara.';
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
                  '\n\nEn Android: ve a Ajustes del teléfono → Aplicaciones → ' +
                  'esta app → Permisos → activa Ubicación.';
              } else if (isLocalhost) {
                message += ' Por favor, permite el acceso a la ubicación cuando se solicite.';
              } else {
                message +=
                  '\n\nEn Android: ve a Ajustes del teléfono → Aplicaciones → ' +
                  'esta app → Permisos → activa Ubicación.';
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

  /**
   * Enumera todas las cámaras disponibles en el dispositivo.
   *
   * @returns Array de dispositivos de video disponibles
   */
  private async enumerateCameras(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((device) => device.kind === 'videoinput');
    } catch (error) {
      this.logger.error('Error al enumerar cámaras:', error);
      return [];
    }
  }

  /**
   * Cambia a una cámara específica y actualiza el stream de video.
   *
   * @param deviceId - ID del dispositivo de cámara a usar
   * @param video - Elemento de video donde se mostrará el stream
   * @param currentStream - Stream actual que será reemplazado
   * @returns Nuevo stream de video
   */
  private async switchCamera(
    deviceId: string,
    video: HTMLVideoElement,
    currentStream: MediaStream,
  ): Promise<MediaStream> {
    try {
      currentStream.getTracks().forEach((track) => track.stop());

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      video.srcObject = newStream;
      this.currentCameraDeviceId = deviceId;
      this.livenessStream = newStream;

      if (this.flashEnabled) {
        await this.applyFlash(newStream, true);
      }

      return newStream;
    } catch (error) {
      this.logger.error('Error al cambiar de cámara:', error);
      throw error;
    }
  }

  /**
   * Aplica o desactiva el flash en el stream de video.
   *
   * @param stream - Stream de video donde se aplicará el flash
   * @param enable - true para activar, false para desactivar
   */
  private async applyFlash(stream: MediaStream, enable: boolean): Promise<void> {
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      try {
        const capabilities = videoTrack.getCapabilities();
        // @ts-ignore - torch es una propiedad experimental
        if (capabilities.torch) {
          await videoTrack.applyConstraints({
            // @ts-ignore - torch es una propiedad experimental
            advanced: [{ torch: enable }],
          });
          this.flashEnabled = enable;
          this.logger.info(`Flash ${enable ? 'activado' : 'desactivado'} correctamente`);
        }
      } catch (error) {
        this.logger.warn('No se pudo cambiar el estado del flash:', error);
      }
    }
  }

  /**
   * Reinicia el stream de la cámara manteniendo la misma configuración.
   *
   * @param video - Elemento de video donde se mostrará el stream
   * @param currentStream - Stream actual que será reiniciado
   * @returns Nuevo stream de video
   */
  private async restartCamera(
    video: HTMLVideoElement,
    currentStream: MediaStream,
  ): Promise<MediaStream> {
    try {
      currentStream.getTracks().forEach((track) => track.stop());

      const constraints: MediaStreamConstraints = {
        video: this.currentCameraDeviceId
          ? {
              deviceId: { exact: this.currentCameraDeviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            }
          : {
              facingMode: 'user',
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = newStream;
      this.livenessStream = newStream;

      if (this.flashEnabled) {
        await this.applyFlash(newStream, true);
      }

      return newStream;
    } catch (error) {
      this.logger.error('Error al reiniciar la cámara:', error);
      throw error;
    }
  }

  /**
   * Captura una foto con verificación continua de liveness (anti-spoofing).
   *
   * Proceso de verificación en tiempo real:
   * 1. Abre la cámara frontal con flash (si está disponible)
   * 2. Captura frames continuamente cada 120ms
   * 3. Analiza liveness cada 250ms usando múltiples técnicas:
   *    - Detección de movimiento natural del rostro
   *    - Análisis de parpadeo mediante Eye Aspect Ratio (EAR)
   *    - Detección de textura de piel real vs foto/pantalla
   *    - Análisis de micro-expresiones faciales
   * 4. Compara el rostro detectado con la foto almacenada
   * 5. Captura automáticamente cuando se verifica que es una persona real
   *
   * Técnicas anti-spoofing implementadas:
   * - EAR (Eye Aspect Ratio): detecta parpadeos naturales
   * - Análisis de gradientes de Sobel: diferencia piel real de pantallas
   * - Análisis de rigidez de movimiento: fotos se mueven de forma rígida
   * - Micro-expresiones: personas reales tienen variaciones naturales
   *
   * @returns Promesa con la imagen capturada en formato base64
   * @throws Error si el usuario cancela, hay problemas con la cámara o falla la verificación
   */
  private async capturePhotoWithLiveness(): Promise<string> {
    if (!isPlatformBrowser(this.platformId)) {
      throw new Error('La captura de foto solo está disponible en el navegador');
    }

    try {
      if (typeof navigator.mediaDevices?.getUserMedia === 'undefined') {
        throw new Error(
          this.translateService.instant('attendance.faceRecognition.cameraNotAvailable'),
        );
      }

      // Enumerar cámaras disponibles
      this.availableCameras = await this.enumerateCameras();

      // Obtener acceso a la cámara frontal con resolución explícita para Android.
      // Se especifica ideal de 720p para asegurar buena calidad sin sobrecargar el procesamiento.
      const constraints: MediaStreamConstraints = this.currentCameraDeviceId
        ? {
            video: {
              deviceId: { exact: this.currentCameraDeviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          }
        : {
            video: {
              facingMode: 'user',
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          };

      let stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (!this.currentCameraDeviceId && stream.getVideoTracks()[0]) {
        this.currentCameraDeviceId = stream.getVideoTracks()[0].getSettings().deviceId ?? null;
      }

      this.flashEnabled = false;

      // Crear contenedor principal con fondo blanco y safe areas
      const cameraContainer = document.createElement('div');
      cameraContainer.style.position = 'fixed';
      cameraContainer.style.top = '0';
      cameraContainer.style.left = '0';
      cameraContainer.style.width = '100%';
      cameraContainer.style.height = '100%';
      cameraContainer.style.backgroundColor = '#ffffff';
      cameraContainer.style.zIndex = '9999';
      cameraContainer.style.display = 'flex';
      cameraContainer.style.flexDirection = 'column';
      cameraContainer.style.alignItems = 'center';
      cameraContainer.style.justifyContent = 'center';
      cameraContainer.style.paddingTop = 'calc(env(safe-area-inset-top, 0px) + 20px)';
      cameraContainer.style.paddingBottom = 'calc(env(safe-area-inset-bottom, 0px) + 20px)';
      cameraContainer.style.paddingLeft = 'env(safe-area-inset-left, 0px)';
      cameraContainer.style.paddingRight = 'env(safe-area-inset-right, 0px)';
      cameraContainer.id = 'camera-container';
      document.body.appendChild(cameraContainer);

      // Crear contenedor del óvalo para el video
      const ovalContainer = document.createElement('div');
      ovalContainer.style.position = 'relative';
      ovalContainer.style.width = '85%';
      ovalContainer.style.maxWidth = '400px';
      ovalContainer.style.aspectRatio = '3 / 5';
      ovalContainer.style.borderRadius = '50%';
      ovalContainer.style.overflow = 'hidden';
      ovalContainer.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.15)';
      ovalContainer.id = 'oval-container';
      cameraContainer.appendChild(ovalContainer);

      // Crear un elemento de video dentro del óvalo
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;
      video.style.position = 'absolute';
      video.style.top = '50%';
      video.style.left = '50%';
      video.style.transform = 'translate(-50%, -50%) scaleX(-1)';
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.objectFit = 'cover';
      ovalContainer.appendChild(video);

      // Esperar a que el video esté listo
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = (): void => {
          resolve();
        };
      });

      // Crear contenedor para la UI de la cámara
      const uiContainer = document.createElement('div');
      uiContainer.style.position = 'absolute';
      uiContainer.style.top = '0';
      uiContainer.style.left = '0';
      uiContainer.style.width = '100%';
      uiContainer.style.height = '100%';
      uiContainer.style.zIndex = '10000';
      uiContainer.style.pointerEvents = 'none';
      cameraContainer.appendChild(uiContainer);

      // Crear recuadro delimitador para el rostro (óvalo)
      const faceFrame = document.createElement('div');
      faceFrame.style.position = 'absolute';
      faceFrame.style.top = '50%';
      faceFrame.style.left = '50%';
      faceFrame.style.transform = 'translate(-50%, -50%)';
      faceFrame.style.width = '85%';
      faceFrame.style.maxWidth = '400px';
      faceFrame.style.aspectRatio = '3 / 5';
      faceFrame.style.border = '4px dashed rgba(255, 193, 7, 0.9)';
      faceFrame.style.borderRadius = '50%';
      faceFrame.style.boxShadow = '0 0 0 4px rgba(255, 193, 7, 0.3)';
      faceFrame.style.pointerEvents = 'none';
      faceFrame.style.transition = 'border-color 0.3s ease, box-shadow 0.3s ease';
      faceFrame.id = 'face-frame';
      uiContainer.appendChild(faceFrame);

      // Crear indicador de estado de liveness
      const statusIndicator = document.createElement('div');
      statusIndicator.style.position = 'absolute';
      statusIndicator.style.top = 'calc(env(safe-area-inset-top, 0px) + 20px)';
      statusIndicator.style.left = '50%';
      statusIndicator.style.transform = 'translateX(-50%)';
      statusIndicator.style.padding = '12px 24px';
      statusIndicator.style.borderRadius = '25px';
      statusIndicator.style.fontSize = '14px';
      statusIndicator.style.fontWeight = 'bold';
      statusIndicator.style.textAlign = 'center';
      statusIndicator.style.transition = 'all 0.3s ease';
      statusIndicator.style.pointerEvents = 'none';
      statusIndicator.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
      this.updateLivenessStatusIndicator(statusIndicator, 'checking');
      // uiContainer.appendChild(statusIndicator);

      // Crear mensaje de instrucción
      const instructionMessage = document.createElement('div');
      instructionMessage.textContent = this.translateService.instant(
        'attendance.faceRecognition.searchingFace',
      );
      instructionMessage.style.position = 'absolute';
      instructionMessage.style.bottom = 'calc(env(safe-area-inset-bottom, 0px) + 120px)';
      instructionMessage.style.left = '50%';
      instructionMessage.style.transform = 'translateX(-50%)';
      instructionMessage.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      instructionMessage.style.color = 'white';
      instructionMessage.style.padding = '12px 24px';
      instructionMessage.style.borderRadius = '12px';
      instructionMessage.style.fontSize = '13px';
      instructionMessage.style.textAlign = 'center';
      instructionMessage.style.maxWidth = '90%';
      instructionMessage.style.pointerEvents = 'none';
      instructionMessage.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
      uiContainer.appendChild(instructionMessage);

      // Crear botón para capturar la foto (inicialmente deshabilitado)
      const captureButton = document.createElement('button');
      captureButton.textContent = this.translateService.instant(
        'attendance.faceRecognition.verifying',
      );
      captureButton.disabled = true;
      captureButton.style.position = 'absolute';
      captureButton.style.bottom = 'calc(env(safe-area-inset-bottom, 0px) + 30px)';
      captureButton.style.left = '50%';
      captureButton.style.transform = 'translateX(-50%)';
      captureButton.style.padding = '16px 40px';
      captureButton.style.backgroundColor = '#6c757d';
      captureButton.style.color = 'white';
      captureButton.style.border = 'none';
      captureButton.style.borderRadius = '30px';
      captureButton.style.fontSize = '16px';
      captureButton.style.fontWeight = 'bold';
      captureButton.style.cursor = 'not-allowed';
      captureButton.style.transition = 'all 0.3s ease';
      captureButton.style.pointerEvents = 'auto';
      captureButton.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
      // uiContainer.appendChild(captureButton);

      // Crear botón para cancelar/cerrar
      const cancelButton = document.createElement('button');
      cancelButton.textContent = '✕';
      cancelButton.style.position = 'absolute';
      cancelButton.style.top = 'calc(env(safe-area-inset-top, 0px) + 20px)';
      cancelButton.style.right = 'calc(env(safe-area-inset-right, 0px) + 20px)';
      cancelButton.style.width = '3rem';
      cancelButton.style.height = '3rem';
      cancelButton.style.padding = '0';
      cancelButton.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
      cancelButton.style.color = 'var(--text-tertiary)';
      cancelButton.style.border = 'none';
      cancelButton.style.borderRadius = '0.5rem';
      cancelButton.style.fontSize = '1rem';
      cancelButton.style.fontWeight = 'bold';
      cancelButton.style.cursor = 'pointer';
      cancelButton.style.pointerEvents = 'auto';
      cancelButton.style.boxShadow = 'none';
      cancelButton.style.transition = 'all 0.2s ease';
      uiContainer.appendChild(cancelButton);

      // ── Controles de cámara (selector, flash, reiniciar) ──────────────────────
      const controlsContainer = document.createElement('div');
      controlsContainer.style.position = 'absolute';
      controlsContainer.style.top = 'calc(env(safe-area-inset-top, 0px) + 20px)';
      controlsContainer.style.left = 'calc(env(safe-area-inset-left, 0px) + 20px)';
      controlsContainer.style.display = 'flex';
      controlsContainer.style.flexDirection = 'column';
      controlsContainer.style.gap = '0.5rem';
      controlsContainer.style.pointerEvents = 'auto';
      controlsContainer.style.width = '75%';
      uiContainer.appendChild(controlsContainer);

      // Selector de cámara
      if (this.availableCameras.length > 1) {
        const cameraSelect = document.createElement('select');
        cameraSelect.style.padding = '10px 12px';
        cameraSelect.style.backgroundColor = 'var(--bg-tertiary)';
        cameraSelect.style.color = 'var(--text-tertiary)';
        cameraSelect.style.border = 'none';
        cameraSelect.style.borderRadius = '0.5rem';
        cameraSelect.style.fontSize = '0.8rem';
        cameraSelect.style.fontWeight = 'normal';
        cameraSelect.style.cursor = 'pointer';
        cameraSelect.style.outline = 'none';
        cameraSelect.style.height = '3rem';
        cameraSelect.title = this.translateService.instant('attendance.camera.selectCamera');

        this.availableCameras.forEach((camera, index) => {
          const option = document.createElement('option');
          option.value = camera.deviceId;
          option.textContent =
            camera.label ||
            `${this.translateService.instant('attendance.camera.camera')} ${index + 1}`;
          if (camera.deviceId === this.currentCameraDeviceId) {
            option.selected = true;
          }
          cameraSelect.appendChild(option);
        });

        cameraSelect.onchange = async (): Promise<void> => {
          try {
            stream = await this.switchCamera(cameraSelect.value, video, stream);
          } catch (error) {
            this.logger.error('Error al cambiar de cámara:', error);
          }
        };

        controlsContainer.appendChild(cameraSelect);
      }

      // Botón de flash
      const flashButton = document.createElement('button');
      flashButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="1rem" height="1rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M13 2L3 14h9l-1 8l10-12h-9l1-8z"/>
        </svg>
      `;
      flashButton.style.width = '3rem';
      flashButton.style.height = '3rem';
      flashButton.style.padding = '0';
      flashButton.style.backgroundColor = 'var(--bg-tertiary)';
      flashButton.style.color = 'var(--text-tertiary)';
      flashButton.style.border = 'none';
      flashButton.style.borderRadius = '0.5rem';
      flashButton.style.cursor = 'pointer';
      flashButton.style.display = 'flex';
      flashButton.style.alignItems = 'center';
      flashButton.style.justifyContent = 'center';
      flashButton.style.transition = 'all 0.2s ease';
      flashButton.title = this.translateService.instant('attendance.camera.toggleFlash');

      const updateFlashButtonState = (): void => {
        const svg = flashButton.querySelector('svg');
        if (this.flashEnabled) {
          flashButton.style.backgroundColor = 'var(--warning)';
          flashButton.style.color = '#fff';
          flashButton.style.borderColor = 'var(--warning)';
          if (svg) {
            svg.setAttribute('stroke', '#fff');
          }
        } else {
          flashButton.style.backgroundColor = 'var(--bg-tertiary)';
          flashButton.style.color = '#fff';
          flashButton.style.borderColor = 'var(--border-color)';
          if (svg) {
            svg.setAttribute('stroke', 'currentColor');
          }
        }
      };

      flashButton.onclick = async (): Promise<void> => {
        try {
          this.flashEnabled = !this.flashEnabled;
          await this.applyFlash(stream, this.flashEnabled);
          updateFlashButtonState();
        } catch (error) {
          this.logger.error('Error al cambiar el estado del flash:', error);
        }
      };

      // Botón de captura manual
      const manualCaptureButton = document.createElement('button');
      manualCaptureButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="1rem" height="1rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14.5 4h-5l-3 3H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2.5z"/>
          <circle cx="12" cy="13" r="3"/>
        </svg>
      `;
      manualCaptureButton.style.width = '3rem';
      manualCaptureButton.style.height = '3rem';
      manualCaptureButton.style.padding = '0';
      manualCaptureButton.style.backgroundColor = 'var(--bg-tertiary)';
      manualCaptureButton.style.color = 'var(--text-tertiary)';
      manualCaptureButton.style.border = 'none';
      manualCaptureButton.style.borderRadius = '0.5rem';
      manualCaptureButton.style.cursor = 'pointer';
      manualCaptureButton.style.display = 'flex';
      manualCaptureButton.style.alignItems = 'center';
      manualCaptureButton.style.justifyContent = 'center';
      manualCaptureButton.style.transition = 'all 0.2s ease';
      manualCaptureButton.title = this.translateService.instant('attendance.camera.manualCapture');

      controlsContainer.appendChild(manualCaptureButton);

      controlsContainer.appendChild(flashButton);

      // Botón de reiniciar cámara
      const restartButton = document.createElement('button');
      restartButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="1rem" height="1rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 2v6h-6"/>
          <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
          <path d="M3 22v-6h6"/>
          <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
        </svg>
      `;
      restartButton.style.width = '3rem';
      restartButton.style.height = '3rem';
      restartButton.style.padding = '0';
      restartButton.style.backgroundColor = 'var(--bg-tertiary)';
      restartButton.style.color = 'var(--text-tertiary)';
      restartButton.style.border = 'none';
      restartButton.style.borderRadius = '0.5rem';
      restartButton.style.cursor = 'pointer';
      restartButton.style.display = 'flex';
      restartButton.style.alignItems = 'center';
      restartButton.style.justifyContent = 'center';
      restartButton.style.transition = 'all 0.2s ease';
      restartButton.title = this.translateService.instant('attendance.camera.restartCamera');

      restartButton.onclick = async (): Promise<void> => {
        try {
          stream = await this.restartCamera(video, stream);
        } catch (error) {
          this.logger.error('Error al reiniciar la cámara:', error);
        }
      };

      controlsContainer.appendChild(restartButton);

      // ── Sistema de verificación continua de liveness ──────────────────────────
      // Mantiene un buffer circular de frames para análisis en tiempo real.
      // Optimizado para balance entre precisión y rendimiento:
      // - 2 frames son suficientes para detectar movimiento y calcular variaciones
      // - Captura cada 120ms (8 FPS) para reducir carga de CPU
      // - Análisis cada 250ms para dar tiempo a que se acumulen cambios detectables
      let isLive = false;
      let livenessCheckInterval: ReturnType<typeof setInterval> | null = null;
      let isCapturing = false;
      const frameBuffer: string[] = [];
      const MAX_FRAME_BUFFER = 2;
      const FRAME_CAPTURE_INTERVAL = 120;
      const LIVENESS_CHECK_INTERVAL = 250;

      /**
       * Captura un frame del video y lo agrega al buffer circular.
       * Los frames se redimensionan a 640px de ancho para optimizar el procesamiento.
       */
      const captureFrame = (): void => {
        if (isCapturing) return;
        const canvas = document.createElement('canvas');
        const targetWidth = 640;
        const targetHeight = (video.videoHeight / video.videoWidth) * targetWidth;
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
          const base64 = canvas.toDataURL('image/jpeg', 0.6);
          frameBuffer.push(base64);
          // Mantener solo los últimos MAX_FRAME_BUFFER frames
          if (frameBuffer.length > MAX_FRAME_BUFFER) {
            frameBuffer.shift();
          }
        }
      };

      /**
       * Actualiza el color del recuadro del rostro según el estado
       */
      const updateFaceFrameColor = (status: 'checking' | 'verified' | 'failed'): void => {
        const frameColors = {
          checking: {
            border: 'rgba(255, 193, 7, 0.9)',
            shadow: '0 0 0 4px rgba(255, 193, 7, 0.3)',
          },
          verified: {
            border: 'rgba(40, 167, 69, 0.9)',
            shadow: '0 0 0 4px rgba(40, 167, 69, 0.3)',
          },
          failed: {
            border: 'rgba(220, 53, 69, 0.9)',
            shadow: '0 0 0 4px rgba(220, 53, 69, 0.3)',
          },
        };

        const colors = frameColors[status];
        faceFrame.style.borderColor = colors.border;
        faceFrame.style.boxShadow = colors.shadow;
      };

      // Inicializar el color del recuadro como "verificando"
      updateFaceFrameColor('checking');

      return new Promise<string>((resolve, reject) => {
        const captureFinalPhoto = (): void => {
          if (isCapturing) return;
          isCapturing = true;

          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            this.closeLivenessFromOutside();
            this.loading.set(false);
            reject(new Error('No se pudo obtener el contexto del canvas'));
            return;
          }
          ctx.drawImage(video, 0, 0);
          const base64 = canvas.toDataURL('image/jpeg', 0.9);

          // Cerrar la cámara antes de resolver
          this.closeLivenessFromOutside();

          // Activar el loader para el proceso de verificación
          this.loading.set(true);

          resolve(base64);
        };

        /**
         * Verifica liveness analizando los frames capturados.
         * Ejecuta análisis completo de anti-spoofing y comparación facial.
         * Se ejecuta cada 250ms para dar tiempo a que se detecten cambios naturales.
         */
        const checkLiveness = async (): Promise<void> => {
          if (isCapturing || frameBuffer.length < 2) {
            return;
          }

          try {
            // Crear copia del buffer para análisis paralelo sin bloquear la captura
            const framesToAnalyze = [...frameBuffer];
            const { isLive: livenessResult, lastDescriptor } =
              await this.detectLivenessFromFrames(framesToAnalyze);

            isLive = livenessResult;

            // Actualizar UI según resultado
            if (isLive) {
              // Si pasó liveness, verificar que el rostro coincida con el empleado
              instructionMessage.textContent = this.translateService.instant(
                'attendance.faceRecognition.verifyingSimilarity',
              );
              instructionMessage.style.backgroundColor = 'rgba(255, 193, 7, 0.8)';
              instructionMessage.style.border = '2px dashed rgba(255, 193, 7, 1)';

              const storedPhotoBase64 = this.getStoredPhotoBase64();
              if (!storedPhotoBase64) {
                this.logger.warn('No hay foto almacenada para comparar');
                this.updateLivenessStatusIndicator(statusIndicator, 'failed');
                updateFaceFrameColor('failed');
                instructionMessage.textContent = this.translateService.instant(
                  'attendance.faceRecognition.noStoredPhoto',
                );
                instructionMessage.style.backgroundColor = 'rgba(220, 53, 69, 0.8)';
                instructionMessage.style.border = '2px dashed rgba(220, 53, 69, 1)';
                return;
              }

              // Optimización crítica: reutilizar el descriptor facial ya calculado
              // durante el análisis de liveness para evitar una segunda inferencia
              // de red neuronal sobre el mismo frame (ahorro de ~150-200ms).
              const currentFrame = framesToAnalyze[framesToAnalyze.length - 1];
              const isMatch = await this.compareFaces(
                storedPhotoBase64,
                currentFrame,
                lastDescriptor,
              );

              if (isMatch) {
                this.updateLivenessStatusIndicator(statusIndicator, 'verified');
                updateFaceFrameColor('verified');
                captureButton.textContent = this.translateService.instant(
                  'attendance.faceRecognition.capture',
                );
                captureButton.disabled = false;
                captureButton.style.backgroundColor = 'var(--primary, #007bff)';
                captureButton.style.cursor = 'pointer';
                instructionMessage.textContent = this.translateService.instant(
                  'attendance.faceRecognition.detected',
                );
                instructionMessage.style.backgroundColor = 'rgba(40, 167, 69, 0.8)';
                instructionMessage.style.border = '2px dashed rgba(40, 167, 69, 1)';
                this.loading.set(false);
                setTimeout(captureFinalPhoto, 300);
                return;
              } else {
                this.updateLivenessStatusIndicator(statusIndicator, 'failed');
                updateFaceFrameColor('failed');
                captureButton.textContent = this.translateService.instant(
                  'attendance.faceRecognition.verifying',
                );
                captureButton.disabled = true;
                captureButton.style.backgroundColor = '#6c757d';
                captureButton.style.cursor = 'not-allowed';
                instructionMessage.textContent = this.translateService.instant(
                  'attendance.faceRecognition.faceNotMatch',
                );
                instructionMessage.style.backgroundColor = 'rgba(220, 53, 69, 0.8)';
                instructionMessage.style.border = '2px dashed rgba(220, 53, 69, 1)';
              }
            } else {
              this.updateLivenessStatusIndicator(statusIndicator, 'failed');
              updateFaceFrameColor('failed');
              captureButton.textContent = this.translateService.instant(
                'attendance.faceRecognition.verifying',
              );
              captureButton.disabled = true;
              captureButton.style.backgroundColor = '#6c757d';
              captureButton.style.cursor = 'not-allowed';
              instructionMessage.textContent = this.translateService.instant(
                'attendance.faceRecognition.faceInstructions',
              );
              instructionMessage.style.backgroundColor = 'rgba(255, 152, 0, 0.8)';
              instructionMessage.style.border = '2px dashed rgba(255, 152, 0, 1)';
            }
          } catch (error) {
            this.logger.warn('Error en verificación de liveness:', error);
            isLive = false;
            updateFaceFrameColor('failed');
          }
        };

        // Iniciar captura continua de frames
        const frameCaptureInterval = setInterval(captureFrame, FRAME_CAPTURE_INTERVAL);

        // Iniciar verificación continua de liveness
        livenessCheckInterval = setInterval(() => {
          void checkLiveness();
        }, LIVENESS_CHECK_INTERVAL);

        // Esperar un momento inicial para llenar el buffer
        //await new Promise<void>((resolve) => setTimeout(resolve, 1500));

        // Esperar a que el usuario cancele
        this.livenessVideo = video;
        this.livenessUI = uiContainer;
        this.livenessStream = stream;
        this.frameCaptureInterval = frameCaptureInterval;
        this.livenessCheckInterval = livenessCheckInterval ?? undefined;
        cancelButton.onclick = (): void => {
          this.closeLivenessFromOutside();
          reject(
            new Error(
              this.translateService.instant('attendance.faceRecognition.captureCancelledError'),
            ),
          );
        };

        // Handler de captura manual: compara el frame actual con la foto de referencia
        // sin requerir que liveness haya pasado primero, pero manteniendo los mismos
        // parámetros de comparación facial (umbral, descriptor, etc.)
        manualCaptureButton.onclick = async (): Promise<void> => {
          if (isCapturing || frameBuffer.length === 0) return;

          manualCaptureButton.disabled = true;
          manualCaptureButton.style.opacity = '0.5';
          manualCaptureButton.style.cursor = 'not-allowed';

          instructionMessage.textContent = this.translateService.instant(
            'attendance.faceRecognition.verifyingSimilarity',
          );
          instructionMessage.style.backgroundColor = 'rgba(255, 193, 7, 0.8)';
          instructionMessage.style.border = '2px dashed rgba(255, 193, 7, 1)';

          try {
            const storedPhotoBase64 = this.getStoredPhotoBase64();
            if (!storedPhotoBase64) {
              instructionMessage.textContent = this.translateService.instant(
                'attendance.faceRecognition.noStoredPhoto',
              );
              instructionMessage.style.backgroundColor = 'rgba(220, 53, 69, 0.8)';
              instructionMessage.style.border = '2px dashed rgba(220, 53, 69, 1)';
              updateFaceFrameColor('failed');
              return;
            }

            // Usar el último frame disponible del buffer para la comparación
            const currentFrame = frameBuffer[frameBuffer.length - 1];
            const isMatch = await this.compareFaces(storedPhotoBase64, currentFrame);

            if (isMatch) {
              updateFaceFrameColor('verified');
              instructionMessage.textContent = this.translateService.instant(
                'attendance.faceRecognition.detected',
              );
              instructionMessage.style.backgroundColor = 'rgba(40, 167, 69, 0.8)';
              instructionMessage.style.border = '2px dashed rgba(40, 167, 69, 1)';
              setTimeout(captureFinalPhoto, 300);
            } else {
              // Cerrar la cámara inmediatamente al obtener el resultado de la verificación
              this.closeLivenessFromOutside();

              // Mostrar modal de alerta para que el usuario acepte antes de reintentar
              this.showErrorModalWithMessage(
                'warning',
                this.translateService.instant('attendance.faceRecognition.verificationFailed'),
                this.translateService.instant('attendance.faceRecognition.faceNotMatchMessage'),
              );

              // Rechazar con marcador especial para evitar un segundo modal en el catch externo
              reject(new Error('MANUAL_CAPTURE_FAILED'));
            }
          } catch (error) {
            this.logger.error('Error en captura manual:', error);
            manualCaptureButton.disabled = false;
            manualCaptureButton.style.opacity = '1';
            manualCaptureButton.style.cursor = 'pointer';
          }
        };
      });
    } catch (error: unknown) {
      const err = error as { name?: string; message?: string };
      if (err.name === 'NotAllowedError') {
        this.logger.warn('Permiso de cámara denegado');
        throw new Error(
          this.translateService.instant('attendance.faceRecognition.cameraAccessError'),
        );
      } else if (err.name === 'NotFoundError') {
        this.logger.warn('Cámara no encontrada');
        throw new Error(this.translateService.instant('attendance.faceRecognition.noCameraFound'));
      } else if (
        err.message?.includes('Captura cancelada') ||
        err.message?.includes('Capture cancelled')
      ) {
        throw error;
      } else {
        this.logger.error('Error al acceder a la cámara:', error);
        throw error;
      }
    }
  }

  private closeLivenessCamera(options: {
    video?: HTMLVideoElement;
    uiContainer?: HTMLDivElement;
    stream?: MediaStream;
    frameCaptureInterval?: ReturnType<typeof setInterval> | null;
    livenessCheckInterval?: ReturnType<typeof setInterval> | null;
  }): void {
    const { stream, frameCaptureInterval, livenessCheckInterval } = options;

    // Detener intervalos
    if (frameCaptureInterval) {
      clearInterval(frameCaptureInterval);
    }

    if (livenessCheckInterval) {
      clearInterval(livenessCheckInterval);
    }

    // Apagar el flash antes de detener la cámara
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        try {
          const capabilities = videoTrack.getCapabilities();
          // @ts-ignore - torch es una propiedad experimental
          if (capabilities.torch) {
            void videoTrack.applyConstraints({
              // @ts-ignore - torch es una propiedad experimental
              advanced: [{ torch: false }],
            });
            this.logger.info('Flash apagado correctamente');
          }
        } catch (error) {
          this.logger.warn('No se pudo apagar el flash:', error);
        }
      }
      stream.getTracks().forEach((track) => track.stop());
    }

    // Remover el contenedor principal de la cámara (que contiene video y UI)
    const cameraContainer = document.getElementById('camera-container');
    if (cameraContainer && document.body.contains(cameraContainer)) {
      document.body.removeChild(cameraContainer);
    }
  }

  public closeLivenessFromOutside(): void {
    this.closeLivenessCamera({
      video: this.livenessVideo,
      uiContainer: this.livenessUI,
      stream: this.livenessStream,
      frameCaptureInterval: this.frameCaptureInterval ?? null,
      livenessCheckInterval: this.livenessCheckInterval ?? null,
    });
    // Rechazar la promesa si estaba activa
    if (this.livenessPromiseReject) {
      this.livenessPromiseReject(new Error('Captura cancelada externamente'));
      this.livenessPromiseReject = undefined;
    }
    // Limpiar referencias
    this.loading.set(false);
    this.starting.set(false);
    this.error.set(null);
    this.success.set(null);
    this.livenessVideo = undefined;
    this.livenessUI = undefined;
    this.livenessStream = undefined;
    this.frameCaptureInterval = undefined;
    this.livenessCheckInterval = undefined;
  }

  /**
   * Actualiza el indicador visual del estado de liveness.
   *
   * @param indicator - Elemento HTML del indicador
   * @param status - Estado actual: 'checking' (verificando), 'verified' (verificado), 'failed' (fallido)
   */
  private updateLivenessStatusIndicator(
    indicator: HTMLDivElement,
    status: 'checking' | 'verified' | 'failed',
  ): void {
    switch (status) {
      case 'checking':
        indicator.textContent = this.translateService.instant(
          'attendance.faceRecognition.checking',
        );
        indicator.style.backgroundColor = 'rgba(255, 193, 7, 0.9)';
        indicator.style.color = '#000';
        indicator.style.border = '2px dashed rgba(255, 193, 7, 1)';
        break;
      case 'verified':
        indicator.textContent = this.translateService.instant(
          'attendance.faceRecognition.personVerified',
        );
        indicator.style.backgroundColor = 'rgba(40, 167, 69, 0.9)';
        indicator.style.color = 'white';
        indicator.style.border = '2px dashed rgba(40, 167, 69, 1)';
        break;
      case 'failed':
        indicator.textContent = this.translateService.instant(
          'attendance.faceRecognition.moveToVerify',
        );
        indicator.style.backgroundColor = 'rgba(220, 53, 69, 0.9)';
        indicator.style.color = 'white';
        indicator.style.border = '2px dashed rgba(220, 53, 69, 1)';
        break;
    }
  }

  /**
   * Maneja el registro de check-out (salida).
   * A diferencia del check-in, no requiere verificación facial, solo ubicación GPS.
   *
   * @throws Error si falla la obtención de ubicación o el registro
   */
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
      const location = await this.getCurrentLocation();

      const success = await this.storeAssistUseCase.execute(
        user.employeeId,
        location.coords.latitude,
        location.coords.longitude,
        location.coords.accuracy ?? 0,
        'check',
      );

      if (success) {
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

  /**
   * Obtiene la ubicación GPS actual del dispositivo.
   * Configurado con alta precisión para validación de zonas autorizadas.
   *
   * @returns Promesa con la posición geográfica actual
   * @throws Error si el permiso es denegado, la ubicación no está disponible o hay timeout
   */
  private getCurrentLocation(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!isPlatformBrowser(this.platformId)) {
        reject(
          new Error(
            this.translateService.instant('attendance.faceRecognition.locationUnavailable'),
          ),
        );
        return;
      }

      if (typeof navigator.geolocation === 'undefined') {
        reject(
          new Error(
            this.translateService.instant('attendance.faceRecognition.locationUnavailable'),
          ),
        );
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve(position);
        },
        (error) => {
          let errorMessage = this.translateService.instant('attendance.locationError');

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = this.translateService.instant(
                'attendance.faceRecognition.locationPermissionDenied',
              );
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = this.translateService.instant(
                'attendance.faceRecognition.locationUnavailable',
              );
              break;
            case error.TIMEOUT:
              errorMessage = this.translateService.instant(
                'attendance.faceRecognition.locationTimeout',
              );
              break;
            default:
              errorMessage = this.translateService.instant(
                'attendance.faceRecognition.locationUnknownError',
              );
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

  /**
   * Navega al día anterior y recarga la asistencia.
   */
  previousDay(): void {
    const date = new Date(this.selectedDate());
    date.setDate(date.getDate() - 1);
    this.selectedDate.set(date);
    void this.loadAttendance();
  }

  /**
   * Navega al día siguiente y recarga la asistencia.
   * No permite navegar a fechas futuras.
   */
  nextDay(): void {
    if (!this.canNavigateForward()) return;
    const date = new Date(this.selectedDate());
    date.setDate(date.getDate() + 1);
    this.selectedDate.set(date);
    void this.loadAttendance();
  }

  /**
   * Navega un mes hacia atrás y recarga la asistencia.
   */
  previousMonth(): void {
    const date = new Date(this.selectedDate());
    date.setMonth(date.getMonth() - 1);
    this.selectedDate.set(date);
    void this.loadAttendance();
  }

  /**
   * Navega un mes hacia adelante y recarga la asistencia.
   * No permite navegar a fechas futuras, limitando al día actual como máximo.
   */
  nextMonth(): void {
    if (!this.canNavigateForward()) return;
    const date = new Date(this.selectedDate());
    date.setMonth(date.getMonth() + 1);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Si la fecha resultante es mayor o igual a hoy, usar hoy como límite
    if (date >= today) {
      this.selectedDate.set(new Date(today));
    } else {
      this.selectedDate.set(date);
    }
    void this.loadAttendance();
  }

  /**
   * Obtiene la clase CSS correspondiente al estado de asistencia.
   * Normaliza diferentes variaciones del mismo estado para aplicar el estilo correcto.
   *
   * Estados soportados:
   * - ONTIME / on-time / on time / on_time → 'status-ontime' (verde)
   * - delay / late / retraso → 'status-delay' (amarillo)
   * - fault / falta → 'status-fault' (rojo)
   *
   * @param status - Estado de asistencia a clasificar
   * @returns Clase CSS correspondiente o cadena vacía si no aplica
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
   * Obtiene el color CSS correspondiente al estado de asistencia.
   * Utiliza variables CSS del sistema de diseño para consistencia visual.
   *
   * @param status - Estado de asistencia
   * @param defaultColor - Color por defecto si no se reconoce el estado
   * @returns Variable CSS del color correspondiente
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
   * Abre el drawer del selector de fecha.
   * Usa setTimeout para asegurar que el componente esté renderizado antes de abrirlo.
   */
  openDatePicker(): void {
    this.showDatePicker = true;
    setTimeout(() => {
      this.datePickerDrawer?.open();
    }, 0);
  }

  /**
   * Maneja la selección de fecha desde el drawer del calendario.
   * Actualiza la fecha seleccionada y recarga los datos de asistencia.
   *
   * @param date - Nueva fecha seleccionada
   */
  onDatePickerDateSelected(date: Date): void {
    this.selectedDate.set(date);
    void this.loadAttendance();
  }

  /**
   * Abre el drawer que muestra las excepciones de asistencia del día.
   */
  openExceptionsDrawer(): void {
    this.showExceptionsDrawer = true;
  }

  /**
   * Abre el drawer que muestra los registros de entrada/salida del día.
   */
  openRecordsDrawer(): void {
    this.showRecordsDrawer = true;
  }

  /**
   * Obtiene la lista de excepciones de asistencia para el día actual.
   *
   * @returns Array de excepciones o array vacío si no hay
   */
  getExceptions(): IException[] {
    return this.attendance()?.exceptions ?? [];
  }

  /**
   * Obtiene la lista de registros de asistencia (check-in/check-out) del día actual.
   *
   * @returns Array de registros o array vacío si no hay
   */
  getRecords(): IAssistance[] {
    return this.attendance()?.assistFlatList ?? [];
  }

  /**
   * Maneja la selección de fecha desde el calendario semanal.
   * Actualiza la fecha seleccionada y recarga los datos de asistencia.
   *
   * @param date - Nueva fecha seleccionada
   */
  onWeekCalendarDateSelected(date: Date): void {
    this.selectedDate.set(date);
    void this.loadAttendance();
  }

  /**
   * Descarga una imagen desde una URL y la guarda en formato base64 cifrado.
   * El almacenamiento cifrado protege los datos biométricos del empleado.
   *
   * @param imageUrl - URL de la imagen a descargar y convertir
   * @throws Error si falla la descarga o conversión de la imagen
   */
  private async savePhotoAsBase64(imageUrl: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      // Convertir la URL a base64
      const base64Image = await this.urlToBase64(imageUrl);

      // Guardar en localStorage cifrado para que persista entre sesiones.
      // Esto permite comparar el updatedAt en futuras aperturas de la app
      // y evitar re-descargar la foto si no cambió en el servidor.
      this.secureStorage.setEncryptedLocalItem(
        this.EMPLOYEE_BIOMETRIC_FACE_ID_PHOTO_KEY,
        base64Image,
      );
    } catch (error) {
      this.logger.error('Error al convertir y guardar la imagen en base64: o', error);
      throw error;
    }
  }

  /**
   * Convierte una URL de imagen a base64 usando fetch con CORS.
   * Método principal de descarga, con fallback a Image+canvas si falla por CORS.
   *
   * @param url - URL de la imagen a convertir
   * @returns Promesa con la imagen en formato base64 (data URL)
   * @throws Error si falla la descarga o conversión
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
   * Método alternativo para convertir URL a base64 usando Image y canvas.
   * Se usa como fallback cuando fetch falla por restricciones CORS.
   * Requiere que el servidor permita crossOrigin='anonymous'.
   *
   * @param url - URL de la imagen a convertir
   * @returns Promesa con la imagen en formato base64 (data URL)
   * @throws Error si falla la carga o conversión de la imagen
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
   * Obtiene la foto biométrica del empleado almacenada localmente.
   * Los datos se leen desde localStorage cifrado para proteger la información biométrica.
   *
   * @returns Imagen en formato base64 o null si no existe
   */
  getStoredPhotoBase64(): string | null {
    return this.secureStorage.getEncryptedLocalItem(this.EMPLOYEE_BIOMETRIC_FACE_ID_PHOTO_KEY);
  }

  /**
   * Elimina la foto biométrica almacenada y su marca de versión.
   * Útil para forzar una re-descarga desde el servidor en caso de actualización.
   */
  removeStoredPhoto(): void {
    this.secureStorage.removeEncryptedLocalItem(this.EMPLOYEE_BIOMETRIC_FACE_ID_PHOTO_KEY);
    this.secureStorage.removeItem(this.EMPLOYEE_BIOMETRIC_FACE_ID_UPDATED_AT_KEY);
  }

  /**
   * Carga los modelos de redes neuronales de face-api.js necesarios para el reconocimiento facial.
   *
   * Modelos cargados:
   * - tinyFaceDetector: Detección rápida de rostros (modelo ligero)
   * - faceLandmark68Net: Detección de 68 puntos faciales (ojos, nariz, boca, contorno)
   * - faceRecognitionNet: Generación de descriptores faciales (embeddings de 128 dimensiones)
   *
   * Los modelos se cargan desde FACE_API_MODELS_URL configurado en environment.
   * En desarrollo: GitHub CDN, en producción: assets locales.
   *
   * @throws Error si algún modelo no se puede cargar
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
   * Compara dos rostros para verificar si pertenecen a la misma persona.
   * Utiliza descriptores faciales (embeddings de 128 dimensiones) y distancia euclidiana.
   *
   * Proceso:
   * 1. Obtiene descriptores faciales de ambas imágenes (o reutiliza el caché)
   * 2. Calcula la distancia euclidiana entre los descriptores
   * 3. Convierte la distancia a similitud (0-1, donde 1 es idéntico)
   * 4. Compara con el umbral FACE_MATCH_THRESHOLD (0.51 = 51% mínimo)
   *
   * @param storedPhotoBase64 - Foto biométrica almacenada del empleado en base64
   * @param capturedPhotoBase64 - Foto capturada en tiempo real en base64
   * @param capturedDescriptorCache - Descriptor precalculado (optimización para evitar re-cálculo)
   * @returns true si los rostros coinciden según el umbral, false en caso contrario
   * @throws Error si falla la detección o comparación de rostros
   */
  private async compareFaces(
    storedPhotoBase64: string,
    capturedPhotoBase64: string,
    capturedDescriptorCache?: Float32Array | null,
  ): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) {
      throw new Error('La comparación facial solo está disponible en el navegador');
    }

    try {
      // Optimización: ejecutar en paralelo la obtención de descriptores.
      // Si ya se calculó el descriptor del frame capturado durante el análisis de liveness,
      // se reutiliza para evitar una inferencia de red neuronal redundante (~150-200ms ahorrados).
      const storedImg = await this.base64ToImage(storedPhotoBase64);
      const [storedDescriptor, capturedDescriptor] = await Promise.all([
        this.getFaceDescriptor(storedImg),
        capturedDescriptorCache
          ? Promise.resolve(capturedDescriptorCache)
          : this.base64ToImage(capturedPhotoBase64).then((img) => this.getFaceDescriptor(img)),
      ]);

      if (!storedDescriptor || !capturedDescriptor) {
        this.logger.warn('No se detectó un rostro en una o ambas imágenes');
        return false;
      }

      // Cálculo de similitud facial:
      // 1. Distancia euclidiana entre vectores de 128 dimensiones (menor = más similar)
      // 2. Conversión a similitud normalizada: similarity = 1 - min(distance, 1)
      // 3. Comparación con umbral: similarity >= 0.51 (51% de similitud mínima)
      const distance = faceapi.euclideanDistance(storedDescriptor, capturedDescriptor);
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
   * Convierte una imagen en formato base64 a un elemento HTMLImageElement.
   * Necesario para procesar la imagen con face-api.js.
   *
   * @param base64 - Imagen en formato base64 (data URL)
   * @returns Promesa que se resuelve con el elemento de imagen cargado
   * @throws Error si falla la carga de la imagen
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
   * Extrae el descriptor facial (embedding de 128 dimensiones) de una imagen.
   * Este descriptor es una representación numérica única del rostro que permite
   * comparaciones precisas entre diferentes fotos de la misma persona.
   *
   * Configuración optimizada:
   * - inputSize: 224 (balance entre precisión y velocidad)
   * - scoreThreshold: 0.4 (umbral de confianza para detección)
   *
   * @param img - Elemento de imagen HTML a analizar
   * @returns Descriptor facial (Float32Array de 128 dimensiones) o null si no se detecta rostro
   */
  private async getFaceDescriptor(img: HTMLImageElement): Promise<Float32Array | null> {
    try {
      const detection = await faceapi
        .detectSingleFace(
          img,
          new faceapi.TinyFaceDetectorOptions({
            // inputSize 320 detecta rostros más alejados o menos centrados (mejor para Android)
            inputSize: 320,
            scoreThreshold: this.FACE_SCORE_THRESHOLD,
          }),
        )
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
   * Calcula el Eye Aspect Ratio (EAR) - métrica para detectar parpadeos.
   *
   * Fórmula: EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)
   * Donde p1-p6 son los 6 landmarks del ojo en orden específico.
   *
   * Interpretación de valores:
   * - 0.15-0.20: Ojo cerrado o parpadeando
   * - 0.25-0.35: Ojo abierto normalmente
   * - Constante entre frames: Foto estática (no parpadea)
   * - Variable entre frames: Persona real (parpadeo natural)
   *
   * Técnica anti-spoofing: Una foto impresa o en pantalla nunca parpadea,
   * por lo que el EAR permanece constante. Una persona real tiene variación natural.
   *
   * @param pts - 6 puntos faciales del ojo: [esquina izq, sup-izq, sup-der, esquina der, inf-der, inf-izq]
   * @returns Valor EAR normalizado (típicamente entre 0.15 y 0.35)
   */
  private calcularEAR(pts: { x: number; y: number }[]): number {
    if (pts.length < 6) return 0;
    const dist = (a: { x: number; y: number }, b: { x: number; y: number }): number =>
      Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
    const vertical1 = dist(pts[1], pts[5]);
    const vertical2 = dist(pts[2], pts[4]);
    const horizontal = dist(pts[0], pts[3]);
    if (horizontal === 0) return 0;
    return (vertical1 + vertical2) / (2.0 * horizontal);
  }

  /**
   * Calcula la varianza de gradientes de Sobel para detectar textura de piel real.
   *
   * Fundamento científico:
   * - Piel real: Alta varianza de gradientes por micro-texturas (poros, vello, imperfecciones)
   * - Foto impresa/pantalla: Gradientes uniformes y suaves, varianza baja
   *
   * Proceso:
   * 1. Convierte región del rostro a escala de grises (BT.601)
   * 2. Aplica operador de Sobel para detectar bordes (gradientes)
   * 3. Calcula varianza de las magnitudes de gradiente
   * 4. Mayor varianza = más textura = más probable que sea piel real
   *
   * Optimizaciones:
   * - Muestreo cada 2 píxeles (4x menos iteraciones, sin pérdida de precisión)
   * - Área máxima 80×80px para mantener O(1) en tiempo
   *
   * @param imageData - Datos de píxeles del canvas en formato RGBA
   * @param canvasWidth - Ancho total del canvas en píxeles
   * @param box - Bounding box del rostro detectado
   * @returns Varianza de gradientes (mayor = más textura = más probable piel real)
   */
  private calcularVarianzaGradiente(
    imageData: Uint8ClampedArray,
    canvasWidth: number,
    box: { x: number; y: number; width: number; height: number },
  ): number {
    const x0 = Math.max(0, Math.floor(box.x));
    const y0 = Math.max(0, Math.floor(box.y));

    // Limitar área de análisis a 80×80px para mantener rendimiento constante O(1)
    const w = Math.min(Math.floor(box.width), 80);
    const h = Math.min(Math.floor(box.height), 80);

    if (w < 10 || h < 10) return 0;

    // Muestreo optimizado: analizar cada 2 píxeles reduce 4x las iteraciones
    // sin pérdida significativa de precisión estadística.
    // Conversión a escala de grises usando fórmula BT.601: Y = 0.299R + 0.587G + 0.114B
    const STEP = 2;
    const cols = Math.floor(w / STEP);
    const rows = Math.floor(h / STEP);
    const gray = new Float32Array(cols * rows);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const srcRow = y0 + r * STEP;
        const srcCol = x0 + c * STEP;
        const idx = (srcRow * canvasWidth + srcCol) * 4;
        gray[r * cols + c] =
          0.299 * imageData[idx] + 0.587 * imageData[idx + 1] + 0.114 * imageData[idx + 2];
      }
    }

    // Aplicar operador de Sobel para detectar bordes (cambios de intensidad).
    // Sobel calcula gradientes en X (horizontal) y Y (vertical) usando convolución 3×3.
    // La magnitud del gradiente indica qué tan abrupto es el cambio de intensidad.
    let sumG = 0;
    let sumG2 = 0;
    let count = 0;

    for (let r = 1; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) {
        const i = r * cols + c;
        // Kernel Sobel X: detecta bordes verticales
        const gx =
          -gray[i - cols - 1] +
          gray[i - cols + 1] -
          2 * gray[i - 1] +
          2 * gray[i + 1] -
          gray[i + cols - 1] +
          gray[i + cols + 1];
        // Kernel Sobel Y: detecta bordes horizontales
        const gy =
          -gray[i - cols - 1] -
          2 * gray[i - cols] -
          gray[i - cols + 1] +
          gray[i + cols - 1] +
          2 * gray[i + cols] +
          gray[i + cols + 1];
        const mag = Math.sqrt(gx * gx + gy * gy);
        sumG += mag;
        sumG2 += mag * mag;
        count++;
      }
    }

    if (count === 0) return 0;

    // Cálculo de varianza en un solo pase: Var(X) = E[X²] - E[X]²
    const mean = sumG / count;
    return sumG2 / count - mean * mean;
  }

  /**
   * Detecta si el sujeto en el video es una persona real mediante análisis multi-criterio.
   *
   * Técnicas anti-spoofing implementadas:
   *
   * 1. **Análisis de movimiento natural**:
   *    - Detecta movimiento del rostro entre frames
   *    - Valida que el movimiento sea consistente pero no rígido
   *    - Fotos movidas tienen movimiento 100% rígido (todos los puntos se mueven igual)
   *
   * 2. **Micro-expresiones faciales**:
   *    - Analiza variación en landmarks (68 puntos faciales)
   *    - Personas reales tienen micro-movimientos naturales
   *    - Fotos tienen variación de landmarks baja y uniforme
   *
   * 3. **Eye Aspect Ratio (EAR)**:
   *    - Detecta parpadeos naturales
   *    - Fotos nunca parpadean (EAR constante)
   *    - Personas reales tienen variación natural de EAR
   *
   * 4. **Análisis de textura (Gradientes de Sobel)**:
   *    - Piel real tiene alta varianza de gradientes (poros, vello, imperfecciones)
   *    - Fotos/pantallas tienen gradientes uniformes
   *
   * Optimización: Retorna el descriptor facial del último frame para reutilizarlo
   * en la comparación facial, evitando una inferencia de red neuronal redundante.
   *
   * @param frames - Array de frames capturados del video en formato base64
   * @returns Objeto con isLive (true si es persona real) y lastDescriptor (para optimización)
   */
  private async detectLivenessFromFrames(
    frames: string[],
  ): Promise<{ isLive: boolean; lastDescriptor: Float32Array | null }> {
    if (!isPlatformBrowser(this.platformId)) {
      return { isLive: true, lastDescriptor: null };
    }

    if (frames.length < 2) {
      this.logger.warn('No hay suficientes frames para analizar liveness');
      return { isLive: false, lastDescriptor: null };
    }

    try {
      // Convertir todos los frames a imágenes
      const images = await Promise.all(frames.map((frame) => this.base64ToImage(frame)));

      const lastImage = images[images.length - 1];

      // Optimización crítica de rendimiento: ejecutar análisis en paralelo
      // 1. Detecciones de liveness: inputSize 160 (~40% más rápido que 224)
      //    - Suficiente precisión para detectar landmarks y movimiento
      // 2. Descriptor del último frame: inputSize 224 (mayor precisión)
      //    - Necesario para comparación facial precisa
      // Resultado: el descriptor no añade tiempo secuencial, se calcula en paralelo
      const [faceDetections, lastDescriptor] = await Promise.all([
        Promise.all(
          images.map((img) =>
            faceapi
              .detectSingleFace(
                img,
                new faceapi.TinyFaceDetectorOptions({
                  // inputSize 160 es suficiente para liveness y mantiene buen rendimiento en Android
                  inputSize: 160,
                  scoreThreshold: this.FACE_SCORE_THRESHOLD,
                }),
              )
              .withFaceLandmarks(),
          ),
        ) as Promise<(IFaceDetectionWithLandmarks | undefined)[]>,
        this.getFaceDescriptor(lastImage),
      ]);

      // Si algún frame no tiene rostro, rechazar
      if (faceDetections.some((detection: IFaceDetectionWithLandmarks | undefined) => !detection)) {
        this.logger.warn('No se detectó rostro en todos los frames');
        return { isLive: false, lastDescriptor: null };
      }

      // ── Análisis 1: Movimiento del rostro ─────────────────────────────────────
      // Extrae las posiciones del bounding box del rostro en cada frame
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

      // Calcula el movimiento normalizado entre frames consecutivos
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

      // ── Análisis 2: Consistencia direccional del movimiento ───────────────────
      // Movimiento real de persona tiene dirección consistente.
      // Ruido de captura o foto movida tiene direcciones aleatorias.
      let consistentDirection = 0;
      if (movementDirections.length >= 2) {
        for (let i = 1; i < movementDirections.length; i++) {
          const prev = movementDirections[i - 1];
          const curr = movementDirections[i];

          // Calcular producto punto normalizado (coseno del ángulo)
          const prevMagnitude = Math.sqrt(prev.dx * prev.dx + prev.dy * prev.dy);
          const currMagnitude = Math.sqrt(curr.dx * curr.dx + curr.dy * curr.dy);

          if (prevMagnitude > 0 && currMagnitude > 0) {
            // Producto punto normalizado = coseno del ángulo entre vectores
            const dotProduct =
              (prev.dx * curr.dx + prev.dy * curr.dy) / (prevMagnitude * currMagnitude);
            // coseno > 0.5 significa ángulo < 60°, movimientos en dirección similar
            if (dotProduct > 0.5) {
              consistentDirection++;
            }
          }
        }
      }

      const consistencyRatio =
        movementDirections.length > 1 ? consistentDirection / (movementDirections.length - 1) : 0;

      // ── Análisis 3: Variación de landmarks y rigidez de movimiento ────────────
      // Landmarks: 68 puntos faciales (ojos, nariz, boca, contorno)
      // Persona real: landmarks se mueven de forma independiente (micro-expresiones)
      // Foto movida: todos los landmarks se mueven exactamente igual (rígido)
      let landmarkVariation = 0;
      let rigidityScore = 0;

      if (faceDetections.every((d) => d?.landmarks)) {
        const landmarkMovementVariances: number[] = [];

        for (let i = 1; i < faceDetections.length; i++) {
          const prev = faceDetections[i - 1];
          const curr = faceDetections[i];

          if (prev && curr && prev.landmarks && curr.landmarks) {
            const prevPositions = prev.landmarks.positions;
            const currPositions = curr.landmarks.positions;

            if (prevPositions.length === currPositions.length) {
              const landmarkDistances: number[] = [];
              let totalLandmarkDistance = 0;

              for (let j = 0; j < prevPositions.length; j++) {
                const dx = currPositions[j].x - prevPositions[j].x;
                const dy = currPositions[j].y - prevPositions[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                landmarkDistances.push(dist);
                totalLandmarkDistance += dist;
              }

              const avgLandmarkDistance = totalLandmarkDistance / prevPositions.length;

              // Cálculo de varianza de distancias de landmarks:
              // - Foto: todos los landmarks se mueven exactamente igual → varianza baja
              // - Persona: micro-expresiones causan movimientos independientes → varianza alta
              const landmarkDistanceVariance =
                landmarkDistances.reduce(
                  (sum, dist) => sum + Math.pow(dist - avgLandmarkDistance, 2),
                  0,
                ) / landmarkDistances.length;
              const landmarkDistanceStdDev = Math.sqrt(landmarkDistanceVariance);

              // Coeficiente de variación (CV = stdDev / mean):
              // - CV < 0.3: Movimiento rígido (foto)
              // - CV > 0.5: Movimiento flexible (persona real)
              if (avgLandmarkDistance > 0) {
                landmarkMovementVariances.push(landmarkDistanceStdDev / avgLandmarkDistance);
              }

              // Normalizar por el tamaño del rostro
              const box = prev.detection.box;
              const faceSize = Math.sqrt(box.width * box.height);
              landmarkVariation += avgLandmarkDistance / faceSize;
            }
          }
        }
        landmarkVariation = landmarkVariation / (faceDetections.length - 1);

        // Puntuación de rigidez basada en coeficiente de variación promedio
        if (landmarkMovementVariances.length > 0) {
          const avgLandmarkVariance =
            landmarkMovementVariances.reduce((a, b) => a + b, 0) / landmarkMovementVariances.length;
          rigidityScore = avgLandmarkVariance;
        }
      }

      // ── Análisis 4: Variación de tamaño del rostro ────────────────────────────
      // Detecta acercamiento/alejamiento natural de la cámara
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

      // ── Análisis 5: Eye Aspect Ratio (EAR) - Detección de parpadeo ────────────
      // Modelo de 68 puntos faciales:
      // - Ojo izquierdo: puntos 36-41
      // - Ojo derecho: puntos 42-47
      //
      // Comportamiento esperado:
      // - Foto: EAR constante (nunca parpadea)
      // - Persona real: EAR varía naturalmente (micro-movimientos, parpadeos)
      let earVariation = 0;
      let blinkDetected = false;
      const earValues: number[] = [];

      if (faceDetections.every((d) => d?.landmarks)) {
        for (const detection of faceDetections) {
          if (detection && detection.landmarks?.positions?.length >= 48) {
            const pts = detection.landmarks.positions;
            const leftEAR = this.calcularEAR([
              pts[36],
              pts[37],
              pts[38],
              pts[39],
              pts[40],
              pts[41],
            ]);
            const rightEAR = this.calcularEAR([
              pts[42],
              pts[43],
              pts[44],
              pts[45],
              pts[46],
              pts[47],
            ]);
            earValues.push((leftEAR + rightEAR) / 2);
          }
        }

        if (earValues.length >= 2) {
          const earMean = earValues.reduce((a, b) => a + b, 0) / earValues.length;
          earVariation =
            Math.sqrt(
              earValues.reduce((sum, v) => sum + Math.pow(v - earMean, 2), 0) / earValues.length,
            ) / Math.max(earMean, 0.001);

          // Parpadeo detectado si algún frame tiene EAR < umbral (0.21)
          blinkDetected = earValues.some((v) => v < this.EAR_BLINK_THRESHOLD);
        }
      }

      // ── Análisis 6: Textura de piel (Gradientes de Sobel) ─────────────────────
      // Analiza la textura del rostro en el último frame para distinguir:
      // - Piel real: alta varianza de gradientes (poros, vello, imperfecciones)
      // - Foto impresa/pantalla: gradientes uniformes, varianza baja
      let textureVariance = 0;
      const lastDetection = faceDetections[faceDetections.length - 1];

      if (lastDetection) {
        try {
          const offscreen = document.createElement('canvas');
          offscreen.width = lastImage.naturalWidth || lastImage.width;
          offscreen.height = lastImage.naturalHeight || lastImage.height;
          const ctx = offscreen.getContext('2d');
          if (ctx) {
            ctx.drawImage(lastImage, 0, 0);
            const box = lastDetection.detection.box;
            const pixelData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
            textureVariance = this.calcularVarianzaGradiente(pixelData.data, offscreen.width, box);
          }
        } catch {
          // Si falla el análisis de textura, no bloquear al usuario
          textureVariance = this.TEXTURE_GRADIENT_THRESHOLD + 1;
        }
      }

      const hasRealTexture = textureVariance >= this.TEXTURE_GRADIENT_THRESHOLD;

      // ── Evaluación final de liveness ──────────────────────────────────────────
      // Umbrales ajustados para mayor permisividad en Android PWA donde los movimientos
      // naturales son más sutiles debido a variaciones de estabilización de cámara.

      // 1. Movimiento de landmarks debe ser natural pero no excesivo
      // Umbral mínimo reducido de 0.002 a 0.001 para capturar micro-movimientos en Android
      const hasNaturalLandmarkVariation = landmarkVariation > 0.001 && landmarkVariation < 0.2;

      // 2. Movimiento del rostro debe estar en rango razonable
      // Umbral mínimo reducido de 0.005 a 0.003 para detectar menor movimiento en Android
      const hasReasonableMovement = averageMovement > 0.003 && averageMovement < 0.18;

      // 3. Variación de tamaño no debe ser excesiva (evita movimientos bruscos)
      const hasReasonableSizeVariation = averageSizeVariation < 0.25;

      // 4. Movimiento debe ser flexible, no rígido
      // Umbral reducido de 0.2 a 0.1 para tolerar menor variación de micro-expresiones en Android
      const hasFlexibleMovement = rigidityScore > 0.1;

      // 5. EAR: debe haber variación natural O parpadeo detectado
      // Umbral reducido de 0.03 a 0.02 para detectar variaciones menores de ojo en Android
      const hasNaturalEAR = earVariation > 0.02 || blinkDetected;

      // Criterios combinados
      const hasSignificantMovement = hasReasonableMovement && hasReasonableSizeVariation;
      const hasNaturalMovement =
        hasNaturalLandmarkVariation && hasFlexibleMovement && consistencyRatio < 0.95;

      // Anti-spoofing: textura y EAR son señales adicionales.
      // Si los datos no están disponibles (earValues vacío, textureVariance=0),
      // no penalizamos para evitar falsos negativos con usuarios legítimos.
      const antiSpoofingPass =
        (earValues.length === 0 || hasNaturalEAR) && (textureVariance === 0 || hasRealTexture);

      // Decisión final: debe cumplir todos los criterios
      const isLive = hasSignificantMovement && hasNaturalMovement && antiSpoofingPass;

      this.logger.info(
        `Liveness check: averageMovement=${averageMovement.toFixed(4)}, averageSizeVariation=${averageSizeVariation.toFixed(4)}, consistencyRatio=${consistencyRatio.toFixed(4)}, landmarkVariation=${landmarkVariation.toFixed(4)}, rigidityScore=${rigidityScore.toFixed(4)}, earVariation=${earVariation.toFixed(4)}, blinkDetected=${blinkDetected}, textureVariance=${textureVariance.toFixed(1)}, hasRealTexture=${hasRealTexture}, isLive=${isLive}`,
      );

      if (!isLive) {
        this.logger.warn(
          `Liveness falló: hasSignificantMovement=${hasSignificantMovement}, hasNaturalMovement=${hasNaturalMovement}, antiSpoofingPass=${antiSpoofingPass}, rigidityScore=${rigidityScore.toFixed(4)}, hasFlexibleMovement=${hasFlexibleMovement}, hasNaturalEAR=${hasNaturalEAR}, hasRealTexture=${hasRealTexture}. ${!antiSpoofingPass ? 'Anti-spoofing detectó posible foto/pantalla.' : rigidityScore < 0.4 ? 'Movimiento rígido detectado (posible foto).' : 'Movimiento insuficiente o no natural.'}`,
        );
      }

      return { isLive, lastDescriptor };
    } catch (error) {
      this.logger.error('Error en detección de liveness desde frames:', error);
      // En caso de error, ser permisivo para no bloquear usuarios legítimos
      return { isLive: true, lastDescriptor: null };
    }
  }

  /**
   * Muestra un modal de notificación al usuario.
   * Soporta diferentes tipos: 'error', 'warning', 'info', 'success'.
   *
   * @param type - Tipo de modal que determina el icono y color
   * @param title - Título del modal
   * @param message - Mensaje descriptivo a mostrar
   */
  private showErrorModalWithMessage(type: ErrorModalType, title: string, message: string): void {
    this.errorModalType.set(type);
    this.errorModalTitle.set(title);
    this.errorModalMessage.set(message);
    this.showErrorModal.set(true);
  }

  /**
   * Verifica si el empleado puede registrar asistencia desde su ubicación actual.
   *
   * Flujo de validación:
   * 1. Verifica si tiene autorización para cualquier zona (bypass de validación)
   * 2. Obtiene la ubicación GPS actual del dispositivo
   * 3. Consulta las zonas geográficas asignadas al empleado
   * 4. Valida si está dentro del polígono de alguna zona autorizada
   * 5. Si está fuera, calcula la distancia a la zona más cercana para informar al usuario
   *
   * @returns true si puede registrar asistencia desde su ubicación, false en caso contrario
   */
  private async canCheckInZone(): Promise<boolean> {
    const employeeId = this.authPort.getCurrentUser()?.employeeId;
    if (typeof employeeId !== 'number') {
      return false;
    }

    // Si tiene permiso para cualquier zona, no se valida ubicación
    const authorizeAnyZone = await this.getAuthorizeAnyZoneUseCase.execute(employeeId);
    if (authorizeAnyZone) {
      return true;
    }

    // Obtener ubicación actual
    let position: GeolocationPosition;
    try {
      position = await this.getCurrentLocation();
    } catch {
      this.showErrorModalWithMessage(
        'error',
        this.translateService.instant('attendance.locationMessages.errorTitle'),
        this.translateService.instant('attendance.faceRecognition.locationUnavailable'),
      );
      return false;
    }

    // Obtener zonas asignadas al empleado
    const zones = await this.getZoneCoordinatesUseCase.execute(employeeId);

    if (!zones || zones.length === 0) {
      this.showErrorModalWithMessage(
        'error',
        this.translateService.instant('attendance.locationMessages.errorTitle'),
        this.translateService.instant('attendance.locationMessages.noZonesAssigned'),
      );
      return false;
    }

    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    // Validación geográfica: verifica si el punto GPS está dentro de algún polígono autorizado
    const isInsideAnyZone = zones.some((zone) => this.isPointInPolygon(lat, lng, zone));

    if (!isInsideAnyZone) {
      // Feedback útil: calcula la distancia a la zona más cercana para orientar al usuario
      const metersToNearestZone = Math.min(
        ...zones.map((zone) => this.distanceToPolygonMeters(lat, lng, zone)),
      );
      const distanceText =
        metersToNearestZone < 1000
          ? `${Math.round(metersToNearestZone)} m`
          : `${(metersToNearestZone / 1000).toFixed(2)} km`;

      this.showErrorModalWithMessage(
        'warning',
        this.translateService.instant('attendance.locationMessages.outsideZoneTitle'),
        this.translateService.instant('attendance.locationMessages.outsideZoneMessage', {
          distance: distanceText,
        }),
      );
      return false;
    }

    return true;
  }

  /**
   * Determina si un punto GPS está dentro de un polígono usando Ray Casting.
   *
   * Algoritmo Ray Casting:
   * Traza un rayo desde el punto hacia el infinito y cuenta cuántas veces
   * intersecta con los bordes del polígono. Si el número de intersecciones
   * es impar, el punto está dentro; si es par, está fuera.
   *
   * Importante: Las coordenadas del polígono deben estar en formato GeoJSON:
   * [longitud, latitud] (no [latitud, longitud]).
   *
   * @param lat - Latitud del punto a validar
   * @param lng - Longitud del punto a validar
   * @param polygon - Array de coordenadas en formato GeoJSON [longitud, latitud]
   * @returns true si el punto está dentro del polígono, false si está fuera
   */
  private isPointInPolygon(lat: number, lng: number, polygon: number[][]): boolean {
    let inside = false;
    const n = polygon.length;

    // Itera sobre cada arista del polígono
    for (let i = 0, j = n - 1; i < n; j = i++) {
      // Extrae coordenadas en formato GeoJSON: [0] = longitud, [1] = latitud
      const iLat = polygon[i]?.[1] ?? 0;
      const iLng = polygon[i]?.[0] ?? 0;
      const jLat = polygon[j]?.[1] ?? 0;
      const jLng = polygon[j]?.[0] ?? 0;

      // Verifica si el rayo horizontal desde el punto intersecta con esta arista
      const intersects =
        iLng > lng !== jLng > lng && lat < ((jLat - iLat) * (lng - iLng)) / (jLng - iLng) + iLat;

      // Cada intersección invierte el estado (dentro/fuera)
      if (intersects) inside = !inside;
    }

    return inside;
  }

  /**
   * Calcula la distancia en metros entre dos puntos GPS usando la fórmula de Haversine.
   *
   * La fórmula de Haversine calcula la distancia de gran círculo entre dos puntos
   * en la superficie de una esfera, considerando la curvatura de la Tierra.
   * Es precisa para distancias cortas y medianas (hasta ~1000 km).
   *
   * Radio de la Tierra usado: 6,371,000 metros (promedio)
   *
   * @param lat1 - Latitud del primer punto en grados
   * @param lng1 - Longitud del primer punto en grados
   * @param lat2 - Latitud del segundo punto en grados
   * @param lng2 - Longitud del segundo punto en grados
   * @returns Distancia en metros entre los dos puntos
   */
  private haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const EARTH_RADIUS_M = 6_371_000;
    const toRad = (deg: number): number => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

    return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
  }

  /**
   * Calcula la distancia mínima desde un punto GPS hasta el borde más cercano de un polígono.
   *
   * Algoritmo:
   * 1. Itera sobre cada arista del polígono
   * 2. Proyecta el punto sobre cada segmento (encuentra el punto más cercano en la arista)
   * 3. Calcula la distancia usando Haversine
   * 4. Retorna la distancia mínima encontrada
   *
   * Útil para informar al usuario qué tan lejos está de una zona autorizada.
   *
   * @param lat - Latitud del punto
   * @param lng - Longitud del punto
   * @param polygon - Array de coordenadas en formato GeoJSON [longitud, latitud]
   * @returns Distancia mínima en metros al borde del polígono
   */
  private distanceToPolygonMeters(lat: number, lng: number, polygon: number[][]): number {
    let minDistance = Infinity;
    const n = polygon.length;

    for (let i = 0, j = n - 1; i < n; j = i++) {
      // Extrae puntos A y B del segmento en formato GeoJSON
      const aLat = polygon[i]?.[1] ?? 0;
      const aLng = polygon[i]?.[0] ?? 0;
      const bLat = polygon[j]?.[1] ?? 0;
      const bLng = polygon[j]?.[0] ?? 0;

      // Proyección ortogonal del punto P sobre el segmento [A, B]
      // Aproximación en espacio plano (válida para distancias cortas < 100km)
      const abLat = bLat - aLat;
      const abLng = bLng - aLng;
      const apLat = lat - aLat;
      const apLng = lng - aLng;

      const abLenSq = abLat ** 2 + abLng ** 2;
      // Parámetro t de proyección:
      // t = 0 → punto más cercano es A
      // t = 1 → punto más cercano es B
      // 0 < t < 1 → punto más cercano está en el segmento
      const t =
        abLenSq === 0 ? 0 : Math.max(0, Math.min(1, (apLat * abLat + apLng * abLng) / abLenSq));

      const closestLat = aLat + t * abLat;
      const closestLng = aLng + t * abLng;

      const dist = this.haversineMeters(lat, lng, closestLat, closestLng);
      if (dist < minDistance) minDistance = dist;
    }

    return minDistance;
  }
}
