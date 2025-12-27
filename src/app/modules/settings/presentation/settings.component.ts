import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { TranslateService } from '@ngx-translate/core';
import { ThemeService } from '@core/services/theme.service';
import { trigger, transition, style, animate } from '@angular/animations';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subscription } from 'rxjs';

type Language = 'es' | 'en';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('500ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class SettingsComponent implements OnInit, OnDestroy {
  readonly theme = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly translateService = inject(TranslateService);
  private readonly platformId = inject(PLATFORM_ID);
  private langChangeSubscription?: Subscription;

  // Signal para el idioma actual que se actualiza cuando cambia
  readonly currentLanguage = signal<Language>(
    (this.translateService.currentLang || 'es') as Language
  );

  readonly currentLanguageLabel = computed(() => {
    const lang = this.currentLanguage();
    return lang === 'es' ? 'Español' : 'English';
  });

  ngOnInit(): void {
    // Suscribirse a los cambios de idioma para actualizar el signal
    this.langChangeSubscription = this.translateService.onLangChange.subscribe({
      next: (event) => {
        this.currentLanguage.set(event.lang as Language);
      }
    });
  }

  ngOnDestroy(): void {
    this.langChangeSubscription?.unsubscribe();
  }

  toggleTheme(): void {
    this.theme.toggleTheme();
  }

  toggleLanguage(): void {
    const currentLang = this.currentLanguage();
    const newLang: Language = currentLang === 'es' ? 'en' : 'es';

    this.translateService.use(newLang).subscribe({
      next: () => {
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('app-language', newLang);
        }
        // Actualizar el signal inmediatamente
        this.currentLanguage.set(newLang);
      },
      error: (err) => {
        console.error('Error changing language:', err);
      }
    });
  }

  navigateToBiometrics(): void {
    this.router.navigate(['/dashboard/biometrics']);
  }

  navigateToProfile(): void {
    this.router.navigate(['/dashboard/profile']);
  }
}

