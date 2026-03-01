import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { TranslateService } from '@ngx-translate/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { GetNoticeByIdUseCase } from '../application/get-notice-by-id.use-case';
import { MarkNoticeAsReadUseCase } from '../application/mark-notice-as-read.use-case';
import { AUTH_PORT } from '@modules/auth/domain/auth.token';
import { IAuthPort } from '@modules/auth/domain/auth.port';
import { INotice } from '../domain/notices.port';
import { LoggerService } from '@core/services/logger.service';

@Component({
  selector: 'app-notice-detail',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './notice-detail.component.html',
  styleUrl: './notice-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('500ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('400ms ease-out', style({ opacity: 1 })),
      ]),
    ]),
  ],
})
export class NoticeDetailComponent implements OnInit {
  private readonly getNoticeByIdUseCase = inject(GetNoticeByIdUseCase);
  private readonly markNoticeAsReadUseCase = inject(MarkNoticeAsReadUseCase);
  private readonly authPort = inject<IAuthPort>(AUTH_PORT);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly translateService = inject(TranslateService);
  private readonly logger = inject(LoggerService);

  readonly notice = signal<INotice | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  /**
   * Obtiene el contenido HTML sanitizado del aviso
   */
  getSafeHtml(content: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(content);
  }

  ngOnInit(): void {
    void this.loadNotice();
  }

  /**
   * Carga el detalle del aviso y lo marca como leído
   */
  async loadNotice(): Promise<void> {
    const user = this.authPort.getCurrentUser();
    if (typeof user?.employeeId !== 'number') {
      this.error.set('No se encontró el ID del empleado');
      return;
    }

    const noticeId = Number(this.route.snapshot.paramMap.get('id'));
    if (!noticeId || Number.isNaN(noticeId)) {
      this.error.set('ID de aviso inválido');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      // Obtener el aviso
      const notice = await this.getNoticeByIdUseCase.execute(noticeId, user.employeeId);

      if (!notice) {
        this.error.set('Aviso no encontrado');
        return;
      }

      this.notice.set(notice);

      // Marcar como leído si no está leído
      const recipient =
        notice.recipients && notice.recipients.length > 0 && notice.recipients[0]
          ? notice.recipients[0]
          : null;
      if (recipient && !recipient.noticeRecipientRead) {
        const marked = await this.markNoticeAsReadUseCase.execute(noticeId, user.employeeId);
        if (marked && recipient) {
          // Actualizar el estado local
          recipient.noticeRecipientRead = true;
          recipient.noticeRecipientReadAt = new Date().toISOString();
        }
      }
    } catch (err) {
      this.error.set('Error al cargar el aviso');
      this.logger.error('Error al cargar el aviso:', err);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Formatea la fecha del aviso
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const currentLang = this.translateService.currentLang || 'es';
    const locale = currentLang === 'en' ? 'en-US' : 'es-MX';
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Regresa a la lista de avisos
   */
  goBack(): void {
    void this.router.navigate(['/dashboard/notices']);
  }
}
