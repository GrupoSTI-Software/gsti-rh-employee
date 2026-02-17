import { Component, inject, OnInit, OnDestroy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { Subscription, interval, filter } from 'rxjs';
import { SidebarService } from '@core/services/sidebar.service';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { AUTH_PORT } from '@modules/auth/domain/auth.token';
import { IAuthPort } from '@modules/auth/domain/auth.port';
import { AvatarComponent } from '@shared/components/avatar/avatar.component';
import { trigger, transition, style, animate } from '@angular/animations';
import { GetUnreadCountUseCase } from '@modules/notices/application/get-unread-count.use-case';

export interface MenuItem {
  label: string;
  route: string;
  icon: string;
  translationKey: string;
  badgeCount?: () => number;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslatePipe, AvatarComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateX(-100%)' }),
        animate('300ms ease-out', style({ transform: 'translateX(0)' })),
      ]),
      transition(':leave', [animate('300ms ease-in', style({ transform: 'translateX(-100%)' }))]),
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 })),
      ]),
    ]),
  ],
})
export class SidebarComponent implements OnInit, OnDestroy {
  private readonly sidebarService = inject(SidebarService);
  private readonly router = inject(Router);
  private readonly authPort = inject<IAuthPort>(AUTH_PORT);
  private readonly getUnreadCountUseCase = inject(GetUnreadCountUseCase);
  private subscription?: Subscription;
  private unreadCountInterval?: Subscription;
  private routerSubscription?: Subscription;

  isOpen = false;
  readonly unreadCount = signal<number>(0);

  readonly user = computed(() => this.authPort.getCurrentUser());
  readonly userName = computed(() => {
    const user = this.user();
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
  readonly userEmail = computed(() => {
    const user = this.user();
    return user?.email ?? '';
  });

  readonly menuItems: MenuItem[] = [
    {
      label: 'Configuración',
      route: '/dashboard/settings',
      icon: 'pi-cog',
      translationKey: 'menu.settings',
    },
  ];

  ngOnInit(): void {
    this.subscription = this.sidebarService.sidebarState$.subscribe((isOpen) => {
      this.isOpen = isOpen;
    });

    // Cargar el conteo inicial de avisos no leídos
    void this.loadUnreadCount();

    // Actualizar el conteo cada 30 segundos
    this.unreadCountInterval = interval(30000).subscribe(() => {
      void this.loadUnreadCount();
    });

    // Actualizar el conteo cuando se navega a avisos (para refrescar después de marcar como leído)
    this.routerSubscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        const navEvent = event as NavigationEnd;
        // Actualizar el conteo cuando se navega desde o hacia avisos
        if (navEvent.url.includes('/notices')) {
          void this.loadUnreadCount();
        }
      });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    this.unreadCountInterval?.unsubscribe();
    this.routerSubscription?.unsubscribe();
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

  close(): void {
    this.sidebarService.close();
  }

  navigate(route: string): void {
    void this.router.navigate([route]);
    this.close();
  }

  logout(): void {
    void this.authPort.logout();
    this.close();
    void this.router.navigate(['/login']);
  }
}
