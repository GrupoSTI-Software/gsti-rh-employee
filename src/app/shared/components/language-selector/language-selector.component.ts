import {
  Component,
  inject,
  HostListener,
  ElementRef,
  PLATFORM_ID,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { LoggerService } from '@core/services/logger.service';
import { SecureStorageService } from '@core/services/secure-storage.service';

type Language = 'es' | 'en';

/**
 * Clave para almacenar el idioma de la aplicación
 */
const LANGUAGE_STORAGE_KEY = 'app-language';

@Component({
  selector: 'app-language-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './language-selector.component.html',
  styleUrl: './language-selector.component.scss',
})
export class LanguageSelectorComponent {
  private readonly translateService = inject(TranslateService);
  private readonly elementRef = inject(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly logger = inject(LoggerService);
  private readonly secureStorage = inject(SecureStorageService);

  readonly languages: { code: Language; label: string; flag: string }[] = [
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
  ];
  showDropdown = false;

  get currentLanguage(): Language {
    return (this.translateService.currentLang ?? 'es') as Language;
  }

  get currentLanguageFlag(): string {
    const lang = this.languages.find((l) => l.code === this.currentLanguage);
    return lang?.flag ?? '🌐';
  }

  get currentLanguageLabel(): string {
    const lang = this.languages.find((l) => l.code === this.currentLanguage);
    return lang?.label ?? 'ES';
  }

  setLanguage(lang: Language): void {
    this.translateService.use(lang).subscribe({
      next: () => {
        if (isPlatformBrowser(this.platformId)) {
          this.secureStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
        }
        this.showDropdown = false;
        // Forzar detección de cambios
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.logger.error('Error changing language:', err);
      },
    });
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    const target = event.target as Node | null;
    const nativeElement = this.elementRef.nativeElement as HTMLElement;
    if (this.showDropdown === true && target !== null && !nativeElement.contains(target)) {
      this.showDropdown = false;
    }
  }
}
