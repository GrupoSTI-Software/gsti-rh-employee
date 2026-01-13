import { Pipe, PipeTransform, inject, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { TranslateService, LangChangeEvent } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

/**
 * Pipe para traducir textos usando ngx-translate
 * Soporta cambios de idioma en tiempo real
 */
@Pipe({
  name: 'translate',
  standalone: true,
  pure: false, // Impure para detectar cambios de idioma
})
export class TranslatePipe implements PipeTransform, OnDestroy {
  private readonly translateService = inject(TranslateService);
  private readonly cdr = inject(ChangeDetectorRef);

  private lastKey = '';
  private lastParams: Record<string, string> | undefined;
  private lastLang = '';
  private value = '';
  private langSubscription: Subscription | null = null;

  constructor() {
    // Suscribirse a cambios de idioma
    this.langSubscription = this.translateService.onLangChange.subscribe(
      (_event: LangChangeEvent) => {
        if (this.lastKey) {
          this.updateValue();
          this.cdr.markForCheck();
        }
      },
    );

    // También suscribirse a cambios en las traducciones
    this.translateService.onTranslationChange.subscribe(() => {
      if (this.lastKey) {
        this.updateValue();
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Transforma la clave de traducción en el texto traducido
   */
  transform(key: string, params?: Record<string, string>): string {
    if (!key) {
      return '';
    }

    const keyChanged = key !== this.lastKey;
    const paramsChanged = JSON.stringify(params) !== JSON.stringify(this.lastParams);
    const langChanged = this.translateService.currentLang !== this.lastLang;

    if (keyChanged || paramsChanged || langChanged) {
      this.lastKey = key;
      this.lastParams = params;
      this.lastLang = this.translateService.currentLang;
      this.updateValue();
    }

    return this.value;
  }

  /**
   * Actualiza el valor de la traducción
   */
  private updateValue(): void {
    if (!this.lastKey) {
      this.value = '';
      return;
    }

    try {
      if (this.lastParams !== undefined) {
        this.value = this.translateService.instant(this.lastKey, this.lastParams);
      } else {
        this.value = this.translateService.instant(this.lastKey);
      }
    } catch {
      // En desarrollo, el LoggerService mostrará un warning
      // En producción, simplemente usamos la clave como fallback
      this.value = this.lastKey;
    }
  }

  /**
   * Limpia las suscripciones cuando el pipe se destruye
   */
  ngOnDestroy(): void {
    if (this.langSubscription) {
      this.langSubscription.unsubscribe();
      this.langSubscription = null;
    }
  }
}
