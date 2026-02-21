import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { GetYearsWorkedUseCase } from '@modules/vacations/application/get-years-worked.use-case';
import { AUTH_PORT } from '@modules/auth/domain/auth.token';
import { IAuthPort } from '@modules/auth/domain/auth.port';
import { IYearWorked } from '@modules/vacations/domain/entities/year-worked.interface';
import { IVacationUsed } from '@modules/vacations/domain/entities/vacation-used.interface';
import { AvatarComponent } from '@shared/components/avatar/avatar.component';
import { ManageVacationsDrawerComponent } from '../manage-vacations-drawer/manage-vacations-drawer.component';
import { RequestVacationDrawerComponent } from '../request-vacation-drawer/request-vacation-drawer.component';

/** Intervalo en ms para comprobar si ya se cargó el usuario (igual que en Perfil). */
const USER_CHECK_INTERVAL_MS = 100;
/** Tiempo máximo de espera antes de mostrar error (igual que en Perfil). */
const USER_LOAD_TIMEOUT_MS = 3000;

/**
 * Datos resumidos de un periodo para la vista
 */
export interface IPeriodSummary {
  year: number;
  yearsPassed: number;
  periodStart: Date;
  periodEnd: Date;
  periodLabel: string;
  daysCorresponding: number;
  daysUsed: number;
  daysAvailable: number;
  previousPeriodDaysAvailable: number | null;
  yearWorked: IYearWorked;
}

/**
 * Página principal del módulo Vacaciones.
 * Muestra tarjeta de días disponibles y tarjetas por periodo de antigüedad.
 */
@Component({
  selector: 'app-vacations-page',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    AvatarComponent,
    ManageVacationsDrawerComponent,
    RequestVacationDrawerComponent,
  ],
  templateUrl: './vacations-page.component.html',
  styleUrl: './vacations-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VacationsPageComponent implements OnInit {
  private readonly getYearsWorkedUseCase = inject(GetYearsWorkedUseCase);
  private readonly authPort = inject<IAuthPort>(AUTH_PORT);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly loading = signal(true);
  readonly yearsWorked = signal<IYearWorked[]>([]);
  readonly loadError = signal<string | null>(null);

  /** Usuario actual (misma fuente que Perfil: getCurrentUser). */
  readonly user = computed(() => this.authPort.getCurrentUser());

  /** Nombre completo del empleado (misma lógica que Perfil: person o name/email). */
  readonly employeeName = computed(() => {
    const u = this.user();
    if (u?.person === null || u?.person === undefined) return u?.name ?? u?.email ?? '';
    const parts: string[] = [];
    if (u.person.personFirstname != null && u.person.personFirstname !== '')
      parts.push(u.person.personFirstname);
    if (u.person.personLastname != null && u.person.personLastname !== '')
      parts.push(u.person.personLastname);
    if (u.person.personSecondLastname != null && u.person.personSecondLastname !== '')
      parts.push(u.person.personSecondLastname);
    return parts.length > 0 ? parts.join(' ') : (u.name ?? u.email ?? '');
  });

  /** ID del empleado (misma fuente que Perfil: user.person.employee). */
  readonly employeeId = computed(() => this.user()?.person?.employee?.employeeId ?? null);

  /** Datos del empleado para la tarjeta (misma fuente que Perfil: user.person.employee). */
  readonly employeeInfo = computed(() => {
    const emp = this.user()?.person?.employee;
    if (!emp)
      return { empId: '', department: '', position: '', photo: null as string | null | undefined };
    const code = emp.employeeCode ?? '';
    return {
      empId: code ? `Emp. ID: ${code}` : '',
      department: emp.departmentId != null ? `DEP. (G${emp.departmentId})` : '',
      position: emp.positionId != null ? `POS. (P${emp.positionId})` : '',
      photo: emp.employeePhoto ?? null,
    };
  });

  /** Total de días disponibles (suma de todos los periodos con setting) */
  readonly totalDaysAvailable = computed(() => {
    const periods = this.periodSummaries();
    return periods.reduce((sum, p) => sum + p.daysAvailable, 0);
  });

  /** Resúmenes por periodo para las tarjetas */
  readonly periodSummaries = computed(() => {
    const list = this.yearsWorked();
    const summaries: IPeriodSummary[] = [];
    let previousDaysAvailable: number | null = null;

    for (const y of list) {
      if (!y.vacationSetting) continue;

      const periodStart = new Date(y.year, 8, 15);
      const periodEnd = new Date(y.year + 1, 8, 14);
      const daysCorresponding = y.vacationSetting.vacationSettingVacationDays;
      const daysUsed = y.vacationsUsedList?.length ?? 0;
      const daysAvailable = Math.max(0, daysCorresponding - daysUsed);

      summaries.push({
        year: y.year,
        yearsPassed: y.yearsPassed,
        periodStart,
        periodEnd,
        periodLabel: this.formatPeriodRange(periodStart, periodEnd),
        daysCorresponding,
        daysUsed,
        daysAvailable,
        previousPeriodDaysAvailable: previousDaysAvailable,
        yearWorked: y,
      });

      previousDaysAvailable = daysAvailable;
    }

    return summaries;
  });

  manageDrawerVisible = signal(false);
  requestDrawerVisible = signal(false);
  selectedPeriod = signal<IPeriodSummary | null>(null);

  /** Lista de vacaciones ya usadas mostrada solo en el drawer (origen: API get-years-worked?year=). No se mezcla con días disponibles de la página. */
  drawerVacationsUsedList = signal<IVacationUsed[]>([]);
  /** true mientras se cargan las vacaciones del drawer para el año abierto. */
  drawerVacationsLoading = signal(false);

  ngOnInit(): void {
    if (this.user()?.person?.employee) {
      this.loading.set(false);
      void this.loadData();
      return;
    }
    const checkUser = setInterval(() => {
      if (this.user()?.person?.employee) {
        clearInterval(checkUser);
        this.loading.set(false);
        void this.loadData();
      }
    }, USER_CHECK_INTERVAL_MS);
    setTimeout(() => {
      clearInterval(checkUser);
      this.loading.set(false);
      if (!this.user()?.person?.employee) {
        this.loadError.set('vacationsModule.noEmployee');
      } else {
        void this.loadData();
      }
      this.cdr.markForCheck();
    }, USER_LOAD_TIMEOUT_MS);
  }

  /**
   * Carga años trabajados desde la API (solo lectura). Se llama cuando ya hay user.person.employee.
   */
  async loadData(): Promise<void> {
    const employeeId = this.employeeId();
    if (employeeId == null) return;

    this.loading.set(true);
    this.loadError.set(null);
    try {
      const data = await this.getYearsWorkedUseCase.execute(employeeId);
      this.yearsWorked.set(data ?? []);
    } finally {
      this.loading.set(false);
      this.cdr.markForCheck();
    }
  }

  /**
   * Formatea rango de fechas del periodo (ej. "septiembre 15, 2026 - septiembre 14, 2027")
   */
  formatPeriodRange(start: Date, end: Date): string {
    const opts: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return `${start.toLocaleDateString('es-MX', opts)} - ${end.toLocaleDateString('es-MX', opts)}`;
  }

  /**
   * Abre el drawer de gestión y consulta las vacaciones usadas de ese año (API get-years-worked?year=).
   * Usa variables propias del drawer (drawerVacationsUsedList / drawerVacationsLoading) para no cruzarse con la página.
   */
  openManageVacations(period: IPeriodSummary): void {
    this.drawerVacationsUsedList.set([]);
    this.drawerVacationsLoading.set(true);
    this.selectedPeriod.set(period);
    this.manageDrawerVisible.set(true);

    const employeeId = this.employeeId();
    if (employeeId != null) {
      const requestedYear = period.year;
      this.getYearsWorkedUseCase
        .execute(employeeId, requestedYear)
        .then((data) => {
          const list =
            data?.length && data[0]?.vacationsUsedList ? [...data[0].vacationsUsedList] : [];
          if (this.selectedPeriod()?.year === requestedYear) {
            this.drawerVacationsUsedList.set(list);
          }
          this.drawerVacationsLoading.set(false);
          this.cdr.markForCheck();
        })
        .catch(() => {
          if (this.selectedPeriod()?.year === requestedYear) {
            this.drawerVacationsUsedList.set([]);
          }
          this.drawerVacationsLoading.set(false);
          this.cdr.markForCheck();
        });
    } else {
      this.drawerVacationsLoading.set(false);
    }
  }

  closeManageVacations(): void {
    this.manageDrawerVisible.set(false);
    this.selectedPeriod.set(null);
    this.drawerVacationsUsedList.set([]);
    this.drawerVacationsLoading.set(false);
  }

  /**
   * Maneja el cambio de visibilidad del drawer de gestionar vacaciones
   */
  onManageDrawerVisibleChange(visible: boolean): void {
    this.manageDrawerVisible.set(visible);
    if (!visible) {
      this.selectedPeriod.set(null);
      this.drawerVacationsUsedList.set([]);
      this.drawerVacationsLoading.set(false);
    }
  }

  openRequestVacation(): void {
    this.requestDrawerVisible.set(true);
  }

  closeRequestVacation(): void {
    this.requestDrawerVisible.set(false);
  }
}
