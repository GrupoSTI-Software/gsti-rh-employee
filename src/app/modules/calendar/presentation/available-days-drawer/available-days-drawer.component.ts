import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import type { IPeriodSummary } from '@modules/calendar/domain/entities/period-summary.interface';

/**
 * Sidebar que muestra las vacaciones del empleado por periodo (tarjetas informativas).
 * Sin días tomados ni gestión de firmas.
 */
@Component({
  selector: 'app-available-days-drawer',
  standalone: true,
  imports: [CommonModule, TranslatePipe, DrawerComponent],
  templateUrl: './available-days-drawer.component.html',
  styleUrl: './available-days-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvailableDaysDrawerComponent {
  @Input() visible = false;
  @Input() periodSummaries: IPeriodSummary[] = [];
  @Input() loading = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  close(): void {
    this.visibleChange.emit(false);
  }
}
