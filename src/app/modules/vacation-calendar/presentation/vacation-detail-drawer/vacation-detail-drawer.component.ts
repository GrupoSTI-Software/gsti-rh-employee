import {
  Component,
  inject,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { TranslateService } from '@ngx-translate/core';
import { IVacationUsed } from '../../domain/entities/vacation-used.interface';
import { IVacationSetting } from '../../domain/entities/vacation-setting.interface';
import { trigger, transition, style, animate } from '@angular/animations';

/**
 * Componente drawer para mostrar el detalle de un día de vacaciones
 */
@Component({
  selector: 'app-vacation-detail-drawer',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './vacation-detail-drawer.component.html',
  styleUrl: './vacation-detail-drawer.component.scss',
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
export class VacationDetailDrawerComponent implements OnChanges {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly translateService = inject(TranslateService);

  @Input() vacation: IVacationUsed | null = null;
  @Input() vacationSetting: IVacationSetting | null = null;
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() signRequested = new EventEmitter<IVacationUsed>();

  ngOnChanges(changes: SimpleChanges): void {
    // Forzar detección de cambios cuando cambia visible
    if (changes['visible']) {
      this.cdr.markForCheck();
    }
  }

  /**
   * Maneja cuando el drawer se muestra
   */
  onShow(): void {
    // Método para compatibilidad, se puede usar para inicializaciones si es necesario
  }

  /**
   * Cierra el drawer
   */
  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  /**
   * Verifica si la vacación está firmada
   */
  isSigned(): boolean {
    return !!this.vacation?.employeeSignature;
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
   * Formatea la fecha para mostrar
   * Normaliza la fecha para evitar problemas de zona horaria
   * Usa el idioma configurado en la aplicación a través de TranslateService
   */
  formatDate(dateString: string): string {
    // Normalizar la fecha para evitar problemas de zona horaria
    const date = this.parseDateString(dateString);
    
    // Usar el idioma configurado en la aplicación en lugar de navigator.language
    const currentLang = this.translateService.currentLang || 'es';
    const locale = currentLang === 'en' ? 'en-US' : 'es-MX';
    
    // Convertir la fecha UTC a fecha local para mostrar correctamente
    // pero manteniendo los valores de día, mes y año correctos
    const localDate = new Date(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate()
    );
    
    return localDate.toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Obtiene el periodo de vacaciones
   */
  getPeriod(): string {
    if (!this.vacationSetting) {
      return '';
    }
    return `${this.vacationSetting.vacationSettingYearsOfService} ${this.vacationSetting.vacationSettingYearsOfService === 1 ? 'año' : 'años'}`;
  }

  /**
   * Maneja la solicitud de firma
   */
  onSignRequest(): void {
    if (this.vacation) {
      this.signRequested.emit(this.vacation);
    }
  }
}
