import { Component, inject, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';
import { SidebarService } from '@core/services/sidebar.service';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { AUTH_PORT } from '@modules/auth/domain/auth.token';
import { AuthPort } from '@modules/auth/domain/auth.port';
import { trigger, transition, style, animate } from '@angular/animations';

export interface MenuItem {
  label: string;
  route: string;
  icon: string;
  translationKey: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateX(-100%)' }),
        animate('300ms ease-out', style({ transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateX(-100%)' }))
      ])
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 }))
      ])
    ])
  ]
})
export class SidebarComponent implements OnInit, OnDestroy {
  private readonly sidebarService = inject(SidebarService);
  private readonly router = inject(Router);
  private readonly authPort = inject<AuthPort>(AUTH_PORT);
  private subscription?: Subscription;

  isOpen = false;

  readonly user = computed(() => this.authPort.getCurrentUser());
  readonly userName = computed(() => {
    const user = this.user();
    return user?.name || user?.email || '';
  });
  readonly userEmail = computed(() => {
    const user = this.user();
    return user?.email || '';
  });
  readonly userInitials = computed(() => {
    const user = this.user();
    if (!user?.name) {
      // Si no hay nombre, usar las primeras letras del email
      const email = user?.email || '';
      if (email.length >= 2) {
        return email.substring(0, 2).toUpperCase();
      }
      return 'U';
    }
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return user.name[0].toUpperCase();
  });

  readonly menuItems: MenuItem[] = [
    {
      label: 'Asistencia',
      route: '/dashboard/checkin',
      icon: 'pi-clock',
      translationKey: 'menu.attendance'
    },
    {
      label: 'Perfil',
      route: '/dashboard/profile',
      icon: 'pi-user',
      translationKey: 'menu.profile'
    },
    {
      label: 'Configuración',
      route: '/dashboard/settings',
      icon: 'pi-cog',
      translationKey: 'menu.settings'
    },
    {
      label: 'Biometría',
      route: '/dashboard/biometrics',
      icon: 'pi-shield',
      translationKey: 'menu.biometrics'
    }
  ];

  ngOnInit(): void {
    this.subscription = this.sidebarService.sidebarState$.subscribe(
      (isOpen) => {
        this.isOpen = isOpen;
      }
    );
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  close(): void {
    this.sidebarService.close();
  }

  navigate(route: string): void {
    this.router.navigate([route]);
    this.close();
  }

  logout(): void {
    this.authPort.logout();
    this.close();
    this.router.navigate(['/login']);
  }
}

