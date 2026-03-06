import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { TranslateService } from '@ngx-translate/core';
import { DrawerComponent } from '@shared/components/drawer/drawer.component';
import { IException } from '../../domain/attendance.port';
import { parseLocalDate } from '@shared/utils/date.utils';

@Component({
  selector: 'app-exceptions-drawer',
  standalone: true,
  imports: [CommonModule, TranslatePipe, DrawerComponent],
  templateUrl: './exceptions-drawer.component.html',
  styleUrl: './exceptions-drawer.component.scss',
})
export class ExceptionsDrawerComponent {
  @Input() visible = false;
  @Input() exceptions: IException[] = [];
  @Input() title = 'Excepciones';
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
   * Formatea la fecha de la excepción
   */
  formatExceptionDate(dateString: string): string {
    const date = parseLocalDate(dateString);
    const currentLang = this.translateService.currentLang || 'es';
    const locale = currentLang === 'en' ? 'en-US' : 'es-MX';
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
