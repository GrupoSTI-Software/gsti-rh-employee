import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  ChangeDetectionStrategy,
  Input,
  effect,
  ElementRef,
  ViewChild,
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
import { ExceptionRequestDrawerComponent } from '../exception-request-drawer/exception-request-drawer.component';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { GetAttendanceUseCase } from '@modules/attendance/application/get-attendance.use-case';
import { IAttendance } from '@modules/attendance/domain/attendance.port';
import { GetWorkDisabilitiesUseCase } from '../../application/get-work-disabilities.use-case';
import { GetExceptionRequestsUseCase } from '../../application/get-exception-requests.use-case';

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
 * Modo de visualización del calendario
 */
export enum ECalendarViewMode {
  MONTHLY = 'monthly',
  WEEKLY = 'weekly',
  DAILY = 'daily',
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
    ToastModule,
    VacationDetailDrawerComponent,
    VacationSignatureComponent,
    ExceptionRequestDrawerComponent,
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
  private readonly getExceptionRequestsUseCase = inject(GetExceptionRequestsUseCase);
  private readonly authPort = inject<IAuthPort>(AUTH_PORT);
  private readonly translateService = inject(TranslateService);
  private readonly logger = inject(LoggerService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly messageService = inject(MessageService);

  // Exponer el enum para usar en el template
  readonly ECalendarViewMode = ECalendarViewMode;

  // ViewChild para el contenedor semanal
  @ViewChild('weeklyContainer') weeklyContainer?: ElementRef<HTMLDivElement>;

  // Signal para controlar cuándo hacer scroll a la vista semanal
  private readonly shouldScrollToToday = signal(false);

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

  // Modo de visualización del calendario (por defecto: vista diaria del día actual)
  readonly viewMode = signal<ECalendarViewMode>(ECalendarViewMode.DAILY);

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

  // Mapa de turnos por fecha (formato: YYYY-MM-DD -> string)
  readonly shiftMap = signal<Map<string, string>>(new Map());

  // Diálogo de firma
  readonly showSignatureDialog = signal(false);

  // Drawer de solicitud de excepciones
  readonly showExceptionRequestDrawer = signal(false);
  readonly selectionMode = signal(false);
  readonly selectedDaysForException = signal<Date[]>([]);
  // Fechas con excepciones (cualquier estado) - formato: YYYY-MM-DD
  readonly exceptionDatesSet = signal<Set<string>>(new Set());

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

  // Días del calendario según el modo de visualización
  readonly calendarDays = computed(() => {
    const mode = this.viewMode();
    switch (mode) {
      case ECalendarViewMode.MONTHLY:
        return this.getMonthlyDays();
      case ECalendarViewMode.WEEKLY:
        return this.getWeeklyDays();
      case ECalendarViewMode.DAILY:
        return this.getDailyDays();
      default:
        return this.getMonthlyDays();
    }
  });

  /**
   * Obtiene los días para la vista mensual
   */
  private getMonthlyDays(): ICalendarDay[] {
    const year = this.selectedYear();
    const month = this.selectedMonth();
    const vacationDays = this.vacationDaysSet();
    const holidaysList = this.holidays();
    const birthday = this.employeeBirthday();
    const anniversary = this.employeeAnniversary();
    const disabilityMap = this.disabilityMap();
    const shiftMap = this.shiftMap();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: ICalendarDay[] = [];

    // Agregar días del mes anterior para completar la primera semana
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      days.push(
        this.createCalendarDay(
          date,
          false,
          vacationDays,
          holidaysList,
          birthday,
          anniversary,
          disabilityMap,
          shiftMap,
        ),
      );
    }

    // Agregar días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push(
        this.createCalendarDay(
          date,
          true,
          vacationDays,
          holidaysList,
          birthday,
          anniversary,
          disabilityMap,
          shiftMap,
        ),
      );
    }

    // Agregar días del mes siguiente para completar la última semana
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push(
        this.createCalendarDay(
          date,
          false,
          vacationDays,
          holidaysList,
          birthday,
          anniversary,
          disabilityMap,
          shiftMap,
        ),
      );
    }

    return days;
  }

  /**
   * Fecha actual para las vistas semanal y diaria
   * Si no hay fecha seleccionada, usa la fecha actual (hoy)
   */
  private getCurrentViewDate(): Date {
    const selected = this.selectedDate();
    if (selected) {
      return selected;
    }
    // Retornar la fecha actual para mostrar el día de hoy por defecto
    return new Date();
  }

  /**
   * Obtiene los días para la vista semanal
   */
  private getWeeklyDays(): ICalendarDay[] {
    const currentDate = this.getCurrentViewDate();
    const vacationDays = this.vacationDaysSet();
    const holidaysList = this.holidays();
    const birthday = this.employeeBirthday();
    const anniversary = this.employeeAnniversary();
    const disabilityMap = this.disabilityMap();
    const shiftMap = this.shiftMap();

    const days: ICalendarDay[] = [];

    // Obtener el primer día de la semana (domingo)
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDate.getDay());

    // Generar los 7 días de la semana
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const isCurrentMonth = date.getMonth() === this.selectedMonth();
      days.push(
        this.createCalendarDay(
          date,
          isCurrentMonth,
          vacationDays,
          holidaysList,
          birthday,
          anniversary,
          disabilityMap,
          shiftMap,
        ),
      );
    }

    return days;
  }

  /**
   * Obtiene el día para la vista diaria
   */
  private getDailyDays(): ICalendarDay[] {
    const currentDate = this.getCurrentViewDate();
    const vacationDays = this.vacationDaysSet();
    const holidaysList = this.holidays();
    const birthday = this.employeeBirthday();
    const anniversary = this.employeeAnniversary();
    const disabilityMap = this.disabilityMap();
    const shiftMap = this.shiftMap();

    return [
      this.createCalendarDay(
        currentDate,
        true,
        vacationDays,
        holidaysList,
        birthday,
        anniversary,
        disabilityMap,
        shiftMap,
      ),
    ];
  }

  /**
   * Crea un objeto ICalendarDay para una fecha específica
   */
  private createCalendarDay(
    date: Date,
    isCurrentMonth: boolean,
    vacationDays: Set<string>,
    holidaysList: IHoliday[],
    birthday: { month: number; day: number } | null,
    anniversary: { month: number; day: number } | null,
    disabilityMap: Map<string, boolean>,
    shiftMap: Map<string, string>,
  ): ICalendarDay {
    const dateKey = this.formatDateKey(date);
    const isVacation = vacationDays.has(dateKey);
    const dayHolidays = this.getHolidaysForDate(date, holidaysList);
    const isBday = this.isBirthday(date, birthday);
    const isAnniv = this.isAnniversary(date, anniversary);
    const hasDisability = disabilityMap.get(dateKey) === true;
    const shiftName = shiftMap.get(dateKey) ?? null;

    let vacationData: IVacationUsed | undefined;
    if (isVacation) {
      vacationData = this.findVacationData(date);
    }

    return {
      date,
      dayNumber: date.getDate(),
      isCurrentMonth,
      isVacation,
      vacationData,
      holidays: dayHolidays,
      isBirthday: isBday,
      isAnniversary: isAnniv,
      shiftName,
      hasDisability,
    };
  }

  // Nombre del mes actual (traducido)
  readonly monthName = computed(() => {
    const months = this.months();
    return months[this.selectedMonth()]?.label ?? '';
  });

  // Nombre del año y mes para mostrar según el modo de vista
  readonly monthYearLabel = computed(() => {
    const mode = this.viewMode();

    switch (mode) {
      case ECalendarViewMode.MONTHLY:
        return `${this.monthName()} ${this.selectedYear()}`;

      case ECalendarViewMode.WEEKLY: {
        const currentDate = this.getCurrentViewDate();
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - currentDate.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        const startMonth = this.translateService.instant(
          `vacations.months.${this.getMonthKey(weekStart.getMonth())}`,
        );
        const endMonth = this.translateService.instant(
          `vacations.months.${this.getMonthKey(weekEnd.getMonth())}`,
        );

        if (weekStart.getMonth() === weekEnd.getMonth()) {
          return `${weekStart.getDate()} - ${weekEnd.getDate()} ${startMonth} ${weekStart.getFullYear()}`;
        } else if (weekStart.getFullYear() === weekEnd.getFullYear()) {
          return `${weekStart.getDate()} ${startMonth} - ${weekEnd.getDate()} ${endMonth} ${weekStart.getFullYear()}`;
        } else {
          return `${weekStart.getDate()} ${startMonth} ${weekStart.getFullYear()} - ${weekEnd.getDate()} ${endMonth} ${weekEnd.getFullYear()}`;
        }
      }

      case ECalendarViewMode.DAILY: {
        const currentDate = this.getCurrentViewDate();
        const monthName = this.translateService.instant(
          `vacations.months.${this.getMonthKey(currentDate.getMonth())}`,
        );
        const dayName = this.getDayName(currentDate.getDay());
        return `${dayName}, ${currentDate.getDate()} ${monthName} ${currentDate.getFullYear()}`;
      }

      default:
        return `${this.monthName()} ${this.selectedYear()}`;
    }
  });

  /**
   * Obtiene la clave del mes para traducción
   */
  private getMonthKey(monthIndex: number): string {
    const monthKeys = [
      'january',
      'february',
      'march',
      'april',
      'may',
      'june',
      'july',
      'august',
      'september',
      'october',
      'november',
      'december',
    ];
    return monthKeys[monthIndex] ?? 'january';
  }

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

  /**
   * Efecto para hacer scroll al día actual en vista semanal
   */
  private readonly scrollEffect = effect(() => {
    if (this.shouldScrollToToday() && this.viewMode() === ECalendarViewMode.WEEKLY) {
      // Usar setTimeout para asegurar que el DOM esté renderizado
      setTimeout(() => {
        this.scrollToTodayInWeeklyView();
        this.shouldScrollToToday.set(false);
      }, 100);
    }
  });

  ngOnInit(): void {
    // Cargar todas las vacaciones sin filtrar por año al iniciar el componente
    if (this.autoLoad) {
      void this.loadYearsWorked(undefined);
      void this.loadHolidays();
      this.loadEmployeeDates();
      void this.loadDisabilitiesForMonth();
      void this.loadShiftsForMonth();
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
   * Navega al período anterior según el modo de vista
   */
  previousMonth(): void {
    const mode = this.viewMode();

    switch (mode) {
      case ECalendarViewMode.MONTHLY:
        this.previousMonthView();
        break;
      case ECalendarViewMode.WEEKLY:
        this.previousWeek();
        break;
      case ECalendarViewMode.DAILY:
        this.previousDay();
        break;
    }

    void this.loadDisabilitiesForMonth();
    void this.loadShiftsForMonth();
  }

  /**
   * Navega al período siguiente según el modo de vista
   */
  nextMonth(): void {
    const mode = this.viewMode();

    switch (mode) {
      case ECalendarViewMode.MONTHLY:
        this.nextMonthView();
        break;
      case ECalendarViewMode.WEEKLY:
        this.nextWeek();
        break;
      case ECalendarViewMode.DAILY:
        this.nextDay();
        break;
    }

    void this.loadDisabilitiesForMonth();
    void this.loadShiftsForMonth();
  }

  /**
   * Navega al mes anterior
   */
  private previousMonthView(): void {
    const month = this.selectedMonth();
    const year = this.selectedYear();

    if (month === 0) {
      this.selectedMonth.set(11);
      this.selectedYear.set(year - 1);
    } else {
      this.selectedMonth.set(month - 1);
    }
  }

  /**
   * Navega al mes siguiente
   */
  private nextMonthView(): void {
    const month = this.selectedMonth();
    const year = this.selectedYear();

    if (month === 11) {
      this.selectedMonth.set(0);
      this.selectedYear.set(year + 1);
    } else {
      this.selectedMonth.set(month + 1);
    }
  }

  /**
   * Navega a la semana anterior
   */
  private previousWeek(): void {
    const currentDate = this.getCurrentViewDate();
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 7);
    this.selectedDate.set(newDate);
    this.updateMonthYear(newDate);
    this.shouldScrollToToday.set(true);
  }

  /**
   * Navega a la semana siguiente
   */
  private nextWeek(): void {
    const currentDate = this.getCurrentViewDate();
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 7);
    this.selectedDate.set(newDate);
    this.updateMonthYear(newDate);
    this.shouldScrollToToday.set(true);
  }

  /**
   * Navega al día anterior
   */
  private previousDay(): void {
    const currentDate = this.getCurrentViewDate();
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 1);
    this.selectedDate.set(newDate);
    this.updateMonthYear(newDate);
  }

  /**
   * Navega al día siguiente
   */
  private nextDay(): void {
    const currentDate = this.getCurrentViewDate();
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 1);
    this.selectedDate.set(newDate);
    this.updateMonthYear(newDate);
  }

  /**
   * Actualiza el mes y año seleccionados según una fecha
   */
  private updateMonthYear(date: Date): void {
    this.selectedMonth.set(date.getMonth());
    this.selectedYear.set(date.getFullYear());
  }

  /**
   * Cambia el modo de visualización del calendario
   */
  setViewMode(mode: ECalendarViewMode): void {
    // Al salir de vista mensual, cancelar modo selección (solo disponible en mensual)
    if (
      (mode === ECalendarViewMode.WEEKLY || mode === ECalendarViewMode.DAILY) &&
      this.selectionMode()
    ) {
      this.cancelSelectionMode();
    }

    this.viewMode.set(mode);

    // Al cambiar a vista semanal o diaria, establecer la fecha seleccionada al día actual si no hay fecha
    if (
      (mode === ECalendarViewMode.WEEKLY || mode === ECalendarViewMode.DAILY) &&
      !this.selectedDate()
    ) {
      this.selectedDate.set(new Date());
    }

    // Si se cambia a vista semanal, activar el scroll al día actual
    if (mode === ECalendarViewMode.WEEKLY) {
      this.shouldScrollToToday.set(true);
    }
  }

  /**
   * Hace scroll para centrar el día actual o seleccionado en la vista semanal
   */
  private scrollToTodayInWeeklyView(): void {
    if (!this.weeklyContainer) {
      return;
    }

    const container = this.weeklyContainer.nativeElement;

    // Primero intentar encontrar el día de hoy, si no existe, centrar el primer día de la semana
    let targetColumn = container.querySelector('.weekly-column.today-column') as HTMLElement;

    // Si no hay día de hoy visible, usar la primera columna (centro de la semana actual)
    if (!targetColumn) {
      const allColumns = container.querySelectorAll('.weekly-column');
      // Centrar en la columna del medio (día 3 de 7)
      if (allColumns.length > 0) {
        const middleIndex = Math.floor(allColumns.length / 2);
        targetColumn = allColumns[middleIndex] as HTMLElement;
      }
    }

    if (targetColumn) {
      const containerWidth = container.offsetWidth;
      const columnLeft = targetColumn.offsetLeft;
      const columnWidth = targetColumn.offsetWidth;

      // Calcular la posición para centrar el elemento
      const scrollPosition = columnLeft - containerWidth / 1.5 + columnWidth / 1.5;

      // Hacer scroll suave a la posición calculada
      container.scrollTo({
        left: Math.max(0, scrollPosition),
        behavior: 'smooth',
      });
    }
  }

  /**
   * Navega a hoy
   */
  goToToday(): void {
    const today = new Date();
    this.selectedDate.set(today);
    this.selectedMonth.set(today.getMonth());
    this.selectedYear.set(today.getFullYear());

    // Si está en vista semanal, hacer scroll al día actual
    if (this.viewMode() === ECalendarViewMode.WEEKLY) {
      this.shouldScrollToToday.set(true);
    }
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

    // Si está en vista semanal o diaria, cambiar al día 1 del mes actual
    if (
      this.viewMode() === ECalendarViewMode.WEEKLY ||
      this.viewMode() === ECalendarViewMode.DAILY
    ) {
      const newDate = new Date(year, this.selectedMonth(), 1);
      this.selectedDate.set(newDate);

      // Si está en vista semanal, activar scroll al día
      if (this.viewMode() === ECalendarViewMode.WEEKLY) {
        this.shouldScrollToToday.set(true);
      }
    }

    // Cuando el usuario cambia el año, cargar las vacaciones de ese año específico
    void this.loadYearsWorked(year);
    void this.loadHolidays();
    void this.loadDisabilitiesForMonth();
    void this.loadShiftsForMonth();
  }

  /**
   * Cambia el mes seleccionado
   */
  onMonthChange(month: number): void {
    this.selectedMonth.set(month);

    // Si está en vista semanal o diaria, cambiar al día 1 del mes seleccionado
    if (
      this.viewMode() === ECalendarViewMode.WEEKLY ||
      this.viewMode() === ECalendarViewMode.DAILY
    ) {
      const newDate = new Date(this.selectedYear(), month, 1);
      this.selectedDate.set(newDate);

      // Si está en vista semanal, activar scroll al día
      if (this.viewMode() === ECalendarViewMode.WEEKLY) {
        this.shouldScrollToToday.set(true);
      }
    }

    // Al cambiar el mes, cargar las incapacidades y turnos del nuevo mes
    void this.loadDisabilitiesForMonth();
    void this.loadShiftsForMonth();
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

    // Si está en modo selección y vista mensual, alternar la selección del día (solo disponible en mensual)
    if (this.selectionMode() && this.viewMode() === ECalendarViewMode.MONTHLY) {
      // toggleDaySelection ya maneja la validación y muestra el mensaje
      this.toggleDaySelection(day.date);
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
   * Carga la información de turnos para todos los días del mes actual
   */
  private async loadShiftsForMonth(): Promise<void> {
    const user = this.authPort.getCurrentUser();
    if (typeof user?.employeeId !== 'number') {
      return;
    }

    try {
      const year = this.selectedYear();
      const month = this.selectedMonth();

      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const startDateKey = this.formatDateKey(firstDay);
      const endDateKey = this.formatDateKey(lastDay);

      const attendance = await this.getAttendanceUseCase.execute(
        startDateKey,
        endDateKey,
        user.employeeId,
      );

      const newShiftMap = new Map<string, string>();

      // Si hay información de turno, aplicarla a todos los días del mes
      if (attendance?.shiftName) {
        const currentDate = new Date(year, month, 1);
        const totalDays = lastDay.getDate();

        for (let day = 1; day <= totalDays; day++) {
          currentDate.setDate(day);
          const dateKey = this.formatDateKey(currentDate);
          newShiftMap.set(dateKey, attendance.shiftName);
        }
      }

      this.shiftMap.set(newShiftMap);
    } catch (error) {
      this.logger.error('Error al cargar turnos del mes:', error);
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

  /**
   * Verifica si un día tiene una excepción registrada
   */
  hasExceptionForDate(date: Date): boolean {
    const dateKey = this.formatDateKey(date);
    return this.exceptionDatesSet().has(dateKey);
  }

  /**
   * Alterna la selección de un día para solicitudes de excepción
   */
  toggleDaySelection(date: Date): void {
    // No permitir seleccionar días que ya tienen excepciones
    if (this.hasExceptionForDate(date)) {
      this.translateService.get('exceptionRequest.dayHasException').subscribe((message) => {
        this.messageService.add({
          severity: 'warn',
          summary: this.translateService.instant('exceptionRequest.warning'),
          detail: message,
          life: 5000,
        });
      });
      return;
    }

    const selectedDays = [...this.selectedDaysForException()];
    const dateKey = this.formatDateKey(date);
    const index = selectedDays.findIndex((d) => this.formatDateKey(d) === dateKey);

    if (index === -1) {
      selectedDays.push(date);
    } else {
      selectedDays.splice(index, 1);
    }

    this.selectedDaysForException.set(selectedDays);
  }

  /**
   * Verifica si un día está seleccionado
   */
  isDaySelected(date: Date): boolean {
    const dateKey = this.formatDateKey(date);
    return this.selectedDaysForException().some((d) => this.formatDateKey(d) === dateKey);
  }

  /**
   * Carga las excepciones para validación en modo selección
   */
  private async loadExceptionDates(): Promise<void> {
    const user = this.authPort.getCurrentUser();
    if (typeof user?.employeeId !== 'number') {
      return;
    }

    try {
      const requests = await this.getExceptionRequestsUseCase.execute(
        user.employeeId,
        '',
        undefined,
        undefined,
        'all',
      );
      // Crear un Set con todas las fechas que tienen excepciones (cualquier estado)
      const exceptionDates = new Set<string>();
      requests.forEach((request) => {
        if (request.requestedDate) {
          // Usar parseDateString para normalizar la fecha y evitar problemas de zona horaria
          const requestDate = this.parseDateString(request.requestedDate);
          const dateKey = this.formatDateKey(requestDate);
          exceptionDates.add(dateKey);
        }
      });
      this.exceptionDatesSet.set(exceptionDates);
    } catch (error) {
      this.logger.error('Error al cargar excepciones para validación:', error);
    }
  }

  /**
   * Alterna el modo de selección de días (solo disponible en vista mensual)
   */
  toggleSelectionMode(): void {
    // Solo permitir activar el modo selección en vista mensual
    if (!this.selectionMode() && this.viewMode() !== ECalendarViewMode.MONTHLY) {
      return;
    }

    const newMode = !this.selectionMode();
    this.selectionMode.set(newMode);

    // Si se activa el modo selección, cargar las excepciones
    if (newMode) {
      void this.loadExceptionDates();
    }
  }

  /**
   * Cancela el modo de selección y limpia los días seleccionados
   */
  cancelSelectionMode(): void {
    this.selectionMode.set(false);
    this.selectedDaysForException.set([]);
  }

  /**
   * Abre el drawer de solicitud de excepciones
   */
  openExceptionRequestDrawer(): void {
    // Abrir el drawer con los días seleccionados (si hay)
    this.showExceptionRequestDrawer.set(true);
  }

  /**
   * Cierra el drawer de solicitud de excepciones
   */
  closeExceptionRequestDrawer(): void {
    this.showExceptionRequestDrawer.set(false);
    // No desactivar el modo selección automáticamente
  }

  /**
   * Maneja cuando se crea una solicitud de excepción
   */
  onExceptionRequestCreated(): void {
    this.selectedDaysForException.set([]);
    this.selectionMode.set(false);
    // Limpiar el set de excepciones ya que se desactivó el modo selección
    // Se recargarán automáticamente cuando se active el modo selección de nuevo
    this.exceptionDatesSet.set(new Set());
  }
}
