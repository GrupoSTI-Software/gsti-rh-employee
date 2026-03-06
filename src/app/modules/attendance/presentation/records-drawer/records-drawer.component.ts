import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { TranslateService } from '@ngx-translate/core';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { IAssistance } from '../../domain/attendance.port';

@Component({
  selector: 'app-records-drawer',
  standalone: true,
  imports: [CommonModule, TranslatePipe, DrawerComponent],
  templateUrl: './records-drawer.component.html',
  styleUrl: './records-drawer.component.scss',
})
export class RecordsDrawerComponent {
  @Input() visible = false;
  @Input() records: IAssistance[] = [];
  @Input() title = 'Registros';
  @Input() cancelButtonText = 'Cancelar';
  @Output() visibleChange = new EventEmitter<boolean>();

  private readonly translateService = inject(TranslateService);

  /**
   * Cierra el drawer
   */
  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  /**
   * Formatea la fecha y hora del registro
   */
  formatRecordDateTime(dateString: string): string {
    const date = new Date(dateString);
    const currentLang = this.translateService.currentLang || 'es';
    const locale = currentLang === 'en' ? 'en-US' : 'es-MX';

    const dateStr = date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const timeStr = date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    return `${dateStr} ${timeStr}`;
  }

  /**
   * Formatea solo la hora del registro
   */
  formatRecordTime(dateString: string): string {
    const date = new Date(dateString);
    const currentLang = this.translateService.currentLang || 'es';
    const locale = currentLang === 'en' ? 'en-US' : 'es-MX';

    return date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }
}
