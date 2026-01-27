import {
  Component,
  inject,
  signal,
  OnInit,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { TranslateService } from '@ngx-translate/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { trigger, transition, style, animate } from '@angular/animations';
import { GetNoticesUseCase } from '../application/get-notices.use-case';
import { AUTH_PORT } from '@modules/auth/domain/auth.token';
import { IAuthPort } from '@modules/auth/domain/auth.port';
import { INotice, INoticesPaginatedResponse } from '../domain/notices.port';
import { LoggerService } from '@core/services/logger.service';

@Component({
  selector: 'app-notices-list',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './notices-list.component.html',
  styleUrl: './notices-list.component.scss',
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
export class NoticesListComponent implements OnInit {
  private readonly getNoticesUseCase = inject(GetNoticesUseCase);
  private readonly authPort = inject<IAuthPort>(AUTH_PORT);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly translateService = inject(TranslateService);
  private readonly logger = inject(LoggerService);

  readonly notices = signal<INotice[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly pagination = signal<INoticesPaginatedResponse['meta'] | null>(null);
  readonly currentPage = signal(1);
  readonly searchTerm = signal('');
  readonly readStatusFilter = signal<'all' | 'read' | 'unread'>('all');

  readonly hasNotices = computed(() => this.notices().length > 0);
  readonly hasUnreadNotices = computed(() =>
    this.notices().some(
      (notice) => notice.recipients && notice.recipients.length > 0 && !notice.recipients[0].noticeRecipientRead,
    ),
  );

  ngOnInit(): void {
    void this.loadNotices();
  }

  /**
   * Carga la lista de avisos
   */
  async loadNotices(page: number = 1): Promise<void> {
    const user = this.authPort.getCurrentUser();
    if (typeof user?.employeeId !== 'number') {
      this.error.set('No se encontró el ID del empleado');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.currentPage.set(page);

    try {
      const searchValue = this.searchTerm().trim();
      const response = await this.getNoticesUseCase.execute(
        user.employeeId,
        page,
        10,
        searchValue || undefined,
        this.readStatusFilter(),
      );

      if (response) {
        this.notices.set(response.data);
        this.pagination.set(response.meta);
      } else {
        this.error.set('Error al cargar los avisos');
      }
    } catch (err) {
      this.error.set('Error al cargar los avisos');
      this.logger.error('Error al cargar los avisos:', err);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Maneja el cambio en el input de búsqueda
   */
  onInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value);
  }

  /**
   * Maneja la búsqueda de avisos
   */
  onSearch(searchValue?: string): void {
    if (searchValue !== undefined) {
      this.searchTerm.set(searchValue);
    }
    void this.loadNotices(1);
  }

  /**
   * Maneja el cambio en el filtro de estado de lectura
   */
  onReadStatusChange(status: 'all' | 'read' | 'unread'): void {
    this.readStatusFilter.set(status);
    void this.loadNotices(1);
  }

  /**
   * Navega al detalle de un aviso
   */
  async goToNoticeDetail(noticeId: number): Promise<void> {
    await this.router.navigate(['/dashboard/notices', noticeId]);
  }

  /**
   * Verifica si un aviso está leído
   */
  isNoticeRead(notice: INotice): boolean {
    return (
      notice.recipients !== undefined &&
      notice.recipients.length > 0 &&
      notice.recipients[0].noticeRecipientRead === 1
    );
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
      month: 'short',
      day: 'numeric',
    });
  }

  /**
   * Obtiene el contenido HTML sanitizado para el preview
   * El truncado se maneja con CSS usando line-clamp
   */
  getPreviewHtml(htmlContent: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(htmlContent);
  }

  /**
   * Navega a la página anterior
   */
  previousPage(): void {
    const pagination = this.pagination();
    if (pagination && pagination.currentPage > 1) {
      void this.loadNotices(pagination.currentPage - 1);
    }
  }

  /**
   * Navega a la página siguiente
   */
  nextPage(): void {
    const pagination = this.pagination();
    if (pagination && pagination.currentPage < pagination.lastPage) {
      void this.loadNotices(pagination.currentPage + 1);
    }
  }

  /**
   * Verifica si hay página anterior
   */
  hasPreviousPage(): boolean {
    const pagination = this.pagination();
    return pagination ? pagination.currentPage > 1 : false;
  }

  /**
   * Verifica si hay página siguiente
   */
  hasNextPage(): boolean {
    const pagination = this.pagination();
    return pagination ? pagination.currentPage < pagination.lastPage : false;
  }
}
