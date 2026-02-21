import {
  Component,
  inject,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  signal,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@shared/pipes/translate.pipe';

/** Envío desactivado temporalmente (solo formulario y validación). */
const SUBMIT_ENABLED = false;

/**
 * Drawer para solicitar vacaciones (excepciones de tipo vacaciones).
 * Mismo flujo que exception-request-drawer: lista de fechas, descripción opcional.
 * Valida que no se soliciten más días de los disponibles.
 * Botón enviar desactivado de momento.
 */
@Component({
  selector: 'app-request-vacation-drawer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './request-vacation-drawer.component.html',
  styleUrl: './request-vacation-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestVacationDrawerComponent {
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input() visible = false;
  /** Días disponibles para no permitir solicitar más. */
  @Input() availableDays = 0;
  @Output() visibleChange = new EventEmitter<boolean>();

  readonly selectedDatesList = signal<Date[]>([]);
  readonly dateErrors = signal<Map<number, string>>(new Map());
  readonly errorMessage = signal<string | null>(null);
  readonly submitEnabled = SUBMIT_ENABLED;

  readonly form: FormGroup = this.fb.group({
    exceptionRequestDescription: ['', [Validators.maxLength(255)]],
  });

  /** Parámetros para el pipe translate (available debe ser string). */
  get translateParams(): { available: string } {
    return { available: String(this.availableDays) };
  }

  close(): void {
    this.visibleChange.emit(false);
    this.selectedDatesList.set([]);
    this.dateErrors.set(new Map());
    this.errorMessage.set(null);
    this.form.reset();
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
   * Agrega una fecha. Valida que no se excedan los días disponibles.
   */
  addDate(): void {
    if (this.selectedDatesList().length >= this.availableDays) {
      this.errorMessage.set('vacationsModule.daysExceedAvailable');
      this.cdr.markForCheck();
      return;
    }
    this.errorMessage.set(null);
    const dates = [...this.selectedDatesList(), new Date()];
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
    const errors = new Map(this.dateErrors());
    errors.delete(index);
    const newErrors = new Map<number, string>();
    errors.forEach((value, key) => {
      newErrors.set(key > index ? key - 1 : key, value);
    });
    this.dateErrors.set(newErrors);
    if (dates.length === 0) this.errorMessage.set(null);
    this.cdr.markForCheck();
  }

  /**
   * Actualiza una fecha en la lista. Valida que no se excedan los días disponibles.
   */
  updateDate(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    if (!value) return;
    const newDate = new Date(value);
    if (isNaN(newDate.getTime())) return;
    const errors = new Map(this.dateErrors());
    errors.delete(index);
    this.dateErrors.set(errors);
    this.errorMessage.set(null);
    const dates = [...this.selectedDatesList()];
    dates[index] = newDate;
    this.selectedDatesList.set(dates);
    this.cdr.markForCheck();
  }

  /**
   * Envío desactivado de momento; cuando se habilite, usar CreateExceptionRequestUseCase con tipo vacaciones.
   */
  onSubmit(): void {
    if (!SUBMIT_ENABLED) return;
    if (this.form.invalid || this.selectedDatesList().length === 0) return;
    const count = this.selectedDatesList().length;
    if (count > this.availableDays) {
      this.errorMessage.set('vacationsModule.daysExceedAvailable');
      this.cdr.markForCheck();
      return;
    }
    // TODO: llamar CreateExceptionRequestUseCase con exceptionTypeId de vacaciones
    this.close();
  }
}
