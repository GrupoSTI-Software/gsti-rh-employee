import { Component, inject, computed, signal, OnInit, OnDestroy, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser, Location } from '@angular/common';
import { Router, NavigationEnd, RouterLink, RouterLinkActive } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SidebarService } from '@core/services/sidebar.service';
import { AUTH_PORT } from '@modules/auth/domain/auth.token';
import { IAuthPort } from '@modules/auth/domain/auth.port';
import { BrandingService } from '@core/services/branding.service';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { filter, Subscription, interval } from 'rxjs';
import { GetUnreadCountUseCase } from '@modules/notices/application/get-unread-count.use-case';

export interface MenuItem {
  label: string;
  route: string;
  icon: string;
  translationKey: string;
  badgeCount?: () => number;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, TranslatePipe, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnInit, OnDestroy {
  private readonly sidebarService = inject(SidebarService);
  private readonly authPort = inject<IAuthPort>(AUTH_PORT);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly getUnreadCountUseCase = inject(GetUnreadCountUseCase);
  private readonly sanitizer = inject(DomSanitizer);
  readonly branding = inject(BrandingService);

  private routerSubscription?: Subscription;
  private unreadCountInterval?: Subscription;
  private navigationHistory: string[] = [];
  private currentHistoryIndex = -1;
  private isNavigatingProgrammatically = false;

  readonly canGoBack = signal(false);
  readonly canGoForward = signal(false);
  readonly unreadCount = signal<number>(0);

  readonly logoUrl = computed(() => this.branding.getLogoUrl());
  readonly showLogo = computed(() => !this.branding.loading() && !!this.branding.settings());
  readonly userName = computed(() => {
    const user = this.authPort.getCurrentUser();
    if (user?.person) {
      const parts: string[] = [];
      if (user.person.personFirstname) parts.push(user.person.personFirstname);
      if (user.person.personLastname) parts.push(user.person.personLastname);
      if (parts.length > 0) {
        return parts.join(' ');
      }
    }
    return user?.name ?? user?.email ?? '';
  });

  readonly menuIcon = computed(() => {
    return `<svg
      xmlns="http://www.w3.org/2000/svg"
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#88a4bf"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M10 6h10" />
      <path d="M4 12h16" />
      <path d="M7 12h13" />
      <path d="M4 18h10" />
    </svg>`;
  });

  readonly menuItems: MenuItem[] = [
    {
      label: 'Asistencia',
      route: '/dashboard/checkin',
      icon: `<svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#88a4bf"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M20.971 11.278a9 9 0 1 0 -8.313 9.698" />
        <path d="M12 7v5l1.5 1.5" />
        <path d="M21.121 20.121a3 3 0 1 0 -4.242 0c.418 .419 1.125 1.045 2.121 1.879c1.051 -.89 1.759 -1.516 2.121 -1.879z" />
        <path d="M19 18v.01" />
      </svg>`,
      translationKey: 'menu.attendance',
    },
    {
      label: 'Vacaciones',
      route: '/dashboard/vacations',
      icon: `<svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#88a4bf"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M17.553 16.75a7.5 7.5 0 0 0 -10.606 0" />
        <path d="M18 3.804a6 6 0 0 0 -8.196 2.196l10.392 6a6 6 0 0 0 -2.196 -8.196z" />
        <path d="M16.732 10c1.658 -2.87 2.225 -5.644 1.268 -6.196c-.957 -.552 -3.075 1.326 -4.732 4.196" />
        <path d="M15 9l-3 5.196" />
        <path d="M3 19.25a2.4 2.4 0 0 1 1 -.25a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1a2.4 2.4 0 0 0 2 -1a2.4 2.4 0 0 1 2 -1a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1a2.4 2.4 0 0 0 2 -1a2.4 2.4 0 0 1 2 -1a2.4 2.4 0 0 1 1 .25" />
      </svg>`,
      translationKey: 'menu.vacations',
    },
    {
      label: 'Calendario general',
      route: '/dashboard/calendar',
      icon: `<svg
        xmlns="http://www.w3.org/2000/svg"
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#88a4bf"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12z" />
        <path d="M16 3v4" />
        <path d="M8 3v4" />
        <path d="M4 11h16" />
        <path d="M7 14h.013" />
        <path d="M10.01 14h.005" />
        <path d="M13.01 14h.005" />
        <path d="M16.015 14h.005" />
        <path d="M13.015 17h.005" />
        <path d="M7.01 17h.005" />
        <path d="M10.01 17h.005" />
      </svg>`,
      translationKey: 'menu.calendarGeneral',
    },
    {
      label: 'Avisos',
      route: '/dashboard/notices',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#88a4bf" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 8a3 3 0 0 1 0 6"></path>
        <path d="M10 8v11a1 1 0 0 1 -1 1h-1a1 1 0 0 1 -1 -1v-5"></path>
        <path d="M12 8h0l4.524 -3.77a.9 .9 0 0 1 1.476 .692v12.156a.9 .9 0 0 1 -1.476 .692l-4.524 -3.77h-8a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h8"></path>
      </svg>`,
      translationKey: 'menu.notices',
      badgeCount: () => this.unreadCount(),
    },
    {
      label: 'Perfil',
      route: '/dashboard/profile',
      icon: `<svg
        xmlns="http://www.w3.org/2000/svg"
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#88a4bf"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" />
        <path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" />
      </svg>`,
      translationKey: 'menu.profile',
    },
  ];

  ngOnInit(): void {
    // Cargar el conteo inicial de avisos no leídos
    void this.loadUnreadCount();

    // Actualizar el conteo cada 30 segundos
    this.unreadCountInterval = interval(30000).subscribe(() => {
      void this.loadUnreadCount();
    });

    if (isPlatformBrowser(this.platformId)) {
      // Inicializar con la URL actual
      const currentUrl = this.router.url;
      this.navigationHistory.push(currentUrl);
      this.currentHistoryIndex = 0;
      this.updateNavigationState();

      // Suscribirse a cambios de navegación para actualizar el estado
      this.routerSubscription = this.router.events
        .pipe(filter((event) => event instanceof NavigationEnd))
        .subscribe((event) => {
          if (this.isNavigatingProgrammatically) {
            // Si estamos navegando programáticamente, solo actualizamos el estado
            this.isNavigatingProgrammatically = false;
            this.updateNavigationState();
            return;
          }

          const url = (event as NavigationEnd).urlAfterRedirects ?? (event as NavigationEnd).url;

          // Actualizar el conteo cuando se navega desde o hacia avisos
          if (url.includes('/notices')) {
            void this.loadUnreadCount();
          }

          // Si navegamos hacia adelante desde una posición anterior en el historial
          if (this.currentHistoryIndex < this.navigationHistory.length - 1) {
            // Estamos navegando hacia adelante en el historial
            const nextUrl = this.navigationHistory[this.currentHistoryIndex + 1];
            if (nextUrl === url) {
              // Es una navegación forward, solo actualizamos el índice
              this.currentHistoryIndex++;
            } else {
              // Nueva navegación, truncar el historial desde aquí
              this.navigationHistory = this.navigationHistory.slice(
                0,
                this.currentHistoryIndex + 1,
              );
              this.navigationHistory.push(url);
              this.currentHistoryIndex = this.navigationHistory.length - 1;
            }
          } else {
            // Nueva navegación (no es back/forward)
            this.navigationHistory.push(url);
            this.currentHistoryIndex = this.navigationHistory.length - 1;
          }

          this.updateNavigationState();
        });
    }
  }

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
    this.unreadCountInterval?.unsubscribe();
  }

  /**
   * Carga el conteo de avisos no leídos
   */
  async loadUnreadCount(): Promise<void> {
    const user = this.authPort.getCurrentUser();
    if (typeof user?.employeeId === 'number') {
      const count = await this.getUnreadCountUseCase.execute(user.employeeId);
      this.unreadCount.set(count);
    }
  }

  private updateNavigationState(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Verificar si podemos ir hacia atrás
    // Usamos tanto nuestro historial interno como el del navegador
    const canBack = this.currentHistoryIndex > 0 || window.history.length > 1;

    // Verificar si podemos ir hacia adelante usando nuestro historial interno
    const canForward = this.currentHistoryIndex < this.navigationHistory.length - 1;

    this.canGoBack.set(canBack);
    this.canGoForward.set(canForward);
  }

  goBack(): void {
    if (isPlatformBrowser(this.platformId) && this.canGoBack()) {
      // Si tenemos historial interno y no estamos en el inicio, usar nuestro historial
      if (this.currentHistoryIndex > 0) {
        this.isNavigatingProgrammatically = true;
        this.currentHistoryIndex--;
        const targetUrl = this.navigationHistory[this.currentHistoryIndex];
        void this.router.navigateByUrl(targetUrl);
      } else {
        // Usar el historial del navegador
        this.location.back();
      }
      // Actualizar estado después de un breve delay
      setTimeout(() => this.updateNavigationState(), 100);
    }
  }

  goForward(): void {
    if (isPlatformBrowser(this.platformId) && this.canGoForward()) {
      // Si tenemos historial interno y no estamos al final, usar nuestro historial
      if (this.currentHistoryIndex < this.navigationHistory.length - 1) {
        this.isNavigatingProgrammatically = true;
        this.currentHistoryIndex++;
        const targetUrl = this.navigationHistory[this.currentHistoryIndex];
        void this.router.navigateByUrl(targetUrl);
      } else {
        // Usar el historial del navegador
        this.location.forward();
      }
      // Actualizar estado después de un breve delay
      setTimeout(() => this.updateNavigationState(), 100);
    }
  }

  toggleSidebar(): void {
    this.sidebarService.toggle();
  }

  logout(): void {
    void this.authPort.logout();
    void this.router.navigate(['/login']);
  }

  /**
   * Sanitiza el HTML del icono para que pueda ser renderizado de forma segura
   */
  getSafeIcon(icon: string): SafeHtml {
    // Si el icono comienza con '<', es HTML/SVG, sanitizarlo
    if (icon.startsWith('<')) {
      return this.sanitizer.bypassSecurityTrustHtml(icon);
    }
    // Si no, es una clase de PrimeIcons, devolverlo tal cual
    return icon;
  }
}
