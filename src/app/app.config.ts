import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { routes } from './app.routes';
import { HttpAuthAdapter } from '@modules/auth/infrastructure/http-auth.adapter';
import { AUTH_PORT } from '@modules/auth/domain/auth.token';
import { HttpSystemSettingsAdapter } from '@modules/system-settings/infrastructure/http-system-settings.adapter';
import { SYSTEM_SETTINGS_PORT } from '@modules/system-settings/domain/system-settings.token';
import { HttpAttendanceAdapter } from '@modules/attendance/infrastructure/http-attendance.adapter';
import { ATTENDANCE_PORT } from '@modules/attendance/domain/attendance.token';
import { HttpVacationAdapter } from '@modules/vacation-calendar/infrastructure/http-vacation.adapter';
import { VACATION_PORT } from '@modules/vacation-calendar/domain/vacation.token';
import { HttpNoticesAdapter } from '@modules/notices/infrastructure/http-notices.adapter';
import { NOTICES_PORT } from '@modules/notices/domain/notices.token';
import { tokenInterceptor } from '@core/interceptors/token.interceptor';
import { errorInterceptor } from '@core/interceptors/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withInterceptors([tokenInterceptor, errorInterceptor]), withFetch()),
    provideAnimationsAsync(),
    // PrimeNG Configuration
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: '[data-theme="dark"]',
          cssClass: 'p-component',
          // Sobrescribir colores de focus para usar el color primario azul
          focusRing: {
            width: '0.2rem',
            style: 'solid',
            color: 'var(--primary)',
            offset: '0',
            shadow: '0 0 0 0.2rem rgba(var(--primary-rgb), 0.2)',
          },
        },
      },
    }),
    // Provider para arquitectura hexagonal - inyección del adaptador como puerto
    {
      provide: AUTH_PORT,
      useClass: HttpAuthAdapter,
    },
    {
      provide: SYSTEM_SETTINGS_PORT,
      useClass: HttpSystemSettingsAdapter,
    },
    {
      provide: ATTENDANCE_PORT,
      useClass: HttpAttendanceAdapter,
    },
    {
      provide: VACATION_PORT,
      useClass: HttpVacationAdapter,
    },
    {
      provide: NOTICES_PORT,
      useClass: HttpNoticesAdapter,
    },
    provideTranslateService({
      loader: provideTranslateHttpLoader({
        prefix: '/assets/i18n/',
        suffix: '.json',
      }),
      fallbackLang: 'es',
    }),
  ],
};
