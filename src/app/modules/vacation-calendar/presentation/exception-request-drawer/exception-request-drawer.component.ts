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
} from '@angular/core';
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

/**
 * Componente drawer para crear solicitudes de excepciones de turno
 */
@Component({
  selector: 'app-exception-request-drawer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './exception-request-drawer.component.html',
  styleUrl: './exception-request-drawer.component.scss',
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
  readonly activeTab = signal<'request' | 'pending'>('request');
  readonly dateErrors = signal<Map<number, string>>(new Map());

  readonly form: FormGroup = this.fb.group({
    exceptionTypeId: [null, [Validators.required]],
    exceptionRequestDescription: ['', [Validators.maxLength(255)]],
    exceptionRequestCheckInTime: [null],
    exceptionRequestCheckOutTime: [null],
    daysToApply: [0],
    hoursToApply: [0],
    enjoymentOfSalary: [false],
  });

  readonly selectedExceptionType = computed(() => {
    const typeId = this.form.get('exceptionTypeId')?.value;
    if (!typeId) return null;
    return this.exceptionTypes().find((type) => type.exceptionTypeId === typeId) ?? null;
  });

  readonly needsCheckInTime = computed(() => {
    return this.selectedExceptionType()?.exceptionTypeNeedCheckInTime === 1;
  });

  readonly needsCheckOutTime = computed(() => {
    return this.selectedExceptionType()?.exceptionTypeNeedCheckOutTime === 1;
  });

  readonly needsReason = computed(() => {
    return this.selectedExceptionType()?.exceptionTypeNeedReason === 1;
  });

  readonly needsEnjoymentOfSalary = computed(() => {
    return this.selectedExceptionType()?.exceptionTypeNeedEnjoymentOfSalary === 1;
  });

  readonly needsPeriodInDays = computed(() => {
    return this.selectedExceptionType()?.exceptionTypeNeedPeriodInDays === 1;
  });

  readonly needsPeriodInHours = computed(() => {
    return this.selectedExceptionType()?.exceptionTypeNeedPeriodInHours === 1;
  });

  ngOnInit(): void {
    void this.loadExceptionTypes();
    this.setupFormValidators();
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
      this.pendingRequests.set(requests);
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
   */
  private setupFormValidators(): void {
    this.form.get('exceptionTypeId')?.valueChanges.subscribe(() => {
      // Limpiar valores de campos que ya no son necesarios
      const selectedType = this.selectedExceptionType();
      if (!selectedType) {
        this.form.patchValue({
          exceptionRequestCheckInTime: null,
          exceptionRequestCheckOutTime: null,
          daysToApply: 0,
          hoursToApply: 0,
        });
      } else {
        // Limpiar campos que no son necesarios para el nuevo tipo
        if (selectedType.exceptionTypeNeedCheckInTime !== 1) {
          this.form.patchValue({ exceptionRequestCheckInTime: null });
        }
        if (selectedType.exceptionTypeNeedCheckOutTime !== 1) {
          this.form.patchValue({ exceptionRequestCheckOutTime: null });
        }
        if (selectedType.exceptionTypeNeedPeriodInDays !== 1) {
          this.form.patchValue({ daysToApply: 0 });
        }
        if (selectedType.exceptionTypeNeedPeriodInHours !== 1) {
          this.form.patchValue({ hoursToApply: 0 });
        }
      }
      this.updateFormValidators();
      // Forzar detección de cambios para que aparezcan los campos dinámicos
      this.cdr.detectChanges();
    });
  }

  /**
   * Actualiza los validadores del formulario según el tipo de excepción
   */
  private updateFormValidators(): void {
    const descriptionControl = this.form.get('exceptionRequestDescription');
    const checkInTimeControl = this.form.get('exceptionRequestCheckInTime');
    const checkOutTimeControl = this.form.get('exceptionRequestCheckOutTime');
    const daysToApplyControl = this.form.get('daysToApply');
    const hoursToApplyControl = this.form.get('hoursToApply');

    // Limpiar validadores previos
    descriptionControl?.clearValidators();
    checkInTimeControl?.clearValidators();
    checkOutTimeControl?.clearValidators();
    daysToApplyControl?.clearValidators();
    hoursToApplyControl?.clearValidators();

    // Aplicar validadores según el tipo de excepción
    if (this.needsReason()) {
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

    if (this.needsPeriodInDays()) {
      daysToApplyControl?.setValidators([Validators.required, Validators.min(0)]);
    }

    if (this.needsPeriodInHours()) {
      hoursToApplyControl?.setValidators([Validators.required, Validators.min(0)]);
    }

    // Actualizar estado de validación
    descriptionControl?.updateValueAndValidity();
    checkInTimeControl?.updateValueAndValidity();
    checkOutTimeControl?.updateValueAndValidity();
    daysToApplyControl?.updateValueAndValidity();
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
    if (this.selectedDates.length > 0) {
      this.selectedDatesList.set([...this.selectedDates]);
    } else {
      this.selectedDatesList.set([]);
    }
    // Cargar solicitudes pendientes para validación
    void this.loadPendingRequests();
    // Resetear el formulario y forzar actualización de validadores
    this.form.reset();
    this.updateFormValidators();
    this.cdr.markForCheck();
  }

  /**
   * Cierra el drawer
   */
  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.form.reset();
    this.selectedDatesList.set([]);
    this.activeTab.set('request');
    this.dateErrors.set(new Map());
  }

  /**
   * Verifica si una fecha ya tiene una solicitud pendiente
   */
  hasPendingRequestForDate(date: Date): boolean {
    if (!date || isNaN(date.getTime())) {
      return false;
    }

    // Formatear la fecha a YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    return this.pendingRequests().some((request) => {
      if (!request.requestedDate) return false;

      // Parsear la fecha de la solicitud
      const requestDate = new Date(request.requestedDate);
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
    // Validar que la fecha no tenga solicitud pendiente
    if (this.hasPendingRequestForDate(newDate)) {
      this.logger.warn('Esta fecha ya tiene una solicitud pendiente');
      return;
    }
    const dates = [...this.selectedDatesList(), newDate];
    this.selectedDatesList.set(dates);
    this.cdr.markForCheck();
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

    this.cdr.markForCheck();
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
    const newDate = new Date(input.value);

    // Validar que la fecha no tenga solicitud pendiente
    if (this.hasPendingRequestForDate(newDate)) {
      const errors = new Map(this.dateErrors());
      errors.set(index, 'exceptionRequest.dateHasPendingRequest');
      this.dateErrors.set(errors);
      // No actualizar la fecha si tiene solicitud pendiente
      this.cdr.markForCheck();
      return;
    }

    // Limpiar error si la fecha es válida
    const errors = new Map(this.dateErrors());
    errors.delete(index);
    this.dateErrors.set(errors);

    const dates = [...this.selectedDatesList()];
    dates[index] = newDate;
    this.selectedDatesList.set(dates);
    this.cdr.markForCheck();
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

    // Filtrar fechas que ya tienen solicitudes pendientes
    const validDates = dates.filter((date) => !this.hasPendingRequestForDate(date));

    if (validDates.length === 0) {
      this.logger.warn('Todas las fechas seleccionadas ya tienen solicitudes pendientes');
      return;
    }

    if (validDates.length < dates.length) {
      this.logger.warn(
        `Se omitieron ${dates.length - validDates.length} fecha(s) que ya tienen solicitudes pendientes`,
      );
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
          exceptionRequestStatus: 'requested',
          exceptionRequestDescription: formValue.exceptionRequestDescription ?? '',
          requestedDate: this.formatDateForRequest(date),
          exceptionRequestCheckInTime: formValue.exceptionRequestCheckInTime
            ? this.parseTimeFromInput(formValue.exceptionRequestCheckInTime)
            : null,
          exceptionRequestCheckOutTime: formValue.exceptionRequestCheckOutTime
            ? this.parseTimeFromInput(formValue.exceptionRequestCheckOutTime)
            : null,
          daysToApply: formValue.daysToApply ?? 0,
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
