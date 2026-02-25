import {
  Component,
  inject,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { AUTH_PORT } from '@modules/auth/domain/auth.token';
import { IAuthPort } from '@modules/auth/domain/auth.port';
import { AvatarComponent } from '@shared/components/avatar/avatar.component';
import type { IPeriodSummary } from '../vacations-page/vacations-page.component';
import { IVacationUsed } from '@modules/vacations/domain/entities/vacation-used.interface';
import { parseLocalDate } from '@shared/utils/date.utils';

/**
 * Sidebar para gestionar vacaciones de un periodo.
 * Muestra información del empleado, periodo, métricas y lista de vacaciones tomadas.
 * Incluye botones Firmar y Agregar Vacaciones (prototipo UI).
 */
@Component({
  selector: 'app-manage-vacations-drawer',
  standalone: true,
  imports: [CommonModule, TranslatePipe, AvatarComponent],
  templateUrl: './manage-vacations-drawer.component.html',
  styleUrl: './manage-vacations-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManageVacationsDrawerComponent {
  private readonly authPort = inject<IAuthPort>(AUTH_PORT);

  @Input() visible = false;
  @Input() period: IPeriodSummary | null = null;
  /** Lista de vacaciones ya usadas solo para este drawer (origen: API por año). No se mezcla con la página. */
  @Input() drawerVacationsUsedList: IVacationUsed[] = [];
  /** true mientras se cargan las vacaciones del drawer. */
  @Input() drawerVacationsLoading = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  readonly employeeName = computed(() => this.authPort.getCurrentUser()?.name ?? '');
  readonly employeeInfo = computed(() => {
    const user = this.authPort.getCurrentUser();
    const emp = user?.person?.employee;
    const code = emp?.employeeCode ?? '';
    return {
      empId: code ? `Emp. ID: ${code}` : '',
      department: emp?.departmentId != null ? `DEP. (G${emp.departmentId})` : '',
      position: emp?.positionId != null ? `POS. (P${emp.positionId})` : '',
    };
  });

  readonly periodLabel = computed(() => this.period?.periodLabel ?? '');

  /** URL o base64 de la firma a mostrar en el modal (null = cerrado). */
  readonly signatureToShow = signal<string | null>(null);

  close(): void {
    this.visibleChange.emit(false);
  }

  /**
   * Formatea fecha de vacación para mostrar en la lista
   */
  formatVacationDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = parseLocalDate(dateStr);
    return d.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /** Abre el modal con la imagen de la firma. */
  showSignature(signatureDataUrl: string): void {
    this.signatureToShow.set(signatureDataUrl);
  }

  /** Cierra el modal de firma. */
  closeSignature(): void {
    this.signatureToShow.set(null);
  }

  onSign(): void {
    // Prototipo: sin lógica
  }

  onAddVacation(): void {
    // Prototipo: sin lógica (podría abrir request drawer)
  }
}
