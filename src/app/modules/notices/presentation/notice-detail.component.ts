import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  DestroyRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { TranslateService } from '@ngx-translate/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { GetNoticeByIdUseCase } from '../application/get-notice-by-id.use-case';
import { MarkNoticeAsReadUseCase } from '../application/mark-notice-as-read.use-case';
import { AUTH_PORT } from '@modules/auth/domain/auth.token';
import { IAuthPort } from '@modules/auth/domain/auth.port';
import { INotice } from '../domain/notices.port';
import { LoggerService } from '@core/services/logger.service';

const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i;
const PDF_EXTENSION = /\.pdf(\?.*)?$/i;
const URL_PATTERN = /^https?:\/\/.+/i;
const EXCEL_EXTENSION = /\.xlsx?(\?.*)?$/i;
const DOC_EXTENSION = /\.docx?(\?.*)?$/i;
const PPT_EXTENSION = /\.pptx?(\?.*)?$/i;
const TXT_EXTENSION = /\.txt?(\?.*)?$/i;

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
   * Determina si la descripción del aviso es una URL de imagen
   */
  readonly isImageUrl = computed(() => {
    const description = this.notice()?.noticeDescription?.trim() ?? '';
    return URL_PATTERN.test(description) && IMAGE_EXTENSIONS.test(description);
  });

  /**
   * Determina si la descripción del aviso es una URL de PDF
   */
  readonly isPdfUrl = computed(() => {
    const description = this.notice()?.noticeDescription?.trim() ?? '';
    return URL_PATTERN.test(description) && PDF_EXTENSION.test(description);
  });

  /**
   * Determina si la descripción es contenido HTML/texto plano (no es URL de recurso)
   */
  readonly isHtmlContent = computed(() => !this.isImageUrl() && !this.isPdfUrl());

  /**
   * URL sanitizada del PDF para usarla en el iframe
   */
  readonly safePdfUrl = computed<SafeResourceUrl | null>(() => {
    const description = this.notice()?.noticeDescription?.trim() ?? '';
    if (!this.isPdfUrl()) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(description);
  });

  /**
   * Extrae el nombre del archivo PDF desde la URL
   */
  readonly pdfFileName = computed(() => {
    const description = this.notice()?.noticeDescription?.trim() ?? '';
    if (!this.isPdfUrl()) return '';
    const segments = description.split('/');
    const lastSegment = segments[segments.length - 1] ?? '';
    return decodeURIComponent(lastSegment.split('?')[0]);
  });

  /**
   * Obtiene el contenido HTML sanitizado del aviso
   */
  getSafeHtml(content: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(content);
  }

  /**
   * Abre el PDF en una nueva pestaña
   */
  openPdfInNewTab(): void {
    const url = this.notice()?.noticeDescription?.trim();
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      void this.loadNotice();
    });
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

  /**
   * Determina si la descripción es una URL de imagen
   */
  isFileImageUrl(description: string): boolean {
    const trimmed = description?.trim() ?? '';
    return URL_PATTERN.test(trimmed) && IMAGE_EXTENSIONS.test(trimmed);
  }

  /**
   * Determina si la descripción es una URL de PDF
   */
  isFilePdfUrl(description: string): boolean {
    const trimmed = description?.trim() ?? '';
    return URL_PATTERN.test(trimmed) && PDF_EXTENSION.test(trimmed);
  }

  /** validar este tipo de archivos excel, doc, ppt, pdf, imagen, txt */
  isFileExcelUrl(description: string): boolean {
    const trimmed = description?.trim() ?? '';
    return URL_PATTERN.test(trimmed) && EXCEL_EXTENSION.test(trimmed);
  }

  isFileDocUrl(description: string): boolean {
    const trimmed = description?.trim() ?? '';
    return URL_PATTERN.test(trimmed) && DOC_EXTENSION.test(trimmed);
  }

  isFilePptUrl(description: string): boolean {
    const trimmed = description?.trim() ?? '';
    return URL_PATTERN.test(trimmed) && PPT_EXTENSION.test(trimmed);
  }

  isFileTxtUrl(description: string): boolean {
    const trimmed = description?.trim() ?? '';
    return URL_PATTERN.test(trimmed) && TXT_EXTENSION.test(trimmed);
  }

  isFileOtherUrl(description: string): boolean {
    const trimmed = description?.trim() ?? '';
    return (
      URL_PATTERN.test(trimmed) &&
      !IMAGE_EXTENSIONS.test(trimmed) &&
      !PDF_EXTENSION.test(trimmed) &&
      !EXCEL_EXTENSION.test(trimmed) &&
      !DOC_EXTENSION.test(trimmed) &&
      !PPT_EXTENSION.test(trimmed) &&
      !TXT_EXTENSION.test(trimmed)
    );
  }

  /**
   * Extrae el nombre del archivo desde una URL
   */
  getFileNameFromUrl(url: string): string {
    const segments = url.trim().split('/');
    const lastSegment = segments[segments.length - 1] ?? '';
    return decodeURIComponent(lastSegment.split('?')[0]);
  }
}
