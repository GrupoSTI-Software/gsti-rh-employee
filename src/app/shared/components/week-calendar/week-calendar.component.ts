import { Component, input, output, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Interfaz para representar un día en el calendario semanal
 */
interface IWeekDay {
  date: Date;
  dayNumber: number;
  dayName: string;
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
  imports: [CommonModule],
  templateUrl: './week-calendar.component.html',
  styleUrl: './week-calendar.component.scss',
})
export class WeekCalendarComponent implements OnInit {
  // Input: fecha seleccionada actual
  readonly selectedDate = input<Date>(new Date());

  // Output: evento cuando se selecciona una fecha
  readonly dateSelected = output<Date>();

  // Signal para la fecha base de la semana mostrada
  private readonly weekBaseDate = signal<Date>(new Date());

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
        dayName: this.getDayName(date.getDay()),
        isToday: date.getTime() === today.getTime(),
        isSelected: date.getTime() === selectedDateNormalized.getTime(),
      });
    }

    return days;
  });

  /**
   * Computed: mes y año actual de la semana mostrada
   */
  readonly currentMonthYear = computed((): string => {
    const baseDate = this.weekBaseDate();
    const locale = 'es-MX';
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
    return new Date(d.setDate(diff));
  }

  /**
   * Obtiene el nombre corto del día (2 letras)
   */
  private getDayName(dayIndex: number): string {
    const days = ['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SA'];
    return days[dayIndex];
  }

  /**
   * Navega a la semana anterior
   */
  previousWeek(): void {
    const current = this.weekBaseDate();
    const newDate = new Date(current);
    newDate.setDate(current.getDate() - 7);
    this.weekBaseDate.set(newDate);
  }

  /**
   * Navega a la semana siguiente
   */
  nextWeek(): void {
    const current = this.weekBaseDate();
    const newDate = new Date(current);
    newDate.setDate(current.getDate() + 7);
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
