import {
  Component,
  inject,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnInit,
  OnChanges,
  SimpleChanges,
  signal,
  computed,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { TranslateService } from '@ngx-translate/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { GetExceptionTypesUseCase } from '../../application/get-exception-types.use-case';
import { CreateExceptionRequestUseCase } from '../../application/create-exception-request.use-case';
import { GetExceptionRequestsUseCase } from '../../application/get-exception-requests.use-case';
import { IExceptionType } from '../../domain/entities/exception-type.interface';
import { IExceptionRequest } from '../../domain/entities/exception-request.interface';
import { IExceptionRequestDetail } from '../../domain/entities/exception-request-detail.interface';
import { AUTH_PORT } from '@modules/auth/domain/auth.token';
import { IAuthPort } from '@modules/auth/domain/auth.port';
import { LoggerService } from '@core/services/logger.service';
import { parseLocalDate } from '@shared/utils/date.utils';

/**
 * Componente drawer para crear solicitudes de excepciones de turno
 */
@Component({
  selector: 'app-exception-request-drawer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './exception-request-drawer.component.html',
  styleUrl: './exception-request-drawer.component.scss',
  host: { class: 'exception-request-drawer-host' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate('300ms ease-out', style({ transform: 'translateX(0)' })),
      ]),
      transition(':leave', [animate('300ms ease-in', style({ transform: 'translateX(100%)' }))]),
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 })),
      ]),
    ]),
  ],
})
export class ExceptionRequestDrawerComponent implements OnInit, OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translateService = inject(TranslateService);
  private readonly getExceptionTypesUseCase = inject(GetExceptionTypesUseCase);
  private readonly createExceptionRequestUseCase = inject(CreateExceptionRequestUseCase);
  private readonly getExceptionRequestsUseCase = inject(GetExceptionRequestsUseCase);
  private readonly authPort = inject<IAuthPort>(AUTH_PORT);
  private readonly logger = inject(LoggerService);

  @Input() visible = false;
  @Input() selectedDates: Date[] = [];
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() requestCreated = new EventEmitter<void>();

  private visibleChanged = false;

  readonly loading = signal(false);
  readonly loadingTypes = signal(false);
  readonly loadingRequests = signal(false);
  readonly exceptionTypes = signal<IExceptionType[]>([]);
  readonly selectedDatesList = signal<Date[]>([]);
  readonly pendingRequests = signal<IExceptionRequestDetail[]>([]);
  // Todas las solicitudes (cualquier estado) para validación de fechas
  readonly allRequests = signal<IExceptionRequestDetail[]>([]);
  readonly activeTab = signal<'request' | 'pending'>('request');
  readonly dateErrors = signal<Map<number, string>>(new Map());
  readonly errorMessage = signal<string | null>(null);

  readonly form: FormGroup = this.fb.group({
    exceptionTypeId: [null, [Validators.required]],
    exceptionRequestDescription: ['', [Validators.maxLength(255)]],
    exceptionRequestCheckInTime: [null],
    exceptionRequestCheckOutTime: [null],
    hoursToApply: [0],
    enjoymentOfSalary: [false],
  });

  // Signal para el ID del tipo de excepción seleccionado
  private readonly selectedExceptionTypeId = signal<number | null>(null);

  readonly selectedExceptionType = computed(() => {
    const typeId = this.selectedExceptionTypeId();
    if (!typeId) return null;
    return this.exceptionTypes().find((type) => type.exceptionTypeId === typeId) ?? null;
  });

  // Computed signals que leen directamente del signal para mejor reactividad
  readonly needsCheckInTime = computed(() => {
    const typeId = this.selectedExceptionTypeId();
    if (!typeId) return false;
    const type = this.exceptionTypes().find((t) => t.exceptionTypeId === typeId);
    // Si necesita periodo en horas, también necesita check-in
    return type?.exceptionTypeNeedCheckInTime === 1 || type?.exceptionTypeNeedPeriodInHours === 1;
  });

  readonly needsCheckOutTime = computed(() => {
    const typeId = this.selectedExceptionTypeId();
    if (!typeId) return false;
    const type = this.exceptionTypes().find((t) => t.exceptionTypeId === typeId);
    // Si necesita periodo en horas, también necesita check-out
    return type?.exceptionTypeNeedCheckOutTime === 1 || type?.exceptionTypeNeedPeriodInHours === 1;
  });

  readonly needsReason = computed(() => {
    const typeId = this.selectedExceptionTypeId();
    if (!typeId) return false;
    const type = this.exceptionTypes().find((t) => t.exceptionTypeId === typeId);
    return type?.exceptionTypeNeedReason === 1;
  });

  /** True si el tipo de excepción seleccionado es vacaciones (no se muestra descripción en calendario) */
  readonly isVacationType = computed(() => {
    const type = this.selectedExceptionType();
    if (!type) return false;
    const slug = (type.exceptionTypeSlug ?? '').toLowerCase();
    const name = (type.exceptionTypeTypeName ?? '').toLowerCase();
    return (
      slug.includes('vacation') ||
      slug.includes('vacaciones') ||
      name.includes('vacation') ||
      name.includes('vacaciones')
    );
  });

  readonly needsEnjoymentOfSalary = computed(() => {
    const typeId = this.selectedExceptionTypeId();
    if (!typeId) return false;
    const type = this.exceptionTypes().find((t) => t.exceptionTypeId === typeId);
    return type?.exceptionTypeNeedEnjoymentOfSalary === 1;
  });

  readonly needsPeriodInDays = computed(() => {
    const typeId = this.selectedExceptionTypeId();
    if (!typeId) return false;
    const type = this.exceptionTypes().find((t) => t.exceptionTypeId === typeId);
    return type?.exceptionTypeNeedPeriodInDays === 1;
  });

  readonly needsPeriodInHours = computed(() => {
    const typeId = this.selectedExceptionTypeId();
    if (!typeId) return false;
    const type = this.exceptionTypes().find((t) => t.exceptionTypeId === typeId);
    return type?.exceptionTypeNeedPeriodInHours === 1;
  });

  ngOnInit(): void {
    void this.loadExceptionTypes();
    this.setupFormValidators();
    this.setupExceptionTypeWatcher();
  }

  /**
   * Configura un watcher para actualizar el signal cuando cambie el tipo de excepción
   */
  private setupExceptionTypeWatcher(): void {
    const exceptionTypeControl = this.form.get('exceptionTypeId');
    if (!exceptionTypeControl) {
      return;
    }

    exceptionTypeControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        // Actualizar el signal primero
        this.selectedExceptionTypeId.set(value);

        // Buscar el tipo directamente en la lista para evitar problemas de timing con el computed
        const selectedType = value
          ? (this.exceptionTypes().find((type) => type.exceptionTypeId === value) ?? null)
          : null;

        // Limpiar valores de campos que ya no son necesarios
        if (!selectedType) {
          this.form.patchValue(
            {
              exceptionRequestCheckInTime: null,
              exceptionRequestCheckOutTime: null,
              hoursToApply: 0,
            },
            { emitEvent: false },
          );
        } else {
          // Limpiar campos que no son necesarios para el nuevo tipo
          // Si necesita periodo en horas, NO limpiar check-in y check-out
          if (selectedType.exceptionTypeNeedPeriodInHours !== 1) {
            // Solo limpiar check-in si no se necesita directamente Y no se necesita periodo en horas
            if (selectedType.exceptionTypeNeedCheckInTime !== 1) {
              this.form.patchValue({ exceptionRequestCheckInTime: null }, { emitEvent: false });
            }
            // Solo limpiar check-out si no se necesita directamente Y no se necesita periodo en horas
            if (selectedType.exceptionTypeNeedCheckOutTime !== 1) {
              this.form.patchValue({ exceptionRequestCheckOutTime: null }, { emitEvent: false });
            }
            // Limpiar horas solo si NO se necesita periodo en horas
            this.form.patchValue({ hoursToApply: 0 }, { emitEvent: false });
          } else {
            // Si necesita periodo en horas, limpiar el campo de horas pero mantener check-in y check-out
            this.form.patchValue({ hoursToApply: 0 }, { emitEvent: false });
          }
        }

        // Actualizar validadores
        this.updateFormValidators();

        // Forzar detección de cambios para que aparezcan los campos dinámicos
        // Usar detectChanges() para forzar la actualización inmediata del template
        this.cdr.detectChanges();
      });
  }

  /**
   * Cambia la pestaña activa
   */
  setActiveTab(tab: 'request' | 'pending'): void {
    this.activeTab.set(tab);
    if (tab === 'pending') {
      void this.loadPendingRequests();
    }
    this.cdr.markForCheck();
  }

  /**
   * Carga las solicitudes de excepción pendientes
   */
  private async loadPendingRequests(): Promise<void> {
    const user = this.authPort.getCurrentUser();
    if (typeof user?.employeeId !== 'number') {
      return;
    }

    this.loadingRequests.set(true);
    try {
      const requests = await this.getExceptionRequestsUseCase.execute(user.employeeId);
      // Guardar todas las solicitudes para validación
      this.allRequests.set(requests);
      // Solo mostrar solicitudes que no estén rechazadas en la pestaña de pendientes
      const visibleRequests = requests
        .filter((request) => request.exceptionRequestStatus !== 'refused')
        .sort((a, b) => {
          // Primero ordenar por estado: accepted primero, luego pending/requested
          const statusOrder: Record<string, number> = {
            accepted: 0,
            pending: 1,
            requested: 1,
          };
          const statusDiff =
            (statusOrder[a.exceptionRequestStatus] ?? 2) -
            (statusOrder[b.exceptionRequestStatus] ?? 2);

          if (statusDiff !== 0) {
            return statusDiff;
          }

          // Si tienen el mismo estado, ordenar por fecha descendente (más recientes primero)
          const dateA = new Date(a.requestedDate).getTime();
          const dateB = new Date(b.requestedDate).getTime();
          return dateB - dateA;
        });
      this.pendingRequests.set(visibleRequests);
    } catch (error) {
      this.logger.error('Error al cargar solicitudes pendientes:', error);
    } finally {
      this.loadingRequests.set(false);
      this.cdr.markForCheck();
    }
  }

  /**
   * Formatea una fecha para mostrar
   */
  formatRequestDate(dateString: string): string {
    const date = parseLocalDate(dateString);
    const currentLang = this.translateService.currentLang || 'es';
    const locale = currentLang === 'en' ? 'en-US' : 'es-MX';
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Formatea una hora para mostrar (HH:mm:ss -> HH:mm)
   */
  formatTime(timeString: string | null): string {
    if (!timeString) return '--:--';
    // Si viene en formato HH:mm:ss, tomar solo HH:mm
    return timeString.substring(0, 5);
  }

  /**
   * Obtiene el texto del estado traducido
   */
  getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      requested: 'exceptionRequest.status.requested',
      pending: 'exceptionRequest.status.pending',
      accepted: 'exceptionRequest.status.accepted',
      refused: 'exceptionRequest.status.refused',
    };
    return statusMap[status] || status;
  }

  /**
   * Configura los validadores del formulario según el tipo de excepción seleccionado
   * Nota: La lógica de actualización se maneja en setupExceptionTypeWatcher()
   */
  private setupFormValidators(): void {
    // Los validadores se actualizan automáticamente cuando cambia el tipo de excepción
    // a través del watcher configurado en setupExceptionTypeWatcher()
  }

  /**
   * Actualiza los validadores del formulario según el tipo de excepción
   */
  private updateFormValidators(): void {
    const descriptionControl = this.form.get('exceptionRequestDescription');
    const checkInTimeControl = this.form.get('exceptionRequestCheckInTime');
    const checkOutTimeControl = this.form.get('exceptionRequestCheckOutTime');
    const hoursToApplyControl = this.form.get('hoursToApply');

    // Limpiar validadores previos
    descriptionControl?.clearValidators();
    checkInTimeControl?.clearValidators();
    checkOutTimeControl?.clearValidators();
    hoursToApplyControl?.clearValidators();

    // Aplicar validadores según el tipo de excepción (vacaciones en calendario no requieren descripción)
    if (this.needsReason() && !this.isVacationType()) {
      descriptionControl?.setValidators([Validators.required, Validators.maxLength(255)]);
    } else {
      descriptionControl?.setValidators([Validators.maxLength(255)]);
    }

    if (this.needsCheckInTime()) {
      checkInTimeControl?.setValidators([Validators.required]);
    }

    if (this.needsCheckOutTime()) {
      checkOutTimeControl?.setValidators([Validators.required]);
    }

    // No validar hoursToApply cuando se necesita periodo en horas
    // porque se usan check-in y check-out en su lugar

    // Actualizar estado de validación
    descriptionControl?.updateValueAndValidity();
    checkInTimeControl?.updateValueAndValidity();
    checkOutTimeControl?.updateValueAndValidity();
    hoursToApplyControl?.updateValueAndValidity();

    // Forzar detección de cambios para que aparezcan los campos dinámicos
    this.cdr.detectChanges();
  }

  /**
   * Carga los tipos de excepción
   */
  private async loadExceptionTypes(): Promise<void> {
    this.loadingTypes.set(true);
    try {
      const types = await this.getExceptionTypesUseCase.execute('', true, 1, 100);
      this.exceptionTypes.set(types);
    } catch (error) {
      this.logger.error('Error al cargar tipos de excepción:', error);
    } finally {
      this.loadingTypes.set(false);
      this.cdr.markForCheck();
    }
  }

  /**
   * Maneja cuando el drawer se muestra
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue && !this.visibleChanged) {
      this.visibleChanged = true;
      this.onShow();
    }
    if (changes['visible'] && !changes['visible'].currentValue) {
      this.visibleChanged = false;
    }
    if (changes['selectedDates']) {
      this.onShow();
    }
  }

  /**
   * Maneja cuando el drawer se muestra
   */
  onShow(): void {
    // Cargar solicitudes primero para poder validar las fechas
    void this.loadPendingRequests().then(() => {
      if (this.selectedDates.length > 0) {
        // Validar fechas que vienen del calendario
        const validDates: Date[] = [];
        const errors = new Map<number, string>();

        this.selectedDates.forEach((date, index) => {
          if (this.hasRequestForDate(date)) {
            errors.set(index, 'exceptionRequest.dateHasRequest');
          } else {
            validDates.push(date);
          }
        });

        this.selectedDatesList.set(validDates);
        this.dateErrors.set(errors);

        // Mostrar mensaje si hay fechas con solicitudes
        if (errors.size > 0) {
          this.errorMessage.set('exceptionRequest.someDatesHaveRequests');
          setTimeout(() => {
            this.errorMessage.set(null);
            this.cdr.detectChanges();
          }, 5000);
        }
      } else {
        this.selectedDatesList.set([]);
        this.dateErrors.set(new Map());
      }

      // Resetear el formulario y forzar actualización de validadores
      this.form.reset();
      this.selectedExceptionTypeId.set(null);
      this.updateFormValidators();
      this.cdr.markForCheck();
    });
  }

  /**
   * Cierra el drawer
   */
  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.form.reset();
    this.selectedExceptionTypeId.set(null);
    this.selectedDatesList.set([]);
    this.activeTab.set('request');
    this.dateErrors.set(new Map());
    this.errorMessage.set(null);
    this.allRequests.set([]);
  }

  /**
   * Verifica si una fecha ya tiene una solicitud (cualquier estado)
   */
  hasRequestForDate(date: Date): boolean {
    if (!date || isNaN(date.getTime())) {
      return false;
    }

    // Formatear la fecha a YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    return this.allRequests().some((request) => {
      if (!request.requestedDate) return false;

      const requestDate = parseLocalDate(request.requestedDate);
      if (isNaN(requestDate.getTime())) return false;

      const requestYear = requestDate.getFullYear();
      const requestMonth = String(requestDate.getMonth() + 1).padStart(2, '0');
      const requestDay = String(requestDate.getDate()).padStart(2, '0');
      const requestDateString = `${requestYear}-${requestMonth}-${requestDay}`;

      return requestDateString === dateString;
    });
  }

  /**
   * Agrega una fecha a la lista
   */
  addDate(): void {
    const newDate = new Date();
    // Validar que la fecha no tenga una solicitud
    if (this.hasRequestForDate(newDate)) {
      this.logger.warn('Esta fecha ya tiene una solicitud');
      // Mostrar mensaje de error al usuario
      this.errorMessage.set('exceptionRequest.dateHasRequest');
      // Limpiar el mensaje después de 5 segundos
      setTimeout(() => {
        this.errorMessage.set(null);
        this.cdr.detectChanges();
      }, 5000);
      this.cdr.detectChanges();
      return;
    }
    // Limpiar mensaje de error si la fecha es válida
    this.errorMessage.set(null);
    const dates = [...this.selectedDatesList(), newDate];
    this.selectedDatesList.set(dates);
    this.cdr.detectChanges();
  }

  /**
   * Remueve una fecha de la lista
   */
  removeDate(index: number): void {
    const dates = [...this.selectedDatesList()];
    dates.splice(index, 1);
    this.selectedDatesList.set(dates);

    // Limpiar error de la fecha removida y reindexar
    const errors = new Map(this.dateErrors());
    errors.delete(index);

    // Reindexar errores para las fechas que quedan después del índice removido
    const newErrors = new Map<number, string>();
    errors.forEach((value, key) => {
      if (key > index) {
        newErrors.set(key - 1, value);
      } else {
        newErrors.set(key, value);
      }
    });
    this.dateErrors.set(newErrors);

    // Limpiar mensaje de error si no hay fechas seleccionadas
    if (dates.length === 0) {
      this.errorMessage.set(null);
    }

    this.cdr.detectChanges();
  }

  /**
   * Formatea una fecha para mostrar
   */
  formatDate(date: Date): string {
    const currentLang = this.translateService.currentLang || 'es';
    const locale = currentLang === 'en' ? 'en-US' : 'es-MX';
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Formatea una fecha para el input date (YYYY-MM-DD)
   */
  formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Actualiza una fecha en la lista
   */
  updateDate(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const newDate = parseLocalDate(input.value);

    // Validar que la fecha no tenga una solicitud
    if (this.hasRequestForDate(newDate)) {
      const errors = new Map(this.dateErrors());
      errors.set(index, 'exceptionRequest.dateHasRequest');
      this.dateErrors.set(errors);
      // Mostrar mensaje de error al usuario
      this.errorMessage.set('exceptionRequest.dateHasRequest');
      // Limpiar el mensaje después de 5 segundos
      setTimeout(() => {
        this.errorMessage.set(null);
        this.cdr.detectChanges();
      }, 5000);
      // Restaurar la fecha anterior
      this.cdr.detectChanges();
      return;
    }

    // Limpiar error si existe
    const errors = new Map(this.dateErrors());
    errors.delete(index);
    this.dateErrors.set(errors);
    this.errorMessage.set(null);

    const dates = [...this.selectedDatesList()];
    dates[index] = newDate;
    this.selectedDatesList.set(dates);
    this.cdr.detectChanges();
  }

  /**
   * Formatea una hora para el input time
   */
  formatTimeForInput(date: Date | null): string {
    if (!date) return '';
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Parsea una hora del input time a formato HH:mm:ss
   */
  parseTimeFromInput(timeString: string): string {
    if (!timeString) return '';
    // El input time devuelve HH:mm, necesitamos agregar :00 para el formato HH:mm:ss
    return `${timeString}:00`;
  }

  /**
   * Envía las solicitudes de excepción
   */
  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const dates = this.selectedDatesList();
    if (dates.length === 0) {
      // Mostrar error: se necesita al menos una fecha
      return;
    }

    // Filtrar fechas que ya tienen solicitudes
    const validDates = dates.filter((date) => !this.hasRequestForDate(date));
    const datesWithRequests = dates.filter((date) => this.hasRequestForDate(date));

    if (datesWithRequests.length > 0) {
      // Mostrar mensaje de error indicando que hay fechas con solicitudes
      this.errorMessage.set('exceptionRequest.someDatesHaveRequests');
      // Limpiar el mensaje después de 5 segundos
      setTimeout(() => {
        this.errorMessage.set(null);
        this.cdr.detectChanges();
      }, 5000);
      this.cdr.detectChanges();
    }

    if (validDates.length === 0) {
      // Todas las fechas tienen solicitudes, no enviar nada
      return;
    }

    const user = this.authPort.getCurrentUser();
    if (typeof user?.employeeId !== 'number') {
      this.logger.error('No se encontró el ID del empleado');
      return;
    }

    this.loading.set(true);

    try {
      const formValue = this.form.value;
      const requests: IExceptionRequest[] = [];

      for (const date of validDates) {
        const request: IExceptionRequest = {
          employeeId: user.employeeId,
          exceptionTypeId: formValue.exceptionTypeId,
          exceptionRequestStatus: 'pending',
          exceptionRequestDescription: formValue.exceptionRequestDescription ?? '',
          requestedDate: this.formatDateForRequest(date),
          exceptionRequestCheckInTime: formValue.exceptionRequestCheckInTime
            ? this.parseTimeFromInput(formValue.exceptionRequestCheckInTime)
            : null,
          exceptionRequestCheckOutTime: formValue.exceptionRequestCheckOutTime
            ? this.parseTimeFromInput(formValue.exceptionRequestCheckOutTime)
            : null,
          // Si necesita periodo en horas, no enviar el campo de horas (se calcula con check-in y check-out)
          exceptionRequestPeriodInHours: this.needsPeriodInHours()
            ? null
            : (formValue.hoursToApply ?? null),
        };
        requests.push(request);
      }

      // Enviar todas las solicitudes en paralelo
      await Promise.all(
        requests.map((request) => this.createExceptionRequestUseCase.execute(request)),
      );

      this.requestCreated.emit();
      this.close();
    } catch (error) {
      this.logger.error('Error al crear solicitudes de excepción:', error);
    } finally {
      this.loading.set(false);
      this.cdr.markForCheck();
    }
  }

  /**
   * Formatea una fecha para el request (formato: "YYYY-MM-DD HH:mm:ss")
   * La hora siempre será 00:00:00 ya que solo se necesita la fecha
   */
  private formatDateForRequest(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day} 00:00:00`;
  }
}
