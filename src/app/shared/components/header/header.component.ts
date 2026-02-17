import { Component, inject, computed, signal, OnInit, OnDestroy, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser, Location } from '@angular/common';
import { Router, NavigationEnd, RouterLink, RouterLinkActive } from '@angular/router';
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

  readonly menuItems: MenuItem[] = [
    {
      label: 'Asistencia',
      route: '/dashboard/checkin',
      icon: 'pi-clock',
      translationKey: 'menu.attendance',
    },
    {
      label: 'Calendario',
      route: '/dashboard/vacations',
      icon: 'pi-calendar',
      translationKey: 'menu.calendar',
    },
    {
      label: 'Avisos',
      route: '/dashboard/notices',
      icon: 'pi-bell',
      translationKey: 'menu.notices',
      badgeCount: () => this.unreadCount(),
    },
    {
      label: 'Perfil',
      route: '/dashboard/profile',
      icon: 'pi-user',
      translationKey: 'menu.profile',
    },
    {
      label: 'Configuración',
      route: '/dashboard/settings',
      icon: 'pi-cog',
      translationKey: 'menu.settings',
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
}
