import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SidebarService } from '@core/services/sidebar.service';
import { AUTH_PORT } from '@modules/auth/domain/auth.token';
import { AuthPort } from '@modules/auth/domain/auth.port';
import { BrandingService } from '@core/services/branding.service';
import { TranslatePipe } from '@shared/pipes/translate.pipe';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  private readonly sidebarService = inject(SidebarService);
  private readonly authPort = inject<AuthPort>(AUTH_PORT);
  private readonly router = inject(Router);
  readonly branding = inject(BrandingService);

  readonly logoUrl = computed(() => this.branding.getLogoUrl());
  readonly showLogo = computed(() =>
    !this.branding.loading() && !!this.branding.settings()
  );
  readonly userName = computed(() => {
    const user = this.authPort.getCurrentUser();
    return user?.name || user?.email || '';
  });

  toggleSidebar(): void {
    this.sidebarService.toggle();
  }

  logout(): void {
    this.authPort.logout();
    this.router.navigate(['/login']);
  }
}

