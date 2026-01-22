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
   * Formatea la fecha para mostrar
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const currentLang = navigator.language || 'es-MX';
    const locale = currentLang.startsWith('en') ? 'en-US' : 'es-MX';
    return date.toLocaleDateString(locale, {
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
