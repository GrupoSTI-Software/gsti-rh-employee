import {
  Component,
  input,
  output,
  computed,
  signal,
  OnInit,
  inject,
  DestroyRef,
  effect,
  untracked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/** Claves de traducción para los días de la semana (domingo = 0) */
const WEEK_DAY_KEYS = [
  'weekCalendar.sunday',
  'weekCalendar.monday',
  'weekCalendar.tuesday',
  'weekCalendar.wednesday',
  'weekCalendar.thursday',
  'weekCalendar.friday',
  'weekCalendar.saturday',
] as const;

/**
 * Interfaz para representar un día en el calendario semanal
 */
interface IWeekDay {
  date: Date;
  dayNumber: number;
  /** Clave de traducción del nombre del día */
  dayNameKey: string;
  isToday: boolean;
  isSelected: boolean;
}

/**
 * Componente de calendario semanal
 * Muestra una semana completa con navegación por flechas
 */
@Component({
  selector: 'app-week-calendar',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './week-calendar.component.html',
  styleUrl: './week-calendar.component.scss',
})
export class WeekCalendarComponent implements OnInit {
  private readonly translateService = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  /** Signal del idioma actual para que currentMonthYear se actualice al cambiar idioma */
  private readonly currentLang = signal<string>(this.translateService.currentLang || 'es');

  // Input: fecha seleccionada actual
  readonly selectedDate = input<Date>(new Date());

  // Output: evento cuando se selecciona una fecha
  readonly dateSelected = output<Date>();

  // Signal para la fecha base de la semana mostrada
  private readonly weekBaseDate = signal<Date>(new Date());

  constructor() {
    this.translateService.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => this.currentLang.set(event.lang));

    // Sincronizar la semana mostrada cuando selectedDate cambia desde fuera (ej. drawer del calendario)
    // Usamos untracked para leer weekBaseDate sin crear dependencia reactiva
    effect(
      () => {
        const selected = this.selectedDate();
        const selectedMonday = this.getMonday(selected);
        const currentMonday = untracked(() => this.getMonday(this.weekBaseDate()));
        if (selectedMonday.getTime() !== currentMonday.getTime()) {
          this.weekBaseDate.set(new Date(selected));
        }
      },
      { allowSignalWrites: true },
    );
  }

  /**
   * Computed: días de la semana actual
   */
  readonly weekDays = computed((): IWeekDay[] => {
    const baseDate = this.weekBaseDate();
    const selectedDate = this.selectedDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Obtener el lunes de la semana
    const monday = this.getMonday(baseDate);

    // Generar los 7 días de la semana
    const days: IWeekDay[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      date.setHours(0, 0, 0, 0);

      const selectedDateNormalized = new Date(selectedDate);
      selectedDateNormalized.setHours(0, 0, 0, 0);

      days.push({
        date: date,
        dayNumber: date.getDate(),
        dayNameKey: this.getDayNameKey(date.getDay()),
        isToday: date.getTime() === today.getTime(),
        isSelected: date.getTime() === selectedDateNormalized.getTime(),
      });
    }

    return days;
  });

  /**
   * Computed: mes y año actual de la semana mostrada (según idioma actual)
   */
  readonly currentMonthYear = computed((): string => {
    const baseDate = this.weekBaseDate();
    const lang = this.currentLang(); // dependencia para re-ejecutar al cambiar idioma
    const locale = lang?.startsWith('en') ? 'en-US' : 'es-MX';
    return baseDate.toLocaleDateString(locale, {
      month: 'long',
      year: 'numeric',
    });
  });

  /**
   * Obtiene el lunes de la semana para una fecha dada
   */
  private getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajustar cuando es domingo
    d.setDate(diff);
    return new Date(d);
  }

  /**
   * Obtiene la clave de traducción del nombre corto del día
   */
  private getDayNameKey(dayIndex: number): string {
    return WEEK_DAY_KEYS[dayIndex] ?? 'weekCalendar.sunday';
  }

  /**
   * Navega a la semana anterior
   */
  previousWeek(): void {
    const current = this.weekBaseDate();
    const newDate = new Date(current.getTime());
    newDate.setDate(newDate.getDate() - 7);
    this.weekBaseDate.set(newDate);
  }

  /**
   * Navega a la semana siguiente
   */
  nextWeek(): void {
    const current = this.weekBaseDate();
    const newDate = new Date(current.getTime());
    newDate.setDate(newDate.getDate() + 7);
    this.weekBaseDate.set(newDate);
  }

  /**
   * Navega a la semana actual y selecciona el día de hoy
   */
  goToToday(): void {
    const today = new Date();
    this.weekBaseDate.set(today);
    this.dateSelected.emit(today);
  }

  /**
   * Maneja el clic en un día
   */
  onDayClick(day: IWeekDay): void {
    this.dateSelected.emit(day.date);
  }

  /**
   * Inicializa el componente con la fecha seleccionada
   */
  ngOnInit(): void {
    this.weekBaseDate.set(this.selectedDate());
  }
}
