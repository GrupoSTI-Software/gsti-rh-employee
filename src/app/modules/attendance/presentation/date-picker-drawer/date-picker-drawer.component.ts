import { Component, EventEmitter, Input, Output, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { TranslateService } from '@ngx-translate/core';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';

@Component({
  selector: 'app-date-picker-drawer',
  standalone: true,
  imports: [CommonModule, TranslatePipe, DrawerComponent],
  templateUrl: './date-picker-drawer.component.html',
  styleUrl: './date-picker-drawer.component.scss',
})
export class DatePickerDrawerComponent {
  @Input() visible = false;
  @Input() selectedDate: Date = new Date();
  @Input() cancelButtonText = 'Cancelar';
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() dateSelected = new EventEmitter<Date>();

  readonly calendarDate = signal<Date>(new Date());
  readonly calendarDays = signal<
    {
      date: Date;
      day: number;
      isCurrentMonth: boolean;
      isSelected: boolean;
      isToday: boolean;
      isInRange: boolean;
      isFuture: boolean;
    }[]
  >([]);
  readonly calendarLoading = signal<boolean>(false);

  readonly weekDays = computed(() => {
    const currentLang = this.translateService.currentLang || 'es';
    const locale = currentLang === 'en' ? 'en-US' : 'es-MX';

    const days: string[] = [];
    const baseDate = new Date(2024, 0, 7);

    for (let i = 0; i < 7; i++) {
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() + i);
      const dayName = date.toLocaleDateString(locale, { weekday: 'short' });
      days.push(dayName.charAt(0).toUpperCase());
    }

    return days;
  });

  private readonly translateService = inject(TranslateService);

  /**
   * Cierra el drawer
   */
  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  /**
   * Genera los días del calendario para el mes actual
   */
  generateCalendarDays(): {
    date: Date;
    day: number;
    isCurrentMonth: boolean;
    isSelected: boolean;
    isToday: boolean;
    isInRange: boolean;
    isFuture: boolean;
  }[] {
    const currentDate = this.calendarDate();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const firstDayWeekday = firstDayOfMonth.getDay();
    const daysFromPrevMonth = firstDayWeekday;
    const prevMonthLastDay = new Date(year, month, 0);

    const days: {
      date: Date;
      day: number;
      isCurrentMonth: boolean;
      isSelected: boolean;
      isToday: boolean;
      isInRange: boolean;
      isFuture: boolean;
    }[] = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const selectedDate = new Date(this.selectedDate);
    selectedDate.setHours(0, 0, 0, 0);

    for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
      const day = prevMonthLastDay.getDate() - i;
      const date = new Date(year, month - 1, day);
      date.setHours(0, 0, 0, 0);

      days.push({
        date,
        day,
        isCurrentMonth: false,
        isSelected: date.getTime() === selectedDate.getTime(),
        isToday: date.getTime() === today.getTime(),
        isInRange: false,
        isFuture: date > today,
      });
    }

    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);

      days.push({
        date,
        day,
        isCurrentMonth: true,
        isSelected: date.getTime() === selectedDate.getTime(),
        isToday: date.getTime() === today.getTime(),
        isInRange: false,
        isFuture: date > today,
      });
    }

    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      date.setHours(0, 0, 0, 0);

      days.push({
        date,
        day,
        isCurrentMonth: false,
        isSelected: date.getTime() === selectedDate.getTime(),
        isToday: date.getTime() === today.getTime(),
        isInRange: false,
        isFuture: date > today,
      });
    }

    return days;
  }

  /**
   * Selecciona una fecha del calendario
   */
  selectCalendarDate(date: Date): void {
    this.dateSelected.emit(new Date(date));
    this.close();
  }

  /**
   * Navega al mes anterior en el calendario
   */
  previousCalendarMonth(): void {
    const date = new Date(this.calendarDate());
    date.setMonth(date.getMonth() - 1);
    this.calendarDate.set(date);
    this.calendarDays.set(this.generateCalendarDays());
  }

  /**
   * Navega al mes siguiente en el calendario
   */
  nextCalendarMonth(): void {
    const date = new Date(this.calendarDate());
    date.setMonth(date.getMonth() + 1);
    this.calendarDate.set(date);
    this.calendarDays.set(this.generateCalendarDays());
  }

  /**
   * Formatea el mes y año del calendario
   */
  formatCalendarMonth(date: Date): string {
    const currentLang = this.translateService.currentLang || 'es';
    const locale = currentLang === 'en' ? 'en-US' : 'es-MX';
    return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  }

  /**
   * Abre el drawer y carga el calendario
   */
  open(): void {
    this.calendarDate.set(new Date(this.selectedDate));
    this.calendarLoading.set(true);

    setTimeout(() => {
      this.calendarDays.set(this.generateCalendarDays());
      this.calendarLoading.set(false);
    }, 0);
  }
}
