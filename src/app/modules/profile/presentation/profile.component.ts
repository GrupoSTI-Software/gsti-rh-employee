import {
  Component,
  inject,
  signal,
  OnInit,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { TranslateService } from '@ngx-translate/core';
import { AUTH_PORT } from '@modules/auth/domain/auth.token';
import { IAuthPort } from '@modules/auth/domain/auth.port';
import { AvatarComponent } from '@shared/components/avatar/avatar.component';
import { LoggerService } from '@core/services/logger.service';
import { GetEmployeeProfileUseCase } from '../application/get-employee-profile.use-case';
import { IEmployeeProfile } from '../domain/profile.port';
import { parseLocalDate } from '@shared/utils/date.utils';

/**
 * Tipo literal para las secciones/tabs del perfil
 */
type ProfileTab = 'work' | 'personal' | 'health' | 'records' | 'address' | 'responsibles';

/**
 * Definición de un tab del perfil con su icono
 */
interface IProfileTabDef {
  key: ProfileTab;
  labelKey: string;
  icon: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, TranslatePipe, AvatarComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent implements OnInit {
  private readonly authPort = inject<IAuthPort>(AUTH_PORT);
  private readonly translateService = inject(TranslateService);
  private readonly logger = inject(LoggerService);
  private readonly getEmployeeProfileUseCase = inject(GetEmployeeProfileUseCase);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly copiedField = signal<string | null>(null);
  readonly activeTab = signal<ProfileTab>('work');
  readonly profile = signal<IEmployeeProfile | null>(null);

  readonly user = computed(() => this.authPort.getCurrentUser());

  readonly fullName = computed(() => {
    const p = this.profile();
    if (p) {
      return [p.employeeFirstName, p.employeeLastName, p.employeeSecondLastName]
        .filter(Boolean)
        .join(' ');
    }
    const user = this.user();
    return user?.name ?? user?.email ?? '';
  });

  readonly employeeCode = computed(() => this.profile()?.employeeCode ?? null);

  readonly departmentName = computed(() => this.profile()?.department?.departmentName ?? null);

  readonly positionName = computed(() => this.profile()?.position?.positionName ?? null);

  readonly seniority = computed(() => {
    const hireDate = this.profile()?.employeeHireDate;
    if (!hireDate) return null;
    return this.calculateSeniority(hireDate);
  });

  readonly isMarriedOrUnion = computed(() => {
    const status = this.profile()?.person?.personMaritalStatus;
    return status === 'Married' || status === 'Free Union';
  });

  /**
   * Obtiene el teléfono del cónyuge desde el contacto de emergencia
   * cuya relación sea "Esposa" o "Esposo"
   */
  readonly spousePhone = computed(() => {
    const contacts = this.profile()?.emergencyContacts;
    if (!contacts?.length) return null;
    const spouseContact = contacts.find(
      (c) =>
        c.employeeEmergencyContactRelationship === 'Esposa' ||
        c.employeeEmergencyContactRelationship === 'Esposo',
    );
    return spouseContact?.employeeEmergencyContactPhone ?? null;
  });

  /**
   * Convierte el diccionario de categorías de registros a un array iterable
   * para poder usarlo con @for en el template
   */
  readonly recordCategoryList = computed(() => {
    const categories = this.profile()?.recordCategories;
    if (!categories) return [];
    return Object.entries(categories).map(([categoryName, properties]) => ({
      categoryName,
      properties,
    }));
  });

  readonly tabs: IProfileTabDef[] = [
    { key: 'work', labelKey: 'profile.tabs.work', icon: 'pi pi-briefcase' },
    { key: 'personal', labelKey: 'profile.tabs.personal', icon: 'pi pi-user' },
    { key: 'health', labelKey: 'profile.tabs.health', icon: 'pi pi-heart' },
    { key: 'records', labelKey: 'profile.tabs.records', icon: 'pi pi-list' },
    { key: 'address', labelKey: 'profile.tabs.address', icon: 'pi pi-map-marker' },
    { key: 'responsibles', labelKey: 'profile.tabs.responsibles', icon: 'pi pi-users' },
  ];

  ngOnInit(): void {
    void this.loadProfile();
  }

  /**
   * Carga el perfil completo del empleado desde la API
   */
  private async loadProfile(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    const user = this.user();
    const employeeId = user?.employeeId ?? user?.person?.employee?.employeeId;

    if (!employeeId) {
      this.loading.set(false);
      this.error.set(this.translateService.instant('profile.error'));
      return;
    }

    const result = await this.getEmployeeProfileUseCase.execute(employeeId);

    if (result) {
      this.profile.set(result);
    } else {
      this.error.set(this.translateService.instant('profile.error'));
    }

    this.loading.set(false);
  }

  /**
   * Cambia la sección activa del perfil
   */
  selectTab(tab: ProfileTab): void {
    this.activeTab.set(tab);
  }

  /**
   * Obtiene el valor legible para campos numéricos tipo switch (0/1)
   * donde 0 = "No" y 1 = "Sí" (o equivalente traducido)
   */
  getWorkModalityLabel(value: string | undefined): string {
    if (!value) return '---';
    const map: Record<string, { es: string; en: string }> = {
      Onsite: { es: 'Presencial', en: 'Onsite' },
      Remote: { es: 'Remoto', en: 'Remote' },
      Hybrid: { es: 'Híbrido', en: 'Hybrid' },
    };
    const lang = this.translateService.currentLang ?? 'es';
    return map[value]?.[lang as 'es' | 'en'] ?? value;
  }

  /**
   * Obtiene la etiqueta legible para el discriminador de asistencia
   */
  getAssistDiscriminatorLabel(value: number | undefined): string {
    if (value === undefined || value === null) return '---';
    const lang = this.translateService.currentLang ?? 'es';
    const labels: Record<number, { es: string; en: string }> = {
      0: {
        es: 'No discriminar en el informe de asistencias',
        en: 'Do not discriminate in attendance report',
      },
      1: {
        es: 'Discriminar en el informe de asistencias',
        en: 'Discriminate in attendance report',
      },
    };
    return labels[value]?.[lang as 'es' | 'en'] ?? '---';
  }

  /**
   * Obtiene la etiqueta para ignorar ausencias consecutivas
   */
  getIgnoreConsecutiveAbsencesLabel(value: number | undefined): string {
    if (value === undefined || value === null) return '---';
    const lang = this.translateService.currentLang ?? 'es';
    const labels: Record<number, { es: string; en: string }> = {
      0: {
        es: 'No ignorar el informe de ausencias consecutivas',
        en: 'Do not ignore consecutive absences report',
      },
      1: {
        es: 'Ignorar el informe de ausencias consecutivas',
        en: 'Ignore consecutive absences report',
      },
    };
    return labels[value]?.[lang as 'es' | 'en'] ?? '---';
  }

  /**
   * Obtiene la etiqueta para autorización de cualquier zona
   */
  getAuthorizeAnyZoneLabel(value: number | undefined): string {
    if (value === undefined || value === null) return '---';
    const lang = this.translateService.currentLang ?? 'es';
    const labels: Record<number, { es: string; en: string }> = {
      0: { es: 'No autorizar ninguna zona', en: 'Do not authorize any zone' },
      1: { es: 'Autorizar cualquier zona', en: 'Authorize any zone' },
    };
    return labels[value]?.[lang as 'es' | 'en'] ?? '---';
  }

  /**
   * Obtiene la etiqueta del tipo de contrato
   */
  getContractTypeLabel(value: string | undefined): string {
    if (!value) return '---';
    const lang = this.translateService.currentLang ?? 'es';
    const map: Record<string, { es: string; en: string }> = {
      Internal: { es: 'Interno', en: 'Internal' },
      External: { es: 'Externo', en: 'External' },
    };
    return map[value]?.[lang as 'es' | 'en'] ?? value;
  }

  /**
   * Traduce el género del API (Hombre/Mujer) al idioma actual
   */
  getGenderLabel(value: string | undefined): string {
    if (!value) return '---';
    const lang = this.translateService.currentLang ?? 'es';
    const map: Record<string, { es: string; en: string }> = {
      Hombre: { es: 'Hombre', en: 'Male' },
      Mujer: { es: 'Mujer', en: 'Female' },
    };
    return map[value]?.[lang as 'es' | 'en'] ?? value;
  }

  /**
   * Traduce el estado civil del API al idioma actual
   */
  getMaritalStatusLabel(value: string | undefined): string {
    if (!value) return '---';
    const lang = this.translateService.currentLang ?? 'es';
    const map: Record<string, { es: string; en: string }> = {
      Single: { es: 'Soltero(a)', en: 'Single' },
      Married: { es: 'Casado(a)', en: 'Married' },
      Divorced: { es: 'Divorciado(a)', en: 'Divorced' },
      Widowed: { es: 'Viudo(a)', en: 'Widowed' },
      'Free Union': { es: 'Unión libre', en: 'Free Union' },
    };
    return map[value]?.[lang as 'es' | 'en'] ?? value;
  }

  /**
   * Calcula la edad en años a partir de una fecha de nacimiento
   */
  calculateAge(birthday: string | undefined): string | null {
    if (!birthday) return null;
    const birth = new Date(birthday);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const monthDiff = now.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    const lang = this.translateService.currentLang ?? 'es';
    const label = lang === 'en' ? 'Years old' : 'Años';
    return `${age} ${label}`;
  }

  /**
   * Formatea una fecha para mostrar según el idioma seleccionado
   */
  formatDate(dateString: string | undefined): string {
    if (!dateString) return '---';
    try {
      const date = parseLocalDate(dateString);
      const lang = this.translateService.currentLang ?? 'es';
      const locale = lang === 'en' ? 'en-US' : 'es-MX';
      return date.toLocaleDateString(locale, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  }

  /**
   * Formatea un valor monetario (el API retorna dailySalary como string)
   */
  formatCurrency(value: string | number | undefined): string {
    if (value === undefined || value === null) return '---';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return '---';
    return `$${numValue.toFixed(4)}`;
  }

  /**
   * Copia un valor al portapapeles y muestra feedback visual
   */
  async copyToClipboard(value: string | undefined | null, fieldName: string): Promise<void> {
    if (!value || value === '---') return;

    try {
      await navigator.clipboard.writeText(value);
      this.copiedField.set(fieldName);
      setTimeout(() => this.copiedField.set(null), 2000);
    } catch (err) {
      this.logger.error('Error al copiar al portapapeles:', err);
    }
  }

  /**
   * Calcula el tiempo de antigüedad desde la fecha de ingreso
   */
  private calculateSeniority(hireDate: string): string {
    const hire = new Date(hireDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - hire.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    const days = diffDays % 30;

    const lang = this.translateService.currentLang ?? 'es';
    const isEnglish = lang === 'en';
    const parts: string[] = [];

    if (years > 0) {
      const yearLabel = isEnglish ? (years === 1 ? 'year' : 'years') : years === 1 ? 'año' : 'años';
      parts.push(`${years} ${yearLabel}`);
    }
    if (months > 0) {
      const monthLabel = isEnglish
        ? months === 1
          ? 'month'
          : 'months'
        : months === 1
          ? 'mes'
          : 'meses';
      parts.push(`${months} ${monthLabel}`);
    }
    if (days > 0 && years === 0) {
      const dayLabel = isEnglish ? (days === 1 ? 'day' : 'days') : days === 1 ? 'día' : 'días';
      parts.push(`${days} ${dayLabel}`);
    }

    return parts.length > 0 ? parts.join(' y ') : isEnglish ? '0 days' : '0 días';
  }
}
