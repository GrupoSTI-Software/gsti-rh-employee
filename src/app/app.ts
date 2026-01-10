import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ThemeService } from '@core/services/theme.service';
import { BrandingService } from '@core/services/branding.service';
import { PullToRefreshDirective } from '@shared/directives/pull-to-refresh.directive';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, PullToRefreshDirective],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('gsti-pwa-empleado');
  private readonly translate = inject(TranslateService);
  private readonly theme = inject(ThemeService);
  private readonly branding = inject(BrandingService);

  constructor() {
    // Inicializar tema
    this.theme.theme();

    // Cargar branding lo más temprano posible (antes de ngOnInit)
    // Esto asegura que el favicon y manifest se actualicen antes de que el usuario instale la PWA
    this.branding.loadBranding();
  }

  ngOnInit(): void {
    // Agregar idiomas disponibles
    this.translate.addLangs(['es', 'en']);
    this.translate.setDefaultLang('es');

    // Obtener idioma guardado o usar el por defecto
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedLang = localStorage.getItem('app-language');
      const langToUse = savedLang === 'en' || savedLang === 'es' ? savedLang : 'es';
      this.translate.use(langToUse);
    } else {
      this.translate.use('es');
    }
  }
}
