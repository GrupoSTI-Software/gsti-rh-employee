import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@shared/pipes/translate.pipe';
import { TranslateService } from '@ngx-translate/core';
import { ThemeService, Theme } from '@core/services/theme.service';
import { LoggerService } from '@core/services/logger.service';
import { SecureStorageService } from '@core/services/secure-storage.service';
import { Select } from 'primeng/select';
import { trigger, transition, style, animate } from '@angular/animations';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subscription } from 'rxjs';

type Language = 'es' | 'en';

/**
 * Clave para almacenar el idioma de la aplicación
 */
const LANGUAGE_STORAGE_KEY = 'app-language';

interface IThemeOption {
  value: Theme;
  label: string;
}

interface ILanguageOption {
  value: Language;
  label: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, Select],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('500ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
})
export class SettingsComponent implements OnInit, OnDestroy {
  readonly theme = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly translateService = inject(TranslateService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly logger = inject(LoggerService);
  private readonly secureStorage = inject(SecureStorageService);
  private langChangeSubscription?: Subscription;

  // Signal para el idioma actual que se actualiza cuando cambia
  readonly currentLanguage = signal<Language>(
    (this.translateService.currentLang ?? 'es') as Language,
  );

  readonly currentLanguageLabel = computed(() => {
    const lang = this.currentLanguage();
    return lang === 'es' ? 'Español' : 'English';
  });

  // Opciones de tema con traducciones (usando getter para reactividad)
  get themeOptions(): IThemeOption[] {
    return [
      { value: 'light', label: this.translateService.instant('settings.themeOption.light') },
      { value: 'dark', label: this.translateService.instant('settings.themeOption.dark') },
      { value: 'system', label: this.translateService.instant('settings.themeOption.system') },
    ];
  }

  // Opciones de idioma
  readonly languageOptions: ILanguageOption[] = [
    { value: 'es', label: 'Español' },
    { value: 'en', label: 'English' },
  ];

  // Propiedades para el binding con ngModel (no pueden ser signals)
  selectedTheme: Theme = this.theme.theme();
  selectedLanguage: Language = this.currentLanguage();

  ngOnInit(): void {
    // Inicializar valores seleccionados
    this.selectedTheme = this.theme.theme();
    this.selectedLanguage = this.currentLanguage();

    // Suscribirse a los cambios de idioma para actualizar las propiedades
    this.langChangeSubscription = this.translateService.onLangChange.subscribe({
      next: (event) => {
        this.currentLanguage.set(event.lang as Language);
        this.selectedLanguage = event.lang as Language;
      },
    });
  }

  ngOnDestroy(): void {
    this.langChangeSubscription?.unsubscribe();
  }

  /**
   * Cambia el tema cuando se selecciona una opción del select
   */
  onThemeChange(): void {
    if (this.selectedTheme) {
      this.theme.setTheme(this.selectedTheme);
    }
  }

  /**
   * Cambia el idioma cuando se selecciona una opción del select
   */
  onLanguageChange(): void {
    if (this.selectedLanguage !== null && this.selectedLanguage !== undefined) {
      this.translateService.use(this.selectedLanguage).subscribe({
        next: () => {
          if (isPlatformBrowser(this.platformId)) {
            this.secureStorage.setItem(LANGUAGE_STORAGE_KEY, this.selectedLanguage);
          }
          // Actualizar el signal inmediatamente
          this.currentLanguage.set(this.selectedLanguage);
        },
        error: (err) => {
          this.logger.error('Error changing language:', err);
        },
      });
    }
  }

  navigateToProfile(): void {
    void this.router.navigate(['/dashboard/profile']);
  }
}
