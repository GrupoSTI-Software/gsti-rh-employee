import { ApplicationConfig, provideBrowserGlobalErrorListeners, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { MessageService } from 'primeng/api';
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
import { VACATIONS_EMPLOYEE_PORT } from '@modules/vacations/domain/vacations-employee.token';
import { HttpVacationsEmployeeAdapter } from '@modules/vacations/infrastructure/http-vacations-employee.adapter';
import { HttpNoticesAdapter } from '@modules/notices/infrastructure/http-notices.adapter';
import { NOTICES_PORT } from '@modules/notices/domain/notices.token';
import { HttpCalendarAdapter } from '@modules/vacation-calendar/infrastructure/http-calendar.adapter';
import { CALENDAR_PORT } from '@modules/vacation-calendar/domain/calendar.token';
import { HttpWorkDisabilityAdapter } from '@modules/vacation-calendar/infrastructure/http-work-disability.adapter';
import { WORK_DISABILITY_PORT } from '@modules/vacation-calendar/domain/work-disability.token';
import { HttpExceptionAdapter } from '@modules/vacation-calendar/infrastructure/http-exception.adapter';
import { EXCEPTION_PORT } from '@modules/vacation-calendar/domain/exception.token';
import { tokenInterceptor } from '@core/interceptors/token.interceptor';
import { errorInterceptor } from '@core/interceptors/error.interceptor';
import { provideServiceWorker } from '@angular/service-worker';
import { BIO_EMPLOYEE_BIOMETRIC_FACE_ID_PORT } from '@modules/attendance/domain/employee-biometric-face-id.token';
import { HttpEmployeeBiometricFaceIdAdapter } from '@modules/attendance/infrastructure/http-employee-biometric-face-id.adapter';
import { FORGOT_PASSWORD_PORT } from '@modules/forgot-password/domain/forgot-password.token';
import { HttpForgotPasswordAdapter } from '@modules/forgot-password/infrastructure/http-forgot-password.adapter';
import { HttpResetPasswordAdapter } from '@modules/reset-password/infrastructure/http-reset-password.adapter';
import { RESET_PASSWORD_PORT } from '@modules/reset-password/domain/reset-password.token';
import { HttpPincodePasswordAdapter } from '@modules/pincode-password/infrastructure/http-pincode-password.adapter';
import { PINCODE_PASSWORD_PORT } from '@modules/pincode-password/domain/pincode-password.token';

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
      provide: FORGOT_PASSWORD_PORT,
      useClass: HttpForgotPasswordAdapter,
    },
    {
      provide: PINCODE_PASSWORD_PORT,
      useClass: HttpPincodePasswordAdapter,
    },
    {
      provide: RESET_PASSWORD_PORT,
      useClass: HttpResetPasswordAdapter,
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
      provide: BIO_EMPLOYEE_BIOMETRIC_FACE_ID_PORT,
      useClass: HttpEmployeeBiometricFaceIdAdapter,
    },
    {
      provide: VACATION_PORT,
      useClass: HttpVacationAdapter,
    },
    {
      provide: VACATIONS_EMPLOYEE_PORT,
      useClass: HttpVacationsEmployeeAdapter,
    },
    {
      provide: NOTICES_PORT,
      useClass: HttpNoticesAdapter,
    },
    {
      provide: CALENDAR_PORT,
      useClass: HttpCalendarAdapter,
    },
    {
      provide: WORK_DISABILITY_PORT,
      useClass: HttpWorkDisabilityAdapter,
    },
    {
      provide: EXCEPTION_PORT,
      useClass: HttpExceptionAdapter,
    },
    provideTranslateService({
      loader: provideTranslateHttpLoader({
        prefix: '/assets/i18n/',
        suffix: '.json',
      }),
      fallbackLang: 'es',
    }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    MessageService,
  ],
};
