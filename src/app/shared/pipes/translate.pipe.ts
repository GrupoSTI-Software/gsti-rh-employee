import { Pipe, PipeTransform, inject, ChangeDetectorRef, OnDestroy, NgZone } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false,
})
export class TranslatePipe implements PipeTransform, OnDestroy {
  private readonly translateService = inject(TranslateService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);
  private lastKey = '';
  private lastParams?: Record<string, string>;
  private lastLang = '';
  private value = '';
  private langChangeSubscription?: Subscription;
  private translationChangeSubscription?: Subscription;

  constructor() {
    // Suscribirse a cambios de idioma
    this.langChangeSubscription = this.translateService.onLangChange.subscribe(() => {
      this.ngZone.run(() => {
        if (this.lastKey) {
          this.updateValue();
          this.cdr.markForCheck();
        }
      });
    });

    // Suscribirse a cambios en las traducciones
    this.translationChangeSubscription = this.translateService.onTranslationChange.subscribe(() => {
      this.ngZone.run(() => {
        if (this.lastKey) {
          this.updateValue();
          this.cdr.markForCheck();
        }
      });
    });
  }

  transform(key: string, params?: Record<string, string>): string {
    const currentLang = this.translateService.currentLang || '';

    // Verificar si cambió la clave, los parámetros o el idioma
    const keyChanged = key !== this.lastKey;
    const paramsChanged = JSON.stringify(params) !== JSON.stringify(this.lastParams);
    const langChanged = currentLang !== this.lastLang;

    if (keyChanged || paramsChanged || langChanged) {
      this.lastKey = key;
      this.lastParams = params;
      this.lastLang = currentLang;
      this.updateValue();
    }

    return this.value;
  }

  private updateValue(): void {
    if (!this.lastKey) {
      this.value = '';
      return;
    }

    try {
      if (this.lastParams) {
        this.value = this.translateService.instant(this.lastKey, this.lastParams);
      } else {
        this.value = this.translateService.instant(this.lastKey);
      }
    } catch {
      console.warn(`Translation key "${this.lastKey}" not found`);
      this.value = this.lastKey;
    }
  }

  ngOnDestroy(): void {
    if (this.langChangeSubscription) {
      this.langChangeSubscription.unsubscribe();
    }
    if (this.translationChangeSubscription) {
      this.translationChangeSubscription.unsubscribe();
    }
  }
}
