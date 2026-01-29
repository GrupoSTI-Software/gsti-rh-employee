import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  ChangeDetectionStrategy,
  Input,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { GetYearsWorkedUseCase } from '../../application/get-years-worked.use-case';
import { SignVacationUseCase } from '../../application/sign-vacation.use-case';
import { GetHolidaysUseCase } from '../../application/get-holidays.use-case';
import { IYearWorked, IVacationUsed, IHoliday } from '../../domain/vacation.port';
import { IVacationSetting } from '../../domain/entities/vacation-setting.interface';
import { AUTH_PORT } from '@modules/auth/domain/auth.token';
import { IAuthPort } from '@modules/auth/domain/auth.port';
import { LoggerService } from '@core/services/logger.service';
import { VacationDetailDrawerComponent } from '../vacation-detail-drawer/vacation-detail-drawer.component';
import { VacationSignatureComponent } from '../vacation-signature/vacation-signature.component';
import { TooltipModule } from 'primeng/tooltip';
import { GetAttendanceUseCase } from '@modules/attendance/application/get-attendance.use-case';
import { IAttendance } from '@modules/attendance/domain/attendance.port';
import { GetWorkDisabilitiesUseCase } from '../../application/get-work-disabilities.use-case';

/**
 * Tipo de evento en el calendario
 */
export enum ECalendarEventType {
  VACATION = 'vacation',
  HOLIDAY = 'holiday',
  BIRTHDAY = 'birthday',
  ANNIVERSARY = 'anniversary',
  SHIFT = 'shift',
}

/**
 * Interfaz para representar un día del calendario
 */
interface ICalendarDay {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isVacation: boolean;
  vacationData?: IVacationUsed;
  holidays: IHoliday[];
  isBirthday: boolean;
  isAnniversary: boolean;
  shiftName: string | null;
  hasDisability: boolean;
}

/**
 * Componente de calendario de vacaciones
 */
/**
 * Componente de calendario de vacaciones
 * Componente reutilizable que muestra un calendario con días de vacaciones marcados
 */
@Component({
  selector: 'app-vacation-calendar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    TooltipModule,
    VacationDetailDrawerComponent,
    VacationSignatureComponent,
  ],
  templateUrl: './vacation-calendar.component.html',
  styleUrl: './vacation-calendar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VacationCalendarComponent implements OnInit {
  private readonly getYearsWorkedUseCase = inject(GetYearsWorkedUseCase);
  private readonly signVacationUseCase = inject(SignVacationUseCase);
  private readonly getHolidaysUseCase = inject(GetHolidaysUseCase);
  private readonly getAttendanceUseCase = inject(GetAttendanceUseCase);
  private readonly getWorkDisabilitiesUseCase = inject(GetWorkDisabilitiesUseCase);
  private readonly authPort = inject<IAuthPort>(AUTH_PORT);
  private readonly translateService = inject(TranslateService);
  private readonly logger = inject(LoggerService);
  private readonly sanitizer = inject(DomSanitizer);

  // Inputs opcionales para hacer el componente reutilizable
  /**
   * Título personalizado del calendario (opcional)
   * Por defecto usa 'vacations.title'
   */
  @Input() title?: string;

  /**
   * Subtítulo personalizado del calendario (opcional)
   * Por defecto usa 'vacations.subtitle'
   */
  @Input() subtitle?: string;

  /**
   * ID del empleado (opcional)
   * Si no se proporciona, usa el ID del usuario autenticado
   */
  @Input() employeeId?: number;

  /**
   * Si es true, carga los datos automáticamente al inicializar
   * Por defecto es true
   */
  @Input() autoLoad = true;

  // Estado de carga
  readonly loading = signal(false);

  // Año y mes seleccionados
  readonly selectedYear = signal(new Date().getFullYear());
  readonly selectedMonth = signal(new Date().getMonth());

  // Datos de años trabajados
  readonly yearsWorked = signal<IYearWorked[]>([]);

  // Días de vacaciones como Set para búsqueda rápida (formato: YYYY-MM-DD)
  readonly vacationDaysSet = signal<Set<string>>(new Set());

  // Festividades cargadas
  readonly holidays = signal<IHoliday[]>([]);

  // Fechas de cumpleaños y aniversarios del empleado
  readonly employeeBirthday = signal<{ month: number; day: number } | null>(null);
  readonly employeeAnniversary = signal<{ month: number; day: number } | null>(null);

  // Drawer de detalle
  readonly showDetailDrawer = signal(false);
  readonly selectedVacation = signal<IVacationUsed | null>(null);
  readonly selectedVacationSetting = signal<IVacationSetting | null>(null);
  readonly selectedDate = signal<Date | null>(null);
  readonly selectedHolidays = signal<IHoliday[]>([]);
  readonly selectedIsBirthday = signal(false);
  readonly selectedIsAnniversary = signal(false);
  readonly selectedAttendance = signal<IAttendance | null>(null);
  readonly loadingAttendance = signal(false);

  // Mapa de incapacidades por fecha (formato: YYYY-MM-DD -> boolean)
  readonly disabilityMap = signal<Map<string, boolean>>(new Map());

  // Diálogo de firma
  readonly showSignatureDialog = signal(false);

  // Meses disponibles para el selector (traducidos)
  readonly months = computed(() => {
    // Forzar recálculo cuando cambia el idioma
    const monthKeys = [
      'vacations.months.january',
      'vacations.months.february',
      'vacations.months.march',
      'vacations.months.april',
      'vacations.months.may',
      'vacations.months.june',
      'vacations.months.july',
      'vacations.months.august',
      'vacations.months.september',
      'vacations.months.october',
      'vacations.months.november',
      'vacations.months.december',
    ];

    return monthKeys.map((key, index) => ({
      value: index,
      label: this.translateService.instant(key),
    }));
  });

  // Años disponibles (últimos 10 años y próximos 2)
  readonly availableYears = computed(() => {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let i = currentYear - 10; i <= currentYear + 2; i++) {
      years.push(i);
    }
    return years;
  });

  // Días del calendario para el mes actual
  readonly calendarDays = computed(() => {
    const year = this.selectedYear();
    const month = this.selectedMonth();
    const vacationDays = this.vacationDaysSet();
    const holidaysList = this.holidays();
    const birthday = this.employeeBirthday();
    const anniversary = this.employeeAnniversary();
    const disabilityMap = this.disabilityMap();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 = Domingo, 1 = Lunes, etc.

    const days: ICalendarDay[] = [];

    // Agregar días del mes anterior para completar la primera semana
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      const dateKey = this.formatDateKey(date);
      const dayHolidays = this.getHolidaysForDate(date, holidaysList);
      const isBday = this.isBirthday(date, birthday);
      const isAnniv = this.isAnniversary(date, anniversary);
      const hasDisability = disabilityMap.get(dateKey) === true;

      days.push({
        date,
        dayNumber: prevMonthLastDay - i,
        isCurrentMonth: false,
        isVacation: false,
        holidays: dayHolidays,
        isBirthday: isBday,
        isAnniversary: isAnniv,
        shiftName: null,
        hasDisability,
      });
    }

    // Agregar días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateKey = this.formatDateKey(date);
      const isVacation = vacationDays.has(dateKey);
      const dayHolidays = this.getHolidaysForDate(date, holidaysList);
      const isBday = this.isBirthday(date, birthday);
      const isAnniv = this.isAnniversary(date, anniversary);
      const hasDisability = disabilityMap.get(dateKey) === true;

      // Buscar datos de vacación si existe
      let vacationData: IVacationUsed | undefined;
      if (isVacation) {
        vacationData = this.findVacationData(date);
      }

      days.push({
        date,
        dayNumber: day,
        isCurrentMonth: true,
        isVacation,
        vacationData,
        holidays: dayHolidays,
        isBirthday: isBday,
        isAnniversary: isAnniv,
        shiftName: null, // Se puede obtener del attendance si es necesario
        hasDisability,
      });
    }

    // Agregar días del mes siguiente para completar la última semana
    const remainingDays = 42 - days.length; // 6 semanas * 7 días
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      const dateKey = this.formatDateKey(date);
      const dayHolidays = this.getHolidaysForDate(date, holidaysList);
      const isBday = this.isBirthday(date, birthday);
      const isAnniv = this.isAnniversary(date, anniversary);
      const hasDisability = disabilityMap.get(dateKey) === true;

      days.push({
        date,
        dayNumber: day,
        isCurrentMonth: false,
        isVacation: false,
        holidays: dayHolidays,
        isBirthday: isBday,
        isAnniversary: isAnniv,
        shiftName: null,
        hasDisability,
      });
    }

    return days;
  });

  // Nombre del mes actual (traducido)
  readonly monthName = computed(() => {
    const months = this.months();
    return months[this.selectedMonth()]?.label ?? '';
  });

  // Nombre del año y mes para mostrar
  readonly monthYearLabel = computed(() => {
    return `${this.monthName()} ${this.selectedYear()}`;
  });

  /**
   * Efecto para actualizar meses cuando cambia el idioma
   */
  private readonly languageEffect = effect(() => {
    // Forzar actualización cuando cambia el idioma
    const currentLang = this.translateService.currentLang;
    // Los computed se actualizarán automáticamente cuando cambie el idioma
    if (currentLang) {
      // Forzar recálculo de meses
      this.months();
    }
  });

  ngOnInit(): void {
    // Cargar todas las vacaciones sin filtrar por año al iniciar el componente
    if (this.autoLoad) {
      void this.loadYearsWorked(undefined);
      void this.loadHolidays();
      this.loadEmployeeDates();
      void this.loadDisabilitiesForMonth();
    }
  }

  /**
   * Carga los años trabajados y vacaciones manualmente
   * Método público para permitir carga manual cuando autoLoad es false
   * @param employeeId - ID del empleado (opcional, usa el del usuario autenticado si no se proporciona)
   * @param year - Año opcional para filtrar. Si no se proporciona, carga todas las vacaciones
   */
  async loadVacations(employeeId?: number, year?: number): Promise<void> {
    if (employeeId) {
      this.employeeId = employeeId;
    }
    return this.loadYearsWorked(year);
  }

  /**
   * Carga los años trabajados y vacaciones
   * @param year - Año opcional para filtrar. Si no se proporciona, carga todas las vacaciones
   */
  private async loadYearsWorked(year?: number): Promise<void> {
    // Usar el employeeId proporcionado o el del usuario autenticado
    let targetEmployeeId: number | undefined = this.employeeId;

    if (!targetEmployeeId) {
      const user = this.authPort.getCurrentUser();
      if (typeof user?.employeeId !== 'number') {
        this.logger.error('No se encontró el ID del empleado');
        return;
      }
      targetEmployeeId = user.employeeId;
    }

    this.loading.set(true);

    try {
      // Si no se proporciona año, cargar todas las vacaciones
      // Si se proporciona, usar el año seleccionado
      const yearToLoad = year ?? this.selectedYear();
      const data = await this.getYearsWorkedUseCase.execute(targetEmployeeId, yearToLoad);
      this.yearsWorked.set(data);

      // Construir el Set de días de vacaciones
      const vacationDays = new Set<string>();
      data.forEach((yearWorked) => {
        yearWorked.vacationsUsedList.forEach((vacation) => {
          // Usar parseDateString para normalizar la fecha y evitar problemas de zona horaria
          const date = this.parseDateString(vacation.shiftExceptionsDate);
          const dateKey = this.formatDateKey(date);
          vacationDays.add(dateKey);
        });
      });

      this.vacationDaysSet.set(vacationDays);
    } catch (error) {
      this.logger.error('Error al cargar años trabajados:', error);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Normaliza una fecha string a Date sin problemas de zona horaria
   * Parsea la fecha como UTC para evitar cambios de día
   */
  private parseDateString(dateString: string): Date {
    // Si la fecha viene en formato ISO con hora, extraer solo la parte de fecha
    const dateOnly = dateString.split('T')[0];
    const [year, month, day] = dateOnly.split('-').map(Number);
    // Crear fecha en UTC para evitar problemas de zona horaria
    return new Date(Date.UTC(year, month - 1, day));
  }

  /**
   * Formatea una fecha como clave YYYY-MM-DD
   * Usa UTC para evitar problemas de zona horaria
   */
  private formatDateKey(date: Date): string {
    // Usar UTC para evitar problemas de zona horaria
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Busca los datos de vacación para una fecha específica
   */
  private findVacationData(date: Date): IVacationUsed | undefined {
    const dateKey = this.formatDateKey(date);
    const yearsWorked = this.yearsWorked();

    for (const yearWorked of yearsWorked) {
      const vacation = yearWorked.vacationsUsedList.find((v) => {
        // Usar parseDateString para normalizar la fecha y evitar problemas de zona horaria
        const vacationDate = this.parseDateString(v.shiftExceptionsDate);
        return this.formatDateKey(vacationDate) === dateKey;
      });

      if (vacation) {
        return vacation;
      }
    }

    return undefined;
  }

  /**
   * Navega al mes anterior
   */
  previousMonth(): void {
    const month = this.selectedMonth();
    const year = this.selectedYear();

    if (month === 0) {
      this.selectedMonth.set(11);
      this.selectedYear.set(year - 1);
    } else {
      this.selectedMonth.set(month - 1);
    }

    // Al cambiar de mes, cargar las incapacidades del nuevo mes
    void this.loadDisabilitiesForMonth();
  }

  /**
   * Navega al mes siguiente
   */
  nextMonth(): void {
    const month = this.selectedMonth();
    const year = this.selectedYear();

    if (month === 11) {
      this.selectedMonth.set(0);
      this.selectedYear.set(year + 1);
    } else {
      this.selectedMonth.set(month + 1);
    }

    // Al cambiar de mes, cargar las incapacidades del nuevo mes
    void this.loadDisabilitiesForMonth();
  }

  /**
   * Carga las festividades para el año seleccionado
   */
  private async loadHolidays(): Promise<void> {
    try {
      const year = this.selectedYear();
      const firstDate = `${year}-01-01`;
      const lastDate = `${year}-12-31`;

      const holidaysList = await this.getHolidaysUseCase.execute(firstDate, lastDate, 1, 100);
      this.holidays.set(holidaysList);
    } catch (error) {
      this.logger.error('Error al cargar festividades:', error);
    }
  }

  /**
   * Carga las fechas de cumpleaños y aniversario del empleado
   */
  private loadEmployeeDates(): void {
    const user = this.authPort.getCurrentUser();
    const person = user?.person;

    // Obtener fecha de cumpleaños
    if (person?.personBirthday) {
      const birthDate = new Date(person.personBirthday);
      this.employeeBirthday.set({
        month: birthDate.getMonth(),
        day: birthDate.getDate(),
      });
    }

    // Obtener fecha de contratación (aniversario)
    if (person?.employee?.employeeHireDate) {
      const hireDate = new Date(person.employee.employeeHireDate);
      this.employeeAnniversary.set({
        month: hireDate.getMonth(),
        day: hireDate.getDate(),
      });
    }
  }

  /**
   * Obtiene las festividades para una fecha específica
   */
  private getHolidaysForDate(date: Date, holidaysList: IHoliday[]): IHoliday[] {
    const dateKey = this.formatDateKey(date);
    return holidaysList.filter((holiday) => {
      const holidayDate = this.parseDateString(holiday.holidayDate);
      return this.formatDateKey(holidayDate) === dateKey;
    });
  }

  /**
   * Verifica si una fecha es el cumpleaños del empleado
   */
  private isBirthday(date: Date, birthday: { month: number; day: number } | null): boolean {
    if (!birthday) return false;
    return date.getMonth() === birthday.month && date.getDate() === birthday.day;
  }

  /**
   * Verifica si una fecha es el aniversario del empleado
   */
  private isAnniversary(date: Date, anniversary: { month: number; day: number } | null): boolean {
    if (!anniversary) return false;
    return date.getMonth() === anniversary.month && date.getDate() === anniversary.day;
  }

  /**
   * Obtiene el HTML sanitizado del icono de una festividad
   */
  getHolidayIconHtml(icon: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(icon);
  }

  /**
   * Obtiene el aria-label para un día del calendario
   */
  getDayAriaLabel(day: ICalendarDay): string {
    const labels: string[] = [];
    if (day.isVacation) {
      labels.push(this.translateService.instant('vacations.vacationDay'));
    }
    if (day.holidays.length > 0) {
      labels.push(
        ...day.holidays.map(
          (h) => `${this.translateService.instant('calendar.holiday')}: ${h.holidayName}`,
        ),
      );
    }
    if (day.isBirthday) {
      labels.push(this.translateService.instant('calendar.birthday'));
    }
    if (day.isAnniversary) {
      labels.push(this.translateService.instant('calendar.anniversary'));
    }
    if (day.hasDisability) {
      labels.push(this.translateService.instant('calendar.disability'));
    }
    return labels.length > 0 ? labels.join(', ') : '';
  }

  /**
   * Obtiene el texto del tooltip para un día del calendario
   * Prioriza festividades, luego cumpleaños, luego aniversario
   */
  getDayTooltip(day: ICalendarDay): string {
    const labels: string[] = [];

    // Prioridad 1: Festividades
    if (day.holidays.length > 0) {
      labels.push(...day.holidays.map((h) => h.holidayName));
    }

    // Prioridad 2: Cumpleaños
    if (day.isBirthday) {
      labels.push(this.translateService.instant('calendar.birthday'));
    }

    // Prioridad 3: Aniversario
    if (day.isAnniversary) {
      labels.push(this.translateService.instant('calendar.anniversary'));
    }

    // Prioridad 4: Vacaciones
    if (day.isVacation) {
      labels.push(this.translateService.instant('vacations.vacationDay'));
    }

    // Prioridad 5: Incapacidad
    if (day.hasDisability) {
      labels.push(this.translateService.instant('calendar.disability'));
    }

    return labels.length > 0 ? labels.join(', ') : '';
  }

  /**
   * Cuenta el número total de eventos en un día
   */
  getEventCount(day: ICalendarDay): number {
    let count = 0;
    if (day.isVacation) count++;
    if (day.holidays.length > 0) count += day.holidays.length;
    if (day.isBirthday) count++;
    if (day.isAnniversary) count++;
    if (day.hasDisability) count++;
    return count;
  }

  /**
   * Cambia el año seleccionado
   */
  onYearChange(year: number): void {
    this.selectedYear.set(year);
    // Cuando el usuario cambia el año, cargar las vacaciones de ese año específico
    void this.loadYearsWorked(year);
    void this.loadHolidays();
    void this.loadDisabilitiesForMonth();
  }

  /**
   * Cambia el mes seleccionado
   */
  onMonthChange(month: number): void {
    this.selectedMonth.set(month);
    // Al cambiar el mes, cargar las incapacidades del nuevo mes
    void this.loadDisabilitiesForMonth();
  }

  /**
   * Obtiene el nombre del día de la semana (traducido)
   */
  getDayName(dayIndex: number): string {
    const dayKeys = [
      'vacations.daysOfWeek.sunday',
      'vacations.daysOfWeek.monday',
      'vacations.daysOfWeek.tuesday',
      'vacations.daysOfWeek.wednesday',
      'vacations.daysOfWeek.thursday',
      'vacations.daysOfWeek.friday',
      'vacations.daysOfWeek.saturday',
    ];

    return this.translateService.instant(dayKeys[dayIndex] || '');
  }

  /**
   * Formatea la fecha para mostrar
   */
  formatDate(date: Date): string {
    const currentLang = this.translateService.currentLang || 'es';
    const locale = currentLang === 'en' ? 'en-US' : 'es-MX';
    return date.toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  /**
   * Verifica si un día es hoy
   */
  isToday(date: Date): boolean {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }

  /**
   * Maneja el click en un día del calendario
   */
  async onDayClick(event: Event, day: ICalendarDay): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    // Permitir click en cualquier día del mes actual
    if (!day.isCurrentMonth) {
      return;
    }

    // Establecer la fecha seleccionada
    this.selectedDate.set(day.date);

    // Obtener datos de vacación si existe
    const vacationData = day.vacationData ?? this.findVacationData(day.date);
    this.selectedVacation.set(vacationData ?? null);

    // Buscar la configuración de vacaciones correspondiente
    if (vacationData) {
      const vacationSetting = this.findVacationSetting(vacationData.vacationSettingId);
      this.selectedVacationSetting.set(vacationSetting);
    } else {
      this.selectedVacationSetting.set(null);
    }

    // Establecer festividades, cumpleaños y aniversario
    this.selectedHolidays.set(day.holidays);
    this.selectedIsBirthday.set(day.isBirthday);
    this.selectedIsAnniversary.set(day.isAnniversary);

    // Cargar información de asistencia del día
    await this.loadAttendanceForDate(day.date);

    // Abrir el drawer
    this.showDetailDrawer.set(true);
  }

  /**
   * Carga la información de asistencia para una fecha específica
   */
  private async loadAttendanceForDate(date: Date): Promise<void> {
    const user = this.authPort.getCurrentUser();
    if (typeof user?.employeeId !== 'number') {
      this.logger.error('No se encontró el ID del empleado');
      this.selectedAttendance.set(null);
      return;
    }

    this.loadingAttendance.set(true);

    try {
      const dateKey = this.formatDateKey(date);
      const attendance = await this.getAttendanceUseCase.execute(dateKey, dateKey, user.employeeId);
      this.selectedAttendance.set(attendance);
    } catch (error) {
      this.logger.error('Error al cargar asistencia para el día:', error);
      this.selectedAttendance.set(null);
    } finally {
      this.loadingAttendance.set(false);
    }
  }

  /**
   * Carga las incapacidades para todos los días del mes actual
   */
  private async loadDisabilitiesForMonth(): Promise<void> {
    const user = this.authPort.getCurrentUser();
    if (typeof user?.employeeId !== 'number') {
      return;
    }

    try {
      const workDisabilities = await this.getWorkDisabilitiesUseCase.execute(user.employeeId);
      const currentMap = new Map<string, boolean>(this.disabilityMap());
      const year = this.selectedYear();
      const month = this.selectedMonth();

      // Limpiar incapacidades del mes actual del mapa
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const monthStart = this.formatDateKey(firstDay);
      const monthEnd = this.formatDateKey(lastDay);

      for (const [dateKey] of currentMap.entries()) {
        if (dateKey >= monthStart && dateKey <= monthEnd) {
          currentMap.delete(dateKey);
        }
      }

      // Procesar períodos de incapacidad y marcar los días correspondientes
      for (const workDisability of workDisabilities) {
        for (const period of workDisability.workDisabilityPeriods) {
          const startDate = this.parseDateString(period.workDisabilityPeriodStartDate);
          const endDate = this.parseDateString(period.workDisabilityPeriodEndDate);

          // Iterar sobre todos los días del período
          const currentDate = new Date(startDate);
          while (currentDate <= endDate) {
            const dateKey = this.formatDateKey(currentDate);

            // Solo marcar días que estén en el mes actual
            if (dateKey >= monthStart && dateKey <= monthEnd) {
              currentMap.set(dateKey, true);
            }

            // Avanzar al siguiente día
            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
          }
        }
      }

      this.disabilityMap.set(currentMap);
    } catch (error) {
      this.logger.error('Error al cargar incapacidades del mes:', error);
    }
  }

  /**
   * Busca la configuración de vacaciones por ID
   */
  private findVacationSetting(vacationSettingId: number | null): IVacationSetting | null {
    if (!vacationSettingId) {
      return null;
    }

    const yearsWorked = this.yearsWorked();
    for (const yearWorked of yearsWorked) {
      if (yearWorked.vacationSetting?.vacationSettingId === vacationSettingId) {
        return yearWorked.vacationSetting;
      }
    }

    return null;
  }

  /**
   * Cierra el drawer de detalle
   */
  onDetailDrawerClose(): void {
    this.showDetailDrawer.set(false);
    this.selectedVacation.set(null);
    this.selectedVacationSetting.set(null);
    this.selectedDate.set(null);
    this.selectedHolidays.set([]);
    this.selectedIsBirthday.set(false);
    this.selectedIsAnniversary.set(false);
    this.selectedAttendance.set(null);
  }

  /**
   * Maneja la solicitud de firma desde el drawer
   */
  onSignRequested(_vacation: IVacationUsed): void {
    this.showSignatureDialog.set(true);
  }

  /**
   * Cierra el diálogo de firma
   */
  onSignatureDialogClose(): void {
    this.showSignatureDialog.set(false);
  }

  /**
   * Maneja el envío de la firma
   */
  async onSignatureSubmitted(event: { signature: Blob; vacation: IVacationUsed }): Promise<void> {
    const { signature, vacation } = event;

    if (!vacation.vacationSettingId) {
      this.logger.error('No se encontró vacationSettingId en la vacación');
      return;
    }

    const success = await this.signVacationUseCase.execute(signature, vacation.vacationSettingId, [
      vacation.shiftExceptionId,
    ]);

    if (success) {
      // Recargar los datos de vacaciones para actualizar la firma
      await this.loadYearsWorked(undefined);
      // Cerrar el drawer y el diálogo de firma
      this.onDetailDrawerClose();
      this.onSignatureDialogClose();
    } else {
      this.logger.error('Error al firmar la vacación');
    }
  }
}
