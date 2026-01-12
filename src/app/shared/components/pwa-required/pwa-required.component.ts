import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { PwaDetectionService } from '@core/services/pwa-detection.service';
import { BrandingService } from '@core/services/branding.service';
import { ThemeService } from '@core/services/theme.service';
import { LanguageSelectorComponent } from '@shared/components/language-selector/language-selector.component';

@Component({
  selector: 'app-pwa-required',
  standalone: true,
  imports: [CommonModule, TranslatePipe, LanguageSelectorComponent],
  templateUrl: './pwa-required.component.html',
  styleUrl: './pwa-required.component.scss',
})
export class PwaRequiredComponent {
  private readonly router = inject(Router);
  private readonly pwaService = inject(PwaDetectionService);
  readonly branding = inject(BrandingService);
  readonly theme = inject(ThemeService);

  // Logo del branding o logo por defecto
  readonly logoUrl = computed(() => this.branding.getLogoUrl());

  // Mostrar logo solo cuando el branding esté cargado
  readonly showLogo = computed(() => !this.branding.loading() && !!this.branding.settings());

  checkAgain(): void {
    if (this.pwaService.isRunningAsPwa()) {
      void this.router.navigate(['/login']);
    }
  }

  getPwaInfo(): ReturnType<typeof this.pwaService.getPwaInfo> {
    return this.pwaService.getPwaInfo();
  }

  toggleTheme(): void {
    this.theme.toggleTheme();
  }
}
